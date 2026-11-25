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

GitHub's scanner checks passed on 6f48174. Push chart revision 4e6a8c5 is on main. With runners available, dispatch the existing targeted iPhone test by its commit marker. Verified locally that an ambiguous displayed ID stops before sending and one eligible match targets exactly one subscription. Next: retrieve this job's result and distinguish provider acceptance from physical device receipt.

## Production push test and chart release

On November 23 at 18:29 ET job 138093555227 on 453dc3f succeeded. OneSignal accepted one targeted test for the original matched iPhone subscription. Provider notification ID 34ffd7ce-edc7-4361-9418-8d894199d530. Asked the user for on-device receipt. Do not resend merely to verify this result. Published confirmed.html returned HTTP 200 with both image-sharing buttons and the exchange link. Also corrected the Markets page allowing weekend opening-range confirmations when scanner.py rejects them. Local winter/summer weekday and weekend fixtures passed, plus all 31 existing tests.

## Confirmed iPhone receipt — November 23, 2026

The owner personally received “PRIME TRADE ALERTS PRO • TEST” on the original iPhone. This completes the targeted test from job 138093555227. No repeat test is needed.

Production verification remains open. Vultr account sign-in succeeded. The YOYO-BOTS instance is Running and its console showed the Ubuntu 24.04.5 LTS yo-yo-vps login prompt. OS login is still required to inspect systemd and the journals. Next, inspect the deployed source revision and effective service/timer for yoyo-prime.service. Correlate a genuine strategy-qualified LONG or SHORT with its market, closed candle, OneSignal notification ID and device receipt. For Bot 3, verify yoyo-whales.service enablement, uptime and logs, then match a post-schedule-removal Telegram photo receipt to the original channel. The earlier Telegram image was user-observed. No runtime changes were made.

## Authenticated VPS inspection

The Ubuntu login succeeded. Prime's enabled, active timer runs /opt/yoyo-prime/scanner.py; consecutive successful scans each examined 68 markets and found zero candidates. The standalone file's Git blob was 278aa5c4888d8c80f9125819870481464d0b6fc1. Compared with GitHub 6f48174, the existing functions differing were discover_markets and send_push. No genuine signal receipt was established. Bot 3 yoyo-whales.service is active and enabled. It runs /home/linuxuser/yoyo-whale-new/hl_comparison_daemon.py at checkout 9eb64d3 with locally modified hl_comparison_test.py, which references sendMessage. The searched 12-hour journal showed 23 matches for 429 and no matching photo receipt. The sender of the previously received photo still requires attribution. Preserve local modifications.

## November 24 remote investigation (GitHub-only)

- Confirmed Bot 2 GitHub `.github/workflows/scanner.yml` has `workflow_dispatch` only; unattended production alerts depend on the VPS `yoyo-prime.timer`, not GitHub Actions.
- Confirmed Bot 3 repository `Yadmasu/-yoyo-smart-whale-pro` workflow `.github/workflows/smart-whale.yml` is manual-only; its VPS daemon must be checked for 24/7 delivery.
- Bot 2 repository scanner includes retry handling for HTTP 429 and transient errors; its deployed VPS source was previously observed to differ from GitHub. These code findings alone cannot establish current live behavior.
- **Unverified:** exact last-24-hour scan counts, confirmed candidate count, 429 failures, service restarts, recent OneSignal receipts, and Telegram photo message IDs. No authenticated live VPS journal was available in this investigation. No production changes were made and Bot 1 was not touched.
- **Next VPS action:** inspect `systemctl status yoyo-prime.timer yoyo-prime.service yoyo-whales.service` and `journalctl` over 24 hours; redact secrets, count scans/candidates/errors/restarts/deliveries; compare deployed scanner to tested repo and check both receipts before modifying service files. Back up first, fix only demonstrated defects, verify and commit.

## BLUR historical replay — November 24, 2026

Matched the user-received Smart Whale Pro Telegram chart and Prime Markets export against Hyperliquid BLUR candles. The Prime export's CANDLE TIME is the candle open. Replayed the repository's default cross strategy using evaluate and confirmEntry with completed 15m and 1h bars as of each close. At 21:00 UTC the 20:45 bar closed at 0.008218, volume was 2.61235×, the stop rounded to 0.008032, and all candle-based confirmation checks passed. At 21:15 UTC the 21:00 bar closed at 0.008250, volume was 0.39693×, and the 1.5× threshold returned WAIT. These are consecutive candles. Historical mid-price validation, 24h notional, the production scanner's decision, OneSignal delivery, and attribution of the Telegram sender to the VPS are outside this replay.

## November 24 missing alerts investigation — Bot 2 and Bot 3

Replayed the repository Python scanner with Hyperliquid BLUR 15m, 1h and 4h history at 21:00:35 UTC. Candle rules produced LONG with entry 0.008218 and stop 0.00803214. Market discovery also requires dayNtlVlm >= 1,000,000 by default. Across all 96 completed 15m bars in the 24 hours ending at 21:00 UTC, summing volume times each bar's low and high bounds traded notional between 450,232 and 456,828 USD. This supports a liquidity exclusion; the actual VPS discovery response and environment override remain unknown. No historical notification was replayed to a provider.

Prior scanner preserved in Git history. Scanner commit 6e46379c57fb3d92b5e3ba8c7df189587fa53c95 skips hourly and four-hour requests only after existing 15m minimum history or volume requirements fail. HTTP 429 responses and market exceptions now emit diagnostic lines. Six existing scanner tests passed. An isolated scan-market check observed one request for failing volume and three for eligible volume with identical decisions and trade levels. No VPS deployment performed. Bot 3 repository main eeadf63 verifies Telegram photo, destination and message ID, but the last recorded production daemon source differs. No current authenticated journal or new live provider receipts available. The 24-hour production counters, service/timer state, deployed revision and delivery remain unverified.

## Bot 3 source attribution follow-up

Verified the previously observed VPS checkout against Smart Whale commit 9eb64d3b51d48335bd1068e3deae2b4ab3f3088a. In that revision hl_comparison_daemon.py calls hl_comparison_test.main(), which polls userFillsByTime and sends wallet-fill text to HL_TEST_CHAT_ID via sendMessage. Its Hyperliquid request has a timeout but no HTTP 429 backoff. The VPS copy was locally modified, so this identifies the baseline only. A different repository module, hyperliquid_scanner.py, identifies itself as the legacy EMA21/89 scanner. Neither is a verified source for the confirmed BLUR photo. No service was repointed or restarted. Recover the actual chart worker's unit/ExecStart and local diff before changing request pacing or forwarding rules. No current authenticated SSH connection, live logs, or additional notification receipts were available in this session.
