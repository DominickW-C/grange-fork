# Room chat

Player chat is scoped to the room the player is standing in and shares the
bottom-left feed with game notices. It is ephemeral: nothing is written to
SQLite, nothing is replayed on join, and leaving a room removes that room's
player lines from the feed.

## Rooms

| Player is in | Room | Channel |
| --- | --- | --- |
| Their own farm, or visiting someone's farm | `farm:<owner>` | `farm:<owner>` (the existing farm channel) |
| Marketplace, casino, bank, livestock market | `town` | `chat:town` |

The town room is deliberately shared across every non-farm area, so a shopper
and a card player can talk. Farms never join `chat:town`, and town areas never
join a farm's channel. Hub presence (`hub:marketplace`, `hub:casino`) is
separate and unchanged.

## Wire contract

| | |
| --- | --- |
| Client event | `chat` with `%{"text" => string}` |
| Broadcast | `chat` with `%{author: username, text: text, at: epoch_ms}` |
| Ack | `:ok`, or `{:error, %{error: reason}}` |
| Errors | `"message is empty"`, `"message is too long"`, `"slow down"`, `"invalid message"`, `"not logged in"` |

`author` and `at` are stamped by the server from the socket session and its
clock; the payload's text is the only client-supplied field. The sender also
receives the broadcast, so their own line appears in their feed.

`Grange.Chat.normalize/1` drops control characters, collapses every run of
whitespace to one space, trims, and accepts 1..200 characters.
`Grange.Chat.throttle/2` allows 5 sends per 3 s per socket and keeps the recent
timestamps in the socket assigns.

## Farm chat follows the room

A visitor who walks into town keeps the farm channel joined (owner-only actions
such as selling produce still work), but must stop hearing the farm. The
channel sets `:chat_active` to `true` on join and `resumePresence`, and `false`
on `pausePresence`; `intercept(["chat"])` routes the event through
`handle_out/3`, which drops the line when the flag is false. Every other farm
event is pushed automatically by Phoenix.

`emitVisitFarm` / `emitPauseFarmVisit` / `emitLeaveFarm` in `src/socket.ts`
bind and unbind the client listener around those transitions.

## Client flow

1. `src/chat/useChatRoom.ts` joins `chat:town` whenever `FarmMap`'s area is not
   `Farm`, and leaves it on a farm or on unmount.
2. `src/chat/chatClient.ts` owns both channels, dedupes the room, and calls
   `clearPlayerMessages()` in the notification store on every room change.
3. `src/chat/ChatInput.tsx` renders `[Enter] Chat` in the feed. Enter opens the
   composer, Enter sends, Escape cancels. The composer is disabled while a DOM
   window (market, casino table, bank desk, livestock pen, fishing, farmhouse
   settings, farmhand) owns the screen.
4. `src/chat/chatStore.ts` exposes `isChatComposing()`. `InputManager` ignores
   movement/interact keys while it is true, `WalkingScene` and
   `FarmMapScene` freeze the player, and `FarmToolInput` refuses tool strokes.
   `E` remains the only interact key; `Enter` is never an interact alias.
5. `src/notifications/notificationStore.ts` keeps the last 30 notices and the
   feed renders the last 5 as `[AUTHOR] text`, or `[GRANGE] text` for game
   notices. The feed fades after 6 s of silence and stays open while composing.

## Tests

- `backend/test/grange/chat_test.exs` — normalization, length, throttle.
- `backend/test/grange_web/channels/chat_channel_test.exs` — join rules,
  broadcast shape, errors, burst limit, no history replay.
- `backend/test/grange_web/channels/farm_channel_chat_test.exs` — farm room
  delivery, errors, throttle, and the paused-visitor filter.
- `src/notifications/notificationStore.test.ts` — author tagging, duplicate
  handling, and room-change clearing.
- `e2e/chat.spec.ts` — town chat across deep-linked areas, farm delivery and
  isolation, leaving a room, typing freeze, and `[GRANGE]` notices.
