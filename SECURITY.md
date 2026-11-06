# Security

Report vulnerabilities privately to abdullahfawad.dev@gmail.com. Do not include production evidence or credentials in public issues.

All mutations authenticate the user twice: Supabase Auth at the route, then database membership inside the transactional command. Public API keys are intentionally public; they confer no owner privileges. There is no service-role key in this application.

Tables have RLS and no authenticated direct-write grants. Private security-definer functions are narrow, authenticated gateways with fixed search paths. Only validated commands mutate records. The kiosk projection excludes prices, balances, stock volumes, calibration charts, and reconciliation results. Evidence objects are private, append-only, limited to image MIME types and 5 MB, and served through short-lived signed URLs to authorized owners.

Security limitations: browser camera/location values are evidence, not trusted hardware attestations. Web clients can be modified. Human review, certified calibration and operational controls remain required. The amount privacy toggle masks presentation only; it is not an authorization boundary. Configure production SMTP, MFA policy, backup retention, incident monitoring and recovery drills before a business-critical rollout.

Prefer small reviewed pull requests. Dependabot proposes upgrades; CI validates changes before release. Never expose privileged tokens to pull request code.
