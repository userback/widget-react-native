type LogLevel = 'log' | 'warn' | 'error' | 'info' | 'debug';

class LogObserverClass {
  private _active = false;
  private _originals: Partial<Record<LogLevel, (...args: any[]) => void>> = {};
  private _onEvent?: (event: Record<string, any>) => void;

  start(onEvent: (event: Record<string, any>) => void): void {
    if (this._active) return;
    this._active = true;
    this._onEvent = onEvent;

    const levels: LogLevel[] = ['log', 'warn', 'error', 'info', 'debug'];
    for (const level of levels) {
      this._originals[level] = console[level].bind(console);
      console[level] = (...args: any[]) => {
        this._originals[level]!(...args);
        this._capture(level, args);
      };
    }
  }

  stop(): void {
    if (!this._active) return;
    for (const [level, original] of Object.entries(this._originals) as [LogLevel, (...args: any[]) => void][]) {
      console[level] = original;
    }
    this._originals = {};
    this._onEvent = undefined;
    this._active = false;
  }

  private _capture(level: LogLevel, args: any[]): void {
    const message = args.map(a => {
      try { return typeof a === 'object' ? JSON.stringify(a) : String(a); }
      catch { return String(a); }
    }).join(' ');

    // Avoid feedback loops from SDK internal logs
    if (message.startsWith('[Userback]') || message.startsWith('LogObserver')) return;

    this._onEvent?.({ type: 'log', level, message });
  }
}

export const LogObserver = new LogObserverClass();
