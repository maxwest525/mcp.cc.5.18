// Minimal pub/sub for hub UI surfaces (e.g. open AI command center prefilled).
type Listener<T> = (payload: T) => void;

class EventBus<EventMap extends Record<string, unknown>> {
  private listeners = new Map<keyof EventMap, Set<Listener<any>>>();

  on<K extends keyof EventMap>(event: K, fn: Listener<EventMap[K]>): () => void {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(fn as Listener<any>);
    return () => this.listeners.get(event)!.delete(fn as Listener<any>);
  }

  emit<K extends keyof EventMap>(event: K, payload: EventMap[K]) {
    this.listeners.get(event)?.forEach((fn) => {
      try { fn(payload); } catch { /* swallow */ }
    });
  }
}

export type HubEventMap = {
  "open-with-message": { message: string; agentKey?: string };
  "execution-started": { route: unknown };
  "execution-completed": { ok: boolean; reply: string };
};

export const hubEvents = new EventBus<HubEventMap>();
