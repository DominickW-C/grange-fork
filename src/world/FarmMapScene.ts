import * as ex from "excalibur";
import type { FarmToolId } from "../../shared/farm";
import {
    BlockRegistry,
    decorByTile,
    groundFootprintTiles,
    rectFootprintTiles,
} from "./blocking";
import { CropLayer } from "./cropLayer";
import { LocalFarmStore } from "./farmState";
import { InputManager } from "./InputManager";
import {
    MAP_COLUMNS,
    MAP_HEIGHT,
    MAP_ROWS,
    MAP_WIDTH,
    TILE_SIZE,
    isTillableTile,
    propBlocking,
    props,
    terrainAt,
} from "./mapData";
import { propImages, terrainFrames, terrainImage } from "./resources";

export interface FarmHoveredTile {
    column: number;
    row: number;
    state: string;
}

export interface FarmHudSnapshot {
    tomatoes: number;
    message: string;
    hovered: FarmHoveredTile | null;
}

const TOOL_HINTS: Record<FarmToolId, string> = {
    hoe: "Hoe: click or drag on grass to till.",
    seed: "Seeds: click tilled soil to plant tomato.",
    bucket: "Bucket: click a sprout to water it.",
    scythe: "Scythe: click a ripe tomato plant to harvest.",
};

export class FarmMapScene extends ex.Scene {
    onFarmUpdate: ((snapshot: FarmHudSnapshot) => void) | null = null;

    private inputManager!: InputManager;
    private player!: ex.Actor;
    private readonly playerSpeed = 160; // Pixels per second

    private sheet!: ex.SpriteSheet;
    private terrain!: ex.TileMap;
    private readonly farm = new LocalFarmStore();
    private readonly crops = new CropLayer(this);
    // Growable set of tool-blocked tiles, seeded from props below. Future
    // placeable fences will add/remove entries here at runtime.
    private readonly blocks = new BlockRegistry();
    // Created actors per prop index, so tilled-over decor can be removed.
    private readonly propActors: Array<ex.Actor | undefined> = [];
    private readonly decor = decorByTile(props);

    private tool: FarmToolId = "hoe";
    private painting = false;
    private readonly strokeTiles = new Set<string>();
    private message = TOOL_HINTS.hoe;
    private hovered: FarmHoveredTile | null = null;
    private lastWorldPos: ex.Vector | null = null;
    private deactivated = false;

    override onInitialize(engine: ex.Engine): void {
        this.backgroundColor = ex.Color.fromHex("#79a44d");

        // 1. Initialize standalone input listener
        this.inputManager = new InputManager();

        // 2. Build Terrain TileMap
        this.sheet = ex.SpriteSheet.fromImageSource({
            image: terrainImage,
            grid: {
                rows: 4,
                columns: 4,
                spriteWidth: TILE_SIZE,
                spriteHeight: TILE_SIZE,
            },
        });

        this.terrain = new ex.TileMap({
            pos: ex.vec(0, 0),
            tileWidth: TILE_SIZE,
            tileHeight: TILE_SIZE,
            columns: MAP_COLUMNS,
            rows: MAP_ROWS,
            renderFromTopOfGraphic: true,
        });

        for (let row = 0; row < MAP_ROWS; row += 1) {
            for (let column = 0; column < MAP_COLUMNS; column += 1) {
                const frame = terrainFrames[terrainAt(column, row)];
                this.terrain
                    .getTile(column, row)
                    ?.addGraphic(this.sheet.getSprite(frame.column, frame.row));
            }
        }
        this.add(this.terrain);

        // 3. Populate Props and register their tool-blocked tiles
        props.forEach((prop, index) => {
            const source = propImages[prop.asset];
            const sprite = source.toSprite();
            const scale = prop.width / source.width;
            sprite.scale = ex.vec(scale, scale);

            const actor = new ex.Actor({
                pos: ex.vec(prop.x, prop.y),
                anchor: ex.vec(0.5, 1),
                z: 100 + Math.floor(prop.y),
            });
            actor.graphics.use(sprite);
            this.add(actor);
            this.propActors[index] = actor;

            const rule = propBlocking[prop.asset];
            if (rule === "rect") {
                this.blocks.add(
                    `prop-${index}`,
                    rectFootprintTiles(prop.x, prop.y, prop.width, source.height * scale),
                );
            } else if (rule === "base") {
                this.blocks.add(
                    `prop-${index}`,
                    groundFootprintTiles(prop.x, prop.y, prop.width),
                );
            }
        });

        // 4. Create Player Actor
        this.player = new ex.Actor({
            pos: ex.vec(MAP_WIDTH / 2, MAP_HEIGHT / 2),
            width: 32,
            height: 32,
            color: ex.Color.fromHex("#ffcc00"), // Yellow box placeholder or attach player sprite
            anchor: ex.vec(0.5, 1),
            z: 200,
        });
        this.add(this.player);

        // 5. Tool input: click or drag to paint tiles with the current tool
        const pointers = engine.input.pointers;
        pointers.primary.on("down", (evt) => {
            if (this.deactivated) return;
            this.painting = true;
            this.strokeTiles.clear();
            this.applyToolAt(evt.worldPos);
        });
        pointers.primary.on("move", (evt) => {
            if (this.deactivated) return;
            this.updateHover(evt.worldPos);
            if (this.painting) this.applyToolAt(evt.worldPos);
        });
        pointers.primary.on("up", () => {
            this.painting = false;
            this.strokeTiles.clear();
        });

        // Center camera initially
        this.camera.pos = ex.vec(MAP_WIDTH / 2, MAP_HEIGHT / 2);
        this.emitHud();
    }

