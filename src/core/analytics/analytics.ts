interface AnalyticsEvent {
  name: string;
  props?: Record<string, unknown>;
  at: number;
}

export class AnalyticsService {
  private readonly queue: AnalyticsEvent[] = [];

  track(name: string, props?: Record<string, unknown>): void {
    this.queue.push({ name, props, at: Date.now() });
    if (this.queue.length > 100) this.queue.shift();
  }

  drain(): AnalyticsEvent[] {
    return this.queue.splice(0, this.queue.length);
  }
}
