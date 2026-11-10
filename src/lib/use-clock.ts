"use client";
import { useEffect, useState } from "react";
/** Presentation clock only; the server owns all deadlines and posting rules. */
export function useClock() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(id);
  }, []);
  return now;
}
