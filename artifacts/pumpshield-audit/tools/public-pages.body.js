await page.goto('https://pumpshield-seven.vercel.app/login');await capture('public','login');
await snapshot();await page.getByRole('button',{name:'Create an account',exact:true}).click();await capture('public','signup');
await snapshot();await page.getByRole('button',{name:'Back to sign in',exact:true}).click();
await snapshot();await page.getByRole('button',{name:'Forgot password?',exact:true}).click();await capture('public','password-recovery');
await page.goto('https://pumpshield-seven.vercel.app/auth/password');await capture('public','password-update');
await page.goto('https://pumpshield-seven.vercel.app/gate/'+ 'a'.repeat(64));await page.getByRole('alert').first().waitFor({state:'visible'}).catch(()=>{});await capture('public','driver-invalid-link');
await page.goto('https://pumpshield-seven.vercel.app/audit-nonexistent-route');await capture('public','not-found');
return {rows,summary:{signupAndRecovery:'UI and validation only; no account or reset email submitted',driver:'Invalid/expired bearer state only; real driver link not issued'}};
