# Work progress

## Completed

- Bot 2 resumed from `dc2eb4a`, the image-only chart sharing commit.
- `59f73d8` retries timed-out and disconnected OneSignal requests with the original notification key and logs acceptance only after validating the receipt.
- Seven simulated sender cases passed locally, covering timeout recovery, disconnection recovery, retry exhaustion, rate limiting, unauthorized requests, zero recipients, and missing notification IDs.

- Bot 3 `e3bb2a0` validates image-only Telegram receipts, saves per-channel success, and retries only missing recipients on a repeated signal. Local tests rendered a PNG and exercised partial failure, restart, and invalid receipts.
- Bot 3 `f483b6f` routes the watermarked original-channel test through the same sender. Its local fixture uploaded a 1650 × 1155 PNG to a mocked transport.

## Blockers and pending work

Bot 2 deployment and iPhone receipt still require authorized production access. No local SSH configuration or OneSignal credentials were available. Bot 3 GitHub Actions run [45213460456](https://github.com/Yadmasu/-yoyo-smart-whale-pro/actions/runs/45213460456) finished with failure. Both jobs report zero executed steps. The runner produced no Telegram photo receipt. Bot 1 is outside scope.

## Exact next action

Read this checkpoint when the next Work session starts. Restore a working Actions runner or use the authorized Bot 3 VPS environment to run the watermarked test once with the original channel configuration. Verify its positive Telegram message ID. The current GitHub scanner identifies EMA21/89, so verify the VPS entry point before applying any sender change to production. For Bot 2, verify yoyo-prime.service's deployed scanner revision and correlate an accepted notification ID with iPhone receipt. Preserve deployed strategy code and back up before production edits.
