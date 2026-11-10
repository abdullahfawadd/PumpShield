// A lease is valid only for the session generation that started the work.
// Aborting fetch alone does not cancel crypto or IndexedDB continuations.
export type OfflineLease<Session> = {
  readonly generation: number;
  session: Session | null;
  readonly controller: AbortController;
};

export class OfflineLifetime<Session> {
  private generation = 0;
  private session: Session | null = null;
  private operations = new Set<OfflineLease<Session>>();

  begin(session = this.session): OfflineLease<Session> {
    if (session !== this.session) throw this.stopped();
    const lease = {
      generation: this.generation,
      session,
      controller: new AbortController(),
    };
    this.operations.add(lease);
    return lease;
  }

  current(lease: OfflineLease<Session>) {
    return (
      this.operations.has(lease) &&
      lease.generation === this.generation &&
      lease.session === this.session &&
      !lease.controller.signal.aborted
    );
  }

  check(lease: OfflineLease<Session>) {
    if (!this.current(lease)) throw this.stopped();
  }

  isGeneration(generation: number) {
    return generation === this.generation;
  }

  adopt(lease: OfflineLease<Session>, session: Session) {
    this.check(lease);
    this.session = session;
    lease.session = session;
  }

  finish(lease: OfflineLease<Session>) {
    this.operations.delete(lease);
    lease.controller.abort();
  }

  invalidate() {
    this.generation++;
    this.session = null;
    for (const lease of this.operations) lease.controller.abort();
    this.operations.clear();
  }

  private stopped() {
    return new DOMException(
      "Workspace locked. Unlock it to continue.",
      "AbortError",
    );
  }
}

export const isOfflineCancellation = (error: unknown) =>
  error instanceof Error && error.name === "AbortError";
