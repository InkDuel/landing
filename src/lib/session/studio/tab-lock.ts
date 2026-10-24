'use client';

// One editing tab per draft (PRD §6 «Dos pestañas», DECISIONS D4). A Web Lock
// named after the account and the draft is held while a tab edits; another
// tab opens the same draft read-only and may take over: it first asks the
// owner (BroadcastChannel) to save, then steals the lock and reloads the text.
// Without Web Locks the editor still works and OCC (409) prevents silent
// overwrites across tabs and devices.

type LockManagerLike = {
  request: (name: string, options: { ifAvailable?: boolean; steal?: boolean }, callback: (lock: unknown) => Promise<void>) => Promise<void>;
};

const CHANNEL = 'inkduel-studio-tabs';

export type LockState = 'pending' | 'owner' | 'readonly' | 'unsupported';

function locks(): LockManagerLike | null {
  const nav = typeof navigator === 'undefined' ? null : (navigator as Navigator & { locks?: LockManagerLike });
  return nav?.locks ?? null;
}

export class DraftTabLock {
  private release: (() => void) | null = null;
  private channel: BroadcastChannel | null = null;
  private disposed = false;

  constructor(
    private readonly name: string,
    /** Called when this tab must stop editing (another tab took over). */
    private readonly onLost: () => void,
    /** The owner saves before handing over; resolves whether all is synced. */
    private readonly onFlushRequest: () => Promise<boolean>,
  ) {
    try {
      this.channel = typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel(CHANNEL);
      if (this.channel) {
        this.channel.onmessage = (event: MessageEvent) => {
          const data = event.data as { type?: string; name?: string } | null;
          if (!data || data.name !== this.name || !this.release) return;
          if (data.type === 'flush') {
            void this.onFlushRequest()
              .catch(() => false)
              .then((ok) => this.channel?.postMessage({ type: 'flushed', name: this.name, ok }));
          }
        };
      }
    } catch {
      this.channel = null;
    }
  }

  private hold(lock: unknown, resolve: (state: LockState) => void): Promise<void> {
    if (!lock || this.disposed) {
      resolve('readonly');
      return Promise.resolve();
    }
    resolve('owner');
    return new Promise<void>((done) => {
      this.release = () => {
        this.release = null;
        done();
      };
    });
  }

  /**
   * Tries to become the editing tab without stealing. A lock released a
   * moment ago (this same tab switching documents, a remount) frees
   * asynchronously, so a busy lock is retried briefly before the tab settles
   * for read-only.
   */
  async acquire(): Promise<LockState> {
    for (const delay of [0, 150, 400, 900]) {
      if (delay) await new Promise((r) => setTimeout(r, delay));
      if (this.disposed) return 'readonly';
      const state = await this.tryOnce();
      if (state !== 'readonly') return state;
    }
    return 'readonly';
  }

  private tryOnce(): Promise<LockState> {
    const manager = locks();
    if (!manager) return Promise.resolve('unsupported');
    return new Promise<LockState>((resolve) => {
      manager
        .request(this.name, { ifAvailable: true }, (lock) => this.hold(lock, resolve))
        .catch(() => {
          // Stolen by another tab (AbortError) or refused by the browser.
          const wasOwner = this.release !== null;
          this.release = null;
          if (wasOwner && !this.disposed) this.onLost();
          resolve('readonly');
        });
    });
  }

  /**
   * Asks the owner to save (up to 4 s), then takes the lock. otherSynced is
   * false when the owner answered that it could not sync everything (its
   * text stays visible there) or did not answer at all.
   */
  async takeOver(): Promise<{ state: LockState; otherSynced: boolean }> {
    const manager = locks();
    if (!manager) return { state: 'unsupported', otherSynced: true };
    let otherSynced = false;
    if (this.channel) {
      await new Promise<void>((resolve) => {
        const timer = setTimeout(resolve, 4000);
        const listener = (event: MessageEvent) => {
          const data = event.data as { type?: string; name?: string; ok?: boolean } | null;
          if (data?.type === 'flushed' && data.name === this.name) {
            otherSynced = data.ok === true;
            clearTimeout(timer);
            this.channel?.removeEventListener('message', listener);
            resolve();
          }
        };
        this.channel?.addEventListener('message', listener);
        this.channel?.postMessage({ type: 'flush', name: this.name });
      });
    }
    const state = await this.steal(manager);
    return { state, otherSynced };
  }

  private steal(manager: LockManagerLike): Promise<LockState> {
    return new Promise<LockState>((resolve) => {
      manager
        .request(this.name, { steal: true }, (lock) => this.hold(lock, resolve))
        .catch(() => {
          const wasOwner = this.release !== null;
          this.release = null;
          if (wasOwner && !this.disposed) this.onLost();
          resolve('readonly');
        });
    });
  }

  dispose() {
    this.disposed = true;
    this.release?.();
    try {
      this.channel?.close();
    } catch {
      // already closed
    }
    this.channel = null;
  }
}
