import { ShieldCheck } from "lucide-react";
export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <span className="brand">
      <span className="brand-mark">
        <ShieldCheck size={23} strokeWidth={1.8} />
      </span>
      {!compact && (
        <>
          PumpShield<span className="brand-country">PK</span>
        </>
      )}
    </span>
  );
}
