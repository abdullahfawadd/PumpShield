# PumpShield account emails — 10 November 2026

## Result

Resend CLI login was verified using its secure local credential storage. The account currently has **no verified sending domains**. The chat-pasted API key was not used, saved in the project, printed, or committed. The user confirmed revocation and CLI login.

Six responsive Auth email templates are ready in `supabase/templates`: confirmation, recovery, invitation, email change, magic link, and reauthentication. They use Supabase's `ConfirmationURL` or `Token` variables, no user-controlled display names, one purpose per message, a fallback link where relevant, and no remotely hosted image dependencies. Supabase continues to own token issuance, expiry, validation and redirect security. The templates do not grant workspace membership or authorize fuel/financial transactions.

Open [the synthetic design gallery](../artifacts/pumpshield-email/preview.html). These links and codes are deliberately nonfunctional demonstration values, not credentials. Regenerate templates/previews from the repository root with `python scripts/generate-auth-emails.py`.

## Verified

- Actual Chrome HTML rendering: six templates at 680px and 390px, no horizontal overflow. All six mobile designs and representative desktop/dark variants were visually inspected. Recovery also has a dark-mode capture. This is not an Outlook/Gmail inbox compatibility certification.
- Resend test sender: `PumpShield <onboarding@resend.dev>` to **`delivered@resend.dev`**, the provider's delivery simulator. Subject: `[Preview] Confirm your PumpShield account`.
- Provider email ID: `01a1c46e-0953-7a3b-b273-a79825f45261`; fetched status: `delivered`. This is a simulated event, not evidence of delivery to a real user inbox.
- Repeated identical requests using `pumpshield-auth-preview-20261110` returned the same ID; the test did not produce duplicate messages.
- Template variables were statically checked against the supported placeholders. No SMTP secret is present in `config.toml`, generated HTML, screenshots or source.

## Hosted configuration attempt and limitation

A sparse Supabase config declared only these six subjects and template bodies. The CLI resolved and read every local HTML file. Before applying, it displayed six subject changes and six content changes; no SMTP, redirect, confirmation, MFA, password-policy or database changes were proposed.

The hosted API rejected the update with HTTP 400:

> Email template modification is not available for free tier projects using the default email provider. Please upgrade your plan or configure a custom SMTP provider.

Read-back still showed the six original subject differences. **The branded templates have not been activated in hosted Supabase.** The default mail provider and existing Auth settings remain in place. The versioned config contains the desired templates for local use and a future approved activation; merging it does not automatically apply hosted Auth config.

## Free option and production requirement

Resend's free test sender can be used for the account owner's address and provider test addresses. It cannot serve arbitrary PumpShield Owner/Munshi recipients without a verified sending domain. A Vercel project subdomain is hosting, not an owned email-sending domain whose DNS can be verified.

Supabase's default SMTP is a development service: its documentation currently restricts delivery to organization team addresses, with a two-message-per-hour limit and no production SLA. Keeping it temporarily does **not** make client-wide confirmation/recovery production-ready.

No domain was purchased and no paid plan was enabled. Once a domain is available:

1. Verify an owned sender domain/subdomain through Resend's required DNS records; review exact DNS changes before applying them.
2. Use a restricted sending credential through a secure provider/secret mechanism. Never put it in browser code, `NEXT_PUBLIC_*`, screenshots, Git or chat.
3. Configure **Supabase Auth custom SMTP** (`smtp.resend.com`, username `resend`, documented TLS port) with the verified From address; Supabase renders these templates. An extra public send-email endpoint or client-side Resend SDK is unnecessary.
4. Apply only the reviewed Auth template/SMTP settings. Preserve confirmation requirements, redirect allowlists, secure email change, rate limits and password policy. Disable link tracking for Auth links.
5. Test real confirmation/recovery links end to end using approved synthetic accounts and a controlled inbox, without recording tokens. Test one-time use, expiry, redirect handling and recovery error states. Check bounce/log events and real Gmail/Outlook/mobile rendering before claiming production delivery.

References: [Resend setup](https://resend.com/setup.md), [Resend test events](https://resend.com/docs/dashboard/emails/send-test-emails), [SMTP](https://resend.com/docs/send-with-smtp), [Supabase SMTP restrictions](https://supabase.com/docs/guides/auth/auth-smtp), [Supabase email templates](https://supabase.com/docs/guides/auth/auth-email-templates).
