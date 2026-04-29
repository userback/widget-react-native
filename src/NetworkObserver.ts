class NetworkObserverClass {
  private _active = false;
  private _originalFetch?: typeof globalThis.fetch;
  private _onEvent?: (event: Record<string, any>) => void;

  start(onEvent: (event: Record<string, any>) => void): void {
    if (this._active) return;
    this._active = true;
    this._onEvent = onEvent;
    this._patchFetch();
  }

  stop(): void {
    if (!this._active) return;
    if (this._originalFetch) {
      globalThis.fetch = this._originalFetch;
      this._originalFetch = undefined;
    }
    this._onEvent = undefined;
    this._active = false;
  }

  private _patchFetch(): void {
    const original = globalThis.fetch;
    this._originalFetch = original;

    globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const url = typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.href
          : (input as Request).url;

      // Skip Userback traffic to avoid feedback loops
      if (url.includes('userback')) return original(input as RequestInfo, init);

      const method = (init?.method ?? 'GET').toUpperCase();
      const startTime = Date.now();

      try {
        const response = await original(input as RequestInfo, init);
        this._onEvent?.({
          eventType: 'network',
          name: url,
          type: this._initiatorType(init),
          method,
          status: response.status,
          responseStatus: response.status,
          startTime,
          duration: Date.now() - startTime,
          encodedBodySize: 0,
          transferSize: 0,
        });
        return response;
      } catch (e) {
        this._onEvent?.({
          eventType: 'network',
          name: url,
          type: this._initiatorType(init),
          method,
          status: 0,
          responseStatus: 0,
          startTime,
          duration: Date.now() - startTime,
          encodedBodySize: 0,
          transferSize: 0,
        });
        throw e;
      }
    };
  }

  private _initiatorType(init?: RequestInit): string {
    const accept = (init?.headers as Record<string, string>)?.['Accept'] ?? '';
    if (accept.includes('text/html')) return 'document';
    if (accept.includes('text/css')) return 'style';
    if (accept.includes('javascript')) return 'script';
    if (accept.includes('image/')) return 'image';
    return 'fetch';
  }
}

export const NetworkObserver = new NetworkObserverClass();