    setTool(tool: FarmToolId): void {
        this.tool = tool;
        this.message = TOOL_HINTS[tool];
        this.emitHud();
    }

    override onPreUpdate(_engine: ex.Engine, _delta: number): void {
        // Poll input vector (normalized -1 to 1)
        const dir = this.inputManager.getMovementVector();

        // Excalibur automatically applies delta-time to actor.vel
        this.player.vel = ex.vec(dir.x * this.playerSpeed, dir.y * this.playerSpeed);

        // Update player z-index based on Y position for depth sorting with props
        this.player.z = 100 + Math.floor(this.player.pos.y);

        // Clamp player inside map boundaries
        this.player.pos.x = Math.max(16, Math.min(MAP_WIDTH - 16, this.player.pos.x));
        this.player.pos.y = Math.max(32, Math.min(MAP_HEIGHT, this.player.pos.y));

        // Smoothly lock camera to player
        this.camera.pos = this.player.pos;

        // Grow watered crops whose timers elapsed
        const ready = this.farm.tick(Date.now());
        for (const tile of ready) this.refreshTile(tile.x, tile.y);
        if (ready.length > 0) {
            // The hover readout snapshots tile state, so recompute it after
            // growth flips or it would keep showing "watered" until the next
            // pointer move.
            if (this.lastWorldPos) this.updateHover(this.lastWorldPos);
            const first = ready[0];
            this.message = `Tomato ripe at (${first.x}, ${first.y})! Harvest with scythe (4).`;
            this.emitHud();
        }
    }

    override onDeactivate(): void {
        // Clean up DOM listeners when scene changes or unmounts
        this.deactivated = true;
        this.painting = false;
        this.inputManager?.destroy();
    }

