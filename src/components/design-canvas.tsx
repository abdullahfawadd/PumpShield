import Image from "next/image";
import {
  ArrowUpRight,
  ShieldCheck,
  Fingerprint,
  Fuel,
  Waves,
} from "lucide-react";
export function DesignCanvas() {
  return (
    <div
      className="design-canvas"
      aria-label="Decorative PumpShield component collection"
    >
      <div className="canvas-wall">
        {Array.from({ length: 21 }, (_, i) => (
          <div key={i} className={`specimen specimen-${i % 7}`}>
            {i % 7 === 0 ? (
              <>
                <span>
                  PRECISION IN MOTION <ArrowUpRight size={14} />
                </span>
                <Image
                  src="/tanker-studio.png"
                  width={500}
                  height={270}
                  alt=""
                />
              </>
            ) : i % 7 === 1 ? (
              <>
                <span>Every detail. Verified.</span>
                <div className="specimen-gauge">
                  <ShieldCheck size={33} />
                </div>
                <small>THE CONFIDENCE TO MOVE FORWARD</small>
              </>
            ) : i % 7 === 2 ? (
              <>
                <span>
                  FUEL MOVEMENT <Fuel size={13} />
                </span>
                <div className="specimen-bars">
                  {[
                    22, 41, 38, 67, 45, 82, 65, 92, 77, 100, 70, 86, 63, 95,
                  ].map((h, j) => (
                    <i key={j} style={{ height: h }} />
                  ))}
                </div>
              </>
            ) : i % 7 === 3 ? (
              <>
                <span>One secure workspace</span>
                <Fingerprint size={75} strokeWidth={0.6} />
                <small>OWNER / SUPERVISOR</small>
              </>
            ) : i % 7 === 4 ? (
              <>
                <span>From dispatch to daily close</span>
                <svg viewBox="0 0 240 100">
                  <path
                    d="M0 75Q40 75 55 35T120 45T185 20T240 30"
                    fill="none"
                    stroke="#d5bcfa"
                    strokeWidth="2"
                  />
                  <path
                    d="M0 90Q40 90 55 50T120 60T185 35T240 45"
                    fill="none"
                    stroke="#ffffff21"
                  />
                </svg>
                <small>CLARITY AT EVERY STAGE</small>
              </>
            ) : i % 7 === 5 ? (
              <>
                <span>
                  Built around your trust <Waves size={14} />
                </span>
                <div className="specimen-orb" />
              </>
            ) : (
              <>
                <span>Shift complete</span>
                <div className="specimen-toggle">
                  <i />
                </div>
                <small>ACCOUNTABILITY, BY DESIGN.</small>
              </>
            )}
          </div>
        ))}
      </div>
      <span className="canvas-watermark">
        PUMPSHIELD / THE DETAILS MAKE THE DIFFERENCE
      </span>
    </div>
  );
}
