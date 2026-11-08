export function parseVehicleCredential(value: string) {
  const token = value.trim().replace(/^pumpshield:vehicle:/i, "");
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      token,
    )
  )
    throw new Error(
      "Scan an owner-issued PumpShield vehicle pass. Payment QRs, number plates, and receipt QRs cannot authorise a credit fill.",
    );
  return token.toLowerCase();
}
export function vehicleCredential(token: string) {
  return `pumpshield:vehicle:${parseVehicleCredential(token)}`;
}