    private applyToolAt(worldPos: ex.Vector): void {
        const column = Math.floor(worldPos.x / TILE_SIZE);
        const row = Math.floor(worldPos.y / TILE_SIZE);
        if (column < 0 || row < 0 || column >= MAP_COLUMNS || row >= MAP_ROWS) return;

        const strokeKey = `${column},${row}`;
        this.updateHover(worldPos);
        if (this.strokeTiles.has(strokeKey)) return;
        this.strokeTiles.add(strokeKey);

        const now = Date.now();
        const existing = this.farm.getTile(column, row);
        let applied = false;

        if (this.tool === "hoe") {
            if (existing) {
                this.message = `(${column}, ${row}) is already tilled — press 2 for seeds.`;
            } else if (this.blocks.isBlocked(column, row)) {
                this.message = "Something is in the way.";
            } else if (!isTillableTile(column, row)) {
                this.message = "Hoe only works on grass.";
            } else {
                applied = this.farm.tillGround(column, row);
                const cleared = applied ? this.clearDecorAt(strokeKey) : [];
                this.message =
                    cleared.length > 0
                        ? `Tilled (${column}, ${row}) — cleared flowers.`
                        : `Tilled (${column}, ${row}). Press 2 for seeds.`;
            }
        } else if (this.tool === "seed") {
            if (!existing) {
                this.message = "Till grass with the hoe (1) first.";
            } else if (existing.state !== "tilled") {
                this.message = `(${column}, ${row}) is already planted.`;
            } else {
                applied = this.farm.plantSeed(column, row, now);
                this.message = `Planted tomato at (${column}, ${row}). Press 3 to water.`;
            }
        } else if (this.tool === "bucket") {
            if (!existing) {
                this.message = "Nothing planted here — hoe (1), seed (2), then water.";
            } else if (existing.state === "tilled") {
                this.message = "Plant seeds (2) before watering.";
            } else if (existing.state === "planted") {
                applied = this.farm.waterTile(column, row, now);
                this.message = `Watered (${column}, ${row}). Ripe in 10s.`;
            } else if (existing.state === "watered") {
                this.message = `(${column}, ${row}) is already watered — growing...`;
            } else {
                this.message = `(${column}, ${row}) is ripe! Harvest with scythe (4).`;
            }
        } else if (!existing) {
            this.message = "Nothing to harvest here.";
        } else if (existing.state !== "ready") {
            this.message = `(${column}, ${row}) is not ripe yet — water (3) and wait 10s.`;
        } else {
            applied = this.farm.harvestCrop(column, row);
            this.message = `Harvested +3 tomatoes at (${column}, ${row})!`;
        }

        if (applied) {
            this.refreshTile(column, row);
            this.updateHover(worldPos);
        }
        this.emitHud();
    }

    /** Removes tilled-over decor (flowers) on a tile. Returns the removed
     * asset keys so a future pickup feature can credit them to inventory. */
    private clearDecorAt(strokeKey: string): string[] {
        const indices = this.decor.get(strokeKey);
        if (!indices) return [];
        this.decor.delete(strokeKey);
        const cleared: string[] = [];
        for (const index of indices) {
            this.propActors[index]?.kill();
            this.propActors[index] = undefined;
            cleared.push(props[index].asset);
        }
        return cleared;
    }

    private updateHover(worldPos: ex.Vector): void {
        this.lastWorldPos = worldPos.clone();
        const column = Math.floor(worldPos.x / TILE_SIZE);
        const row = Math.floor(worldPos.y / TILE_SIZE);
        if (column < 0 || row < 0 || column >= MAP_COLUMNS || row >= MAP_ROWS) {
            this.hovered = null;
        } else {
            const stored = this.farm.getTile(column, row);
            this.hovered = {
                column,
                row,
                state: stored?.state ?? terrainAt(column, row),
            };
        }
        this.emitHud();
    }

    private refreshTile(column: number, row: number): void {
        const tile = this.terrain.getTile(column, row);
        if (!tile) return;
        const stored = this.farm.getTile(column, row);
        tile.clearGraphics();
        if (!stored) {
            const frame = terrainFrames[terrainAt(column, row)];
            tile.addGraphic(this.sheet.getSprite(frame.column, frame.row));
        } else {
            const soil =
                stored.state === "planted" || stored.state === "tilled"
                    ? "tilled-dry"
                    : "tilled-watered";
            const frame = terrainFrames[soil];
            tile.addGraphic(this.sheet.getSprite(frame.column, frame.row));
        }
        this.crops.sync(column, row, stored?.state);
    }

    private emitHud(): void {
        this.onFarmUpdate?.({
            tomatoes: this.farm.tomatoes,
            message: this.message,
            hovered: this.hovered,
        });
    }
}
