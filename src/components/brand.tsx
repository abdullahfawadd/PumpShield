import Image from "next/image";
export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <span
      className={`brand ${compact ? "brand-compact" : ""}`}
      aria-label="PumpShield"
      role="img"
    >
      <span className="brand-mark">
        <Image
          src="/brand/mark.webp"
          alt=""
          width={36}
          height={36}
          priority
          unoptimized
        />
      </span>
      {!compact && <span className="brand-name">PumpShield</span>}
    </span>
  );
}
