# Work progress

## Completed

- Bot 2 resumed from `dc2eb4a`, the image-only chart sharing commit.
- `59f73d8` retries timed-out and disconnected OneSignal requests with the original notification key and logs acceptance only after validating the receipt.
- Seven simulated sender cases passed locally, covering timeout recovery, disconnection recovery, retry exhaustion, rate limiting, unauthorized requests, zero recipients, and missing notification IDs.

- Bot 3 `e3bb2a0` validates image-only Telegram receipts, saves per-channel success, and retries only missing recipients on a repeated signal. Local tests rendered a PNG and exercised partial failure, restart, and invalid receipts.
- Bot 3 `f483b6f` routes the watermarked original-channel test through the same sender. Its local fixture uploaded a 1650 × 1155 PNG to a mocked transport.

## Latest progress

- User reports Bot 3 already delivered a Telegram chart image. Treat delivery as observed by the user. Actual VPS source, service logs and corresponding receipt remain to be inspected.
- Removed automatic schedule and push triggers from Bot 3 smart-whale.yml. Manual dispatch remains available.
- Added source path filters to Bot 2 and Bot 3 check workflows so checkpoint-only commits do not run these checks. Three modified workflow files passed local YAML parsing and trigger assertions.
- Bot 2's scanner workflow was already manual-only.
- These edits apply to GitHub workflows. Production source and services were not accessed.

## Blockers

Bot 2 VPS revision and original iPhone delivery remain unverified. No local configured SSH connection or agent was available. Last console observations required Vultr and OneSignal sign-in. GitHub Actions previously reported a billing or spending-limit restriction before executing any steps.

## Exact next action

Prioritize authenticated access to Bot 2. Inspect yoyo-prime.service and its timer, resolve ExecStart to the deployed source, compare with commit 59f73d8, and inspect recent OneSignal receipt logs without exposing secrets. Correlate the notification with the original iPhone subscription and device receipt. Then inspect Bot 3's actual running service, source path and logs against the chart already received. Back up deployed files before any edit. Avoid additional test photos until checking that existing delivery. Keep Bot 1 outside scope.

## November 23 local verification from c2ce89f

Backed up the checkout before editing. Reproduced a null default DEX marker in the real Hyperliquid perpDexs response. Fixed discovery stopping before named DEXes. Tested null followed by xyz, and both LONG and SHORT confirmations with controlled candles. Live ETH returned 288 closed 15m, 168 hourly, and 150 four-hour bars. The strategy calculated the NY opening range and anchored VWAP and returned no confirmed entry. These requests originated from the work environment. All 6 scanner tests and 25 chart/frontend tests passed after correcting the share-card test to expect the current footer. Bot 3's GitHub scanner trigger was verified manual-only. Production service status, iPhone receipt and fresh Telegram receipt still need VPS access. Next: check the actual service and receipt as described above, and compare the deployed scanner with the commit containing this checkpoint.

## Confirmed push chart
Scanner fix is on main at 6f48174. The verified push detail page now shows confirmed pivot prices outside the candle area, exports its rendered EMA/AVWAP/OR chart as one PNG, and opens the matching Hyperliquid market. A local 390px Chromium test opened a hash-verified cached fixture and exercised both share buttons. Each supplied only a valid PNG to a simulated native share sheet. The ETH exchange link matched. Physical iPhone sharing remains unverified. Bot 3 main was eeadf63 at inspection. No authenticated VPS session or configured SSH identity was available. Next: inspect yoyo-prime.service's working directory and deployment, compare with 6f48174, verify one original-device notification, then check yoyo-whales.service enablement, uptime and an original-channel photo receipt after schedule removal.
