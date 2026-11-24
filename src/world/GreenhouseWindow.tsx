import { useEffect, useState } from "react";
import { cropToSeed, SEED_TO_CROP } from "../../shared/greenhouse";
import { parseSlotRef, SLOT_DRAG_TYPE } from "../inventory/dragTypes";
import { useInventoryStore } from "../inventory/inventoryStore";
import { getItemDef, type ItemId } from "../inventory/items";
import { SlotIcon } from "../inventory/SlotIcon";
import "./greenhouseWindow.css";
import { useGreenhouse } from "./useGreenhouse";

export const SEED_DRAG_TYPE = "application/x-grange-seed";

interface Props {
	owner: string;
	onClose: () => void;
}

export function GreenhouseWindow({ owner, onClose }: Props) {
	const {
		greenhouse,
		progress,
		busy,
		message,
		availableSeeds,
		insertSeed,
		takeOutput,
		takeInput,
	} = useGreenhouse(owner);
	const [isDragOver, setIsDragOver] = useState(false);

	useEffect(() => {
		function onKeyDown(e: KeyboardEvent) {
			if (e.repeat) return;
			if (e.code === "Escape" || e.code === "KeyE") {
				e.preventDefault();
				e.stopImmediatePropagation();
				onClose();
			}
		}
		window.addEventListener("keydown", onKeyDown, true);
		return () => window.removeEventListener("keydown", onKeyDown, true);
	}, [onClose]);

	function onBackdropClick(e: React.MouseEvent) {
		if (e.target === e.currentTarget) onClose();
	}

	function onSeedDragStart(e: React.DragEvent, itemId: ItemId, count: number) {
		e.dataTransfer.setData(
			SEED_DRAG_TYPE,
			JSON.stringify({ item: itemId, count }),
		);
		e.dataTransfer.effectAllowed = "copy";
	}

	function handleDragOver(e: React.DragEvent) {
		if (
			e.dataTransfer.types.includes(SEED_DRAG_TYPE) ||
			e.dataTransfer.types.includes(SLOT_DRAG_TYPE)
		) {
			e.preventDefault();
			e.dataTransfer.dropEffect = "copy";
			setIsDragOver(true);
		}
	}

	function handleDragLeave() {
		setIsDragOver(false);
	}

	function handleDrop(e: React.DragEvent) {
		e.preventDefault();
		setIsDragOver(false);
		if (busy) return;

		const directSeed = e.dataTransfer.getData(SEED_DRAG_TYPE);
		if (directSeed) {
			try {
				const parsed = JSON.parse(directSeed) as {
					item?: string;
					count?: number;
				};
				if (parsed.item && parsed.item in SEED_TO_CROP) {
					const count =
						typeof parsed.count === "number" && parsed.count > 0
							? parsed.count
							: 1;
					insertSeed(parsed.item, count);
					return;
				}
			} catch {
				if (directSeed in SEED_TO_CROP) {
					insertSeed(directSeed, 1);
					return;
				}
			}
		}

		const slotPayload = e.dataTransfer.getData(SLOT_DRAG_TYPE);
		if (slotPayload) {
			const ref = parseSlotRef(slotPayload);
			if (ref) {
				const invState = useInventoryStore.getState();
				const list = ref.area === "grid" ? invState.grid : invState.hotbar;
				const slot = list[ref.index];
				if (slot?.itemId && slot.itemId in SEED_TO_CROP && slot.count > 0) {
					insertSeed(slot.itemId, slot.count);
				}
			}
		}
	}

	const hasActiveGrowth = Boolean(greenhouse.growing_crop);
	const displayedInputItem =
		(greenhouse.input_item as ItemId | null) ??
		(hasActiveGrowth && greenhouse.growing_crop
			? (cropToSeed(greenhouse.growing_crop) as ItemId | null)
			: null);

	return (
		// biome-ignore lint/a11y/useKeyWithClickEvents: backdrop click is a convenience shortcut; keyboard path is Esc + Close button
		<div
			data-testid="greenhouse-window"
			role="dialog"
			aria-modal="true"
			aria-label="Greenhouse"
			className="greenhouse-overlay"
			onClick={onBackdropClick}
		>
			<div className="greenhouse-window">
				<header className="greenhouse-header">
					<h2 className="greenhouse-title">GREENHOUSE</h2>
					<button
						type="button"
						data-testid="greenhouse-close"
						className="greenhouse-close"
						onClick={onClose}
					>
						Close [Esc]
					</button>
				</header>

				<div className="greenhouse-body">
					<div className="greenhouse-well">
						<div className="greenhouse-furnace">
							{/* Input Slot */}
							<div className="greenhouse-slot-wrapper">
								<span className="greenhouse-slot-label">Seeds</span>
								<button
									type="button"
									data-testid="greenhouse-input-slot"
									className={`greenhouse-slot ${isDragOver ? "greenhouse-slot-dragover" : ""}`}
									disabled={busy}
									title={
										greenhouse.input_count > 0
											? "Click to retrieve queued seeds, or drag seeds here to queue"
											: "Drag seeds here or click from the tray below"
									}
									onClick={greenhouse.input_count > 0 ? takeInput : undefined}
									onDragOver={handleDragOver}
									onDragLeave={handleDragLeave}
									onDrop={handleDrop}
								>
									{displayedInputItem ? (
										<>
											<SlotIcon itemId={displayedInputItem} />
											{greenhouse.input_count > 0 && (
												<span className="greenhouse-badge">
													{greenhouse.input_count}
												</span>
											)}
										</>
									) : (
										<span className="inv-emoji" aria-hidden="true">
											🌱
										</span>
									)}
								</button>
							</div>

							{/* Progress Bar */}
							<div className="greenhouse-progress-track">
								<div className="greenhouse-progress-bar-outer">
									<div
										data-testid="greenhouse-progress"
										className="greenhouse-progress-bar-fill"
										style={{ width: `${Math.round(progress * 100)}%` }}
									/>
								</div>
								<span className="greenhouse-status-text">
									{hasActiveGrowth
										? `Growing (${Math.round(progress * 100)}%)`
										: greenhouse.output_count > 0
											? "Ready!"
											: "Idle"}
								</span>
							</div>

							{/* Output Slot */}
							<div className="greenhouse-slot-wrapper">
								<span className="greenhouse-slot-label">Produce</span>
								<button
									type="button"
									data-testid="greenhouse-output-slot"
									className="greenhouse-slot"
									disabled={busy || greenhouse.output_count <= 0}
									title={
										greenhouse.output_count > 0
											? "Click to collect produce into your barn"
											: undefined
									}
									onClick={takeOutput}
								>
									{greenhouse.output_item ? (
										<>
											<SlotIcon itemId={greenhouse.output_item as ItemId} />
											<span className="greenhouse-badge">
												{greenhouse.output_count}
											</span>
										</>
									) : (
										<span className="inv-emoji" aria-hidden="true">
											📦
										</span>
									)}
								</button>
							</div>
						</div>
					</div>

					{/* Seed Quick-Select Tray */}
					<div className="greenhouse-tray-section">
						<span className="greenhouse-tray-title">
							Deposit from inventory:
						</span>
						<div
							className="greenhouse-seed-grid"
							data-testid="greenhouse-seed-tray"
						>
							{availableSeeds.length > 0 ? (
								availableSeeds.map((seed) => {
									const def = getItemDef(seed.itemId);
									return (
										<button
											key={seed.itemId}
											type="button"
											className="greenhouse-seed-chip"
											disabled={busy}
											draggable={!busy}
											title={`Click to deposit 1 · Drag to deposit all (${seed.count})`}
											onDragStart={(e) =>
												onSeedDragStart(e, seed.itemId, seed.count)
											}
											onClick={() => insertSeed(seed.itemId, 1)}
										>
											<SlotIcon itemId={seed.itemId} />
											<span>{def.name}</span>
											<span>({seed.count})</span>
										</button>
									);
								})
							) : (
								<p className="greenhouse-hint">
									No seeds in inventory. Buy seeds at the Market!
								</p>
							)}
						</div>
					</div>

					{message && <div className="greenhouse-message">{message}</div>}
					<p className="greenhouse-hint">
						Tip: Click a seed to deposit 1, or drag into the slot to deposit
						multiple. Click queued seeds to retrieve, or click produce to
						collect to barn.
					</p>
				</div>
			</div>
		</div>
	);
}
