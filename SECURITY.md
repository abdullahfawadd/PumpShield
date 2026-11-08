# Security

Report vulnerabilities privately to abdullahfawad.dev@gmail.com. Do not include production evidence or credentials in public issues.

All mutations authenticate the user twice: Supabase Auth at the route, then database membership inside the transactional command. Public API keys are intentionally public; they confer no owner privileges. There is no service-role key in this application.

Tables have RLS and no authenticated direct-write grants. Private security-definer functions are narrow, authenticated gateways with fixed search paths. Only validated commands mutate records. The kiosk projection excludes prices, balances, stock volumes, calibration charts, and reconciliation results. Evidence objects are private, append-only, limited to image MIME types and 5 MB, and served through short-lived signed URLs to authorized owners.

Security limitations: browser camera/location values are evidence, not trusted hardware attestations. Web clients can be modified. Human review, certified calibration and operational controls remain required. The amount privacy toggle masks presentation only; it is not an authorization boundary. Configure production SMTP, MFA policy, backup retention, incident monitoring and recovery drills before a business-critical rollout.

Prefer small reviewed pull requests. Dependabot proposes upgrades; CI validates changes before release. Never expose privileged tokens to pull request code.

The offline terminal persists only encrypted context/drafts and non-secret version, actor/workspace identifiers and KDF metadata. It derives a nonextractable AES-GCM key using PBKDF2-SHA256 (600,000 iterations), random salt/IVs and actor/workspace/record authenticated data. The key stays in memory; idle locking and logout broadcasts clear the visible workspace. This does not defend an unlocked compromised browser or same-origin script injection. Use a strong separate passphrase and a managed device. Browser storage eviction can destroy unsynced records.

Offline replay checks active membership, tenant/station, the original open shift, a 24-hour capture window, photo ownership and current financial limits. Stable request IDs and payload hashes reject conflicting replays. Original capture time and offline provenance remain visible to owners. No offline draft is a credit authorisation. The service worker caches a public shell and allowlisted static assets only, never private API responses or signed-in pages.

Driver links are bearer capabilities: share only with the intended driver, expire after 48 hours and can be revoked. The server stores token hashes and accepts reports only while a delivery is dispatched. Location, capture times and browser hashes remain client assertions, not hardware attestation.
