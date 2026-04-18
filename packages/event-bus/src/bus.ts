type EventCallback<T = unknown> = (payload: T) => void;

class EventBus {
  private listeners = new Map<string, Set<EventCallback>>();

  on<T = unknown>(event: string, callback: EventCallback<T>): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    const cbs = this.listeners.get(event)!;
    cbs.add(callback as EventCallback);
    return () => {
      cbs.delete(callback as EventCallback);
    };
  }

  emit<T = unknown>(event: string, payload: T): void {
    this.listeners.get(event)?.forEach((cb) => cb(payload));
  }

  off(event: string): void {
    this.listeners.delete(event);
  }
}

export const eventBus = new EventBus();
