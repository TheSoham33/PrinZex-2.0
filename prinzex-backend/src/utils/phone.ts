/**
 * Riders are registered and stored with bare 10-digit mobiles (the
 * registration schema enforces /^\d{10}$/), but the login schema also
 * accepts "+91…". Canonicalize before the DB lookup and OTP keying so
 * both typed forms resolve to the same record — without it, an exact
 * string match silently misses (anti-enumeration fake-success, no OTP).
 */
export function canonicalPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  // Strip the country code only from "+91"/"91"-prefixed 12-digit input;
  // a genuine 10-digit mobile may itself start with 91.
  return digits.length === 12 && digits.startsWith('91') ? digits.slice(2) : digits;
}
