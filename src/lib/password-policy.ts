// Single-factor enrollment/recovery policy. Existing sign-in credentials are
// verified by Auth unchanged; never trim, normalize, or silently truncate them.
export const PASSWORD_MIN_LENGTH = 15;
export const PASSWORD_MAX_LENGTH = 128;

export function newPasswordError(password: string): string | null {
  const length = Array.from(password).length;
  if (length < PASSWORD_MIN_LENGTH)
    return `Use at least ${PASSWORD_MIN_LENGTH} characters for your new password.`;
  if (length > PASSWORD_MAX_LENGTH)
    return `Use no more than ${PASSWORD_MAX_LENGTH} characters.`;
  return null;
}
