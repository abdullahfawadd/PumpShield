export function BrandMark() {
  return (
    <svg viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M5 29V3h12a10 10 0 0 1 0 20h-5v6H5Zm7-19v6h5a3 3 0 0 0 0-6h-5Z"
        clipRule="evenodd"
      />
    </svg>
  );
}
export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <span
      className={`brand ${compact ? "brand-compact" : ""}`}
      aria-label="PumpShield"
      role="img"
    >
      <span className="brand-mark">
        <BrandMark />
      </span>
      {!compact && <span className="brand-name">PumpShield</span>}
    </span>
  );
}
