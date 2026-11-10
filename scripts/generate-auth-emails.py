"""Regenerate account email templates and clearly synthetic design previews.

Run from the repository root. Never sends email or changes hosted settings.
"""
from pathlib import Path
from html import escape
import json

Path('supabase/templates').mkdir(parents=True, exist_ok=True)
Path('artifacts/pumpshield-email').mkdir(parents=True, exist_ok=True)

messages={
 'confirmation':('Confirm your PumpShield account','Confirm your email address','Confirm your email to finish setting up your PumpShield account. After signing in, review the business and station before accepting any workspace invitation.','Confirm email','If you did not create this account, you can ignore this email.'),
 'recovery':('Reset your PumpShield password','Reset your password','A password reset was requested for your PumpShield account. Use the link below to choose a new password.','Reset password','If you did not request this, ignore this email. Your password changes only after you complete the reset.'),
 'invite':('Your PumpShield invitation','Review your invitation','You have been invited to PumpShield. Continue to verify your identity, then review the business, station and access before accepting the invitation.','Review invitation','An invitation never grants access by itself. Accept only a business and station you recognize.'),
 'email_change':('Confirm your new PumpShield email','Confirm your new email','Confirm the new email address requested for your PumpShield account.','Confirm email change','If you did not request this change, do not continue. Contact your workspace owner.'),
 'magic_link':('Sign in to PumpShield','Your secure sign-in link','Use this link to sign in to your PumpShield workspace. Open it only if you requested it.','Sign in securely','If you did not request this email, you can ignore it.'),
 'reauthentication':('Your PumpShield verification code','Verify it’s you','Use this one-time code to confirm your identity for the security action you requested.','', 'Never share this code. PumpShield staff will not ask you for it. If you did not request it, ignore this email.'),
}
base='''<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="color-scheme" content="light dark"><meta name="supported-color-schemes" content="light dark"><title>SUBJECT</title>
<style>body{margin:0;padding:0;background:#f3f5f4;color:#202724}table{border-collapse:collapse}a{color:#174c45} @media(max-width:600px){.outer{padding:24px 12px!important}.content{padding:28px 24px!important}.headline{font-size:27px!important;line-height:34px!important}.action{display:block!important;text-align:center!important}}@media(prefers-color-scheme:dark){body,.page{background:#131916!important}.card{background:#1e2722!important;border-color:#3f4e45!important}.headline,.body-copy{color:#f1f5f2!important}.muted{color:#c3cec7!important}.rule{border-color:#3f4e45!important}.action{background:#dcece3!important;color:#163b2b!important}.fallback a{color:#c4dfcf!important}.brand{color:#f1f5f2!important}}</style></head>
<body><div style="display:none;font-size:1px;color:#f3f5f4;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden">PREHEADER</div>
<table role="presentation" width="100%" class="page" style="background:#f3f5f4"><tr><td align="center" class="outer" style="padding:48px 20px">
<!--[if mso]><table role="presentation" width="560"><tr><td><![endif]-->
<table role="presentation" width="100%" style="max-width:560px"><tr><td style="padding:0 0 24px 4px"><table role="presentation"><tr><td aria-hidden="true" style="font:bold 24px Arial,Helvetica,sans-serif;color:#ffffff;background:#174c45;padding:6px 11px;border-radius:8px">P</td><td class="brand" style="padding-left:10px;font:600 21px Arial,Helvetica,sans-serif;color:#202724;letter-spacing:-0.6px">PumpShield</td></tr></table></td></tr>
<tr><td class="card content" style="background:#ffffff;border:1px solid #d7dfd9;border-radius:16px;padding:40px;font-family:Arial,Helvetica,sans-serif">
<p class="muted" style="margin:0 0 18px;font-size:12px;line-height:18px;letter-spacing:1.1px;font-weight:bold;color:#58645f">ACCOUNT SECURITY</p>
<h1 class="headline" style="margin:0 0 20px;font-size:32px;line-height:39px;letter-spacing:-1px;color:#202724;font-weight:600">HEADLINE</h1>
<p class="body-copy" style="margin:0 0 28px;font-size:16px;line-height:26px;color:#36453c">INTRO</p>
ACTION
<p class="muted" style="margin:26px 0 0;font-size:13px;line-height:21px;color:#58645f">Use the most recent message. This credential expires automatically.</p>
<div class="rule" style="margin:28px 0 22px;border-top:1px solid #dce3de"></div>
<p class="muted" style="margin:0;font-size:13px;line-height:21px;color:#58645f">SAFETY</p>
FALLBACK
</td></tr>
<tr><td class="muted" style="padding:22px 4px 0;font:12px/20px Arial,Helvetica,sans-serif;color:#58645f">This is an account-security email from PumpShield.<br>No fuel transaction or financial approval is authorized by this email.</td></tr></table>
<!--[if mso]></td></tr></table><![endif]-->
</td></tr></table></body></html>'''
manifest=[]
for kind,(subject,title,intro,cta,safety) in messages.items():
 if kind=='reauthentication':
  action='<div style="font:600 30px/44px Arial,Helvetica,sans-serif;letter-spacing:6px;color:#174c45;background:#edf4ef;border-radius:8px;padding:18px 16px;text-align:center">{{ .Token }}</div>'
  fallback=''
 else:
  action='<table role="presentation"><tr><td style="background:#174c45;border-radius:8px"><a class="action" href="{{ .ConfirmationURL }}" style="display:inline-block;background:#174c45;border-radius:8px;padding:15px 24px;font:600 15px/22px Arial,Helvetica,sans-serif;color:#ffffff;text-decoration:none">'+escape(cta)+'</a></td></tr></table>'
  fallback='<p class="muted fallback" style="margin:22px 0 0;font-size:12px;line-height:20px;color:#58645f">Button not working? Copy this link into your browser:<br><a href="{{ .ConfirmationURL }}" style="color:#174c45;word-break:break-all;overflow-wrap:anywhere">{{ .ConfirmationURL }}</a></p>'
 result=base.replace('SUBJECT',escape(subject)).replace('PREHEADER',escape(intro)).replace('HEADLINE',escape(title)).replace('INTRO',escape(intro)).replace('ACTION\n',action+'\n').replace('SAFETY',escape(safety)).replace('FALLBACK',fallback)
 path=Path('supabase/templates')/(kind+'.html');path.write_text(result,encoding='utf-8')
 preview=result.replace('{{ .ConfirmationURL }}','https://pumpshield-seven.vercel.app/auth/callback?preview=design-only').replace('{{ .Token }}','42861703')
 (Path('artifacts/pumpshield-email')/(kind+'-preview.html')).write_text(preview,encoding='utf-8')
 manifest.append({'type':kind,'subject':subject,'template':path.as_posix(),'preview':kind+'-preview.html'})
Path('artifacts/pumpshield-email/templates.json').write_text(json.dumps(manifest,indent=2),encoding='utf-8')
cards=''.join('<section><h2>'+escape(m['subject'])+'</h2><a href="'+m['preview']+'">Open responsive preview</a><iframe title="'+escape(m['subject'])+'" src="'+m['preview']+'"></iframe></section>'for m in manifest)
Path('artifacts/pumpshield-email/preview.html').write_text('<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>PumpShield email designs</title><style>body{font:15px/1.6 system-ui;background:#f3f5f4;color:#202724;margin:24px}main{max-width:1400px;margin:auto}h1{letter-spacing:-1px}h2{font-size:17px}a{color:#174c45}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:24px}iframe{display:block;border:1px solid #d7dfd9;border-radius:12px;width:100%;height:900px;margin-top:12px}@media(max-width:800px){.grid{grid-template-columns:1fr}}</style><main><h1>PumpShield · Account emails</h1><p>Design previews only. Links and codes below are synthetic; these previews do not send email or authenticate anyone.</p><div class="grid">'+cards+'</div></main></html>',encoding='utf-8')
print(json.dumps({'templates':len(manifest),'liveDeliveryChanged':False}))
