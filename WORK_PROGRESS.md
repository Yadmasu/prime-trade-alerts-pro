# Work progress

## Completed

- Bot 2 resumed from `dc2eb4a`, the image-only chart sharing commit.
- `59f73d8` retries timed-out and disconnected OneSignal requests with the original notification key and logs acceptance only after validating the receipt.
- Seven simulated sender cases passed locally, covering timeout recovery, disconnection recovery, retry exhaustion, rate limiting, unauthorized requests, zero recipients, and missing notification IDs.

- Bot 3 `e3bb2a0` validates image-only Telegram receipts, saves per-channel success, and retries only missing recipients on a repeated signal. Local tests rendered a PNG and exercised partial failure, restart, and invalid receipts.
- Bot 3 `f483b6f` routes the watermarked original-channel test through the same sender. Its local fixture uploaded a 1650 × 1155 PNG to a mocked transport.

## Blockers and pending work

Bot 2 deployment and iPhone receipt still require authorized production access. No local SSH configuration or OneSignal credentials were available. Bot 3 original-channel verification was requested via the existing GitHub workflow. Bot 1 is outside scope.

## Exact next action

Read this checkpoint when the next Work session starts. Check the Bot 3 verification job for commit `f483b6fb23c8b9fcb9ce7ee362059ef9f740e35b` before sending any further test. For Bot 2, verify yoyo-prime.service's deployed scanner revision and correlate an accepted notification ID with iPhone receipt. Preserve deployed strategy code and back up before production edits.
