# YOYO TRADE PRO — owner-approved private access

## Security model
GitHub Pages is a **public static host** and cannot enforce owner-approved access. A JavaScript password screen is not protection. Use **Cloudflare Pages + Cloudflare Access** with an email allowlist managed by the owner. Only allowlisted email identities can reach the Pages deployment. Adding an email = approval; removing it = revoke. Cloudflare Access checks identity before serving the app.

## Migration steps (do not skip)
1. Back up the repository and verify the owner can sign in to GitHub and Cloudflare with MFA.
2. In Cloudflare, create a **Pages** project connected to this repository (or a private copy). Framework: None; build command: empty; output directory: repository root or a dedicated static output directory containing index.html and assets. Verify all required static assets and relative paths, including OneSignal worker and manifest.
3. Before sharing the new Pages URL, configure **Cloudflare Zero Trust → Access → Applications → Add application → Self-hosted**, covering the entire Pages hostname/path. Set policy action **Allow** with **Emails** containing *only* the owner's verified email initially. Do **not** add a bypass or Everyone policy. Configure a supported one-time PIN or identity provider. Test from a private browser session: unauthorized email must be denied, authorized email must work.
4. In Cloudflare Pages, also protect **preview deployments** and any alternative domains/aliases; otherwise they may bypass the gate. Verify protection of the actual project domain and all published deployment URLs. If a Pages hostname cannot be covered by the Access policy, do not publish it.
5. When new gated site works, **unpublish the original GitHub Pages site** at repository Settings → Pages. This is essential: an Access login on the new domain does not secure the old public URL. Confirm the old URL no longer serves the app.
6. Change repository visibility to **Private** (Settings → General → Danger Zone), and inspect GitHub collaborators/deploy keys/tokens. Note: previously downloaded/copied source cannot be recalled.
7. Owner approves another person by adding their email to the Cloudflare Access allowlist; revokes by removing it and revoking active sessions. Set short session duration if immediate revocation matters.
8. If app uses privileged market APIs, notification credentials, trading actions or paid data, keep their secrets and authorization on a backend. Access alone does not protect public APIs, cloned code, cached copies or third-party endpoints. Never put secrets in index.html.

## Important limitations
- This is a deployment and access-control setup, **not** a deployed security change.
- This is email allowlisting (manual owner approval), not a pending-request dashboard.
- A one-device-per-user limit is **not** provided by this setup.
- Do not put Cloudflare tokens, passwords, or OTPs in GitHub issues, screenshots or chat.
- Preserve existing live site until protected replacement is tested; then remove public origin promptly.
