import { UserbackConfig } from './types';
import { LogObserver } from './LogObserver';
import { NetworkObserver } from './NetworkObserver';

type Listener = (...args: any[]) => void;

class Emitter {
  private _events: Record<string, Listener[]> = {};

  on(event: string, fn: Listener): this {
    (this._events[event] = this._events[event] || []).push(fn);
    return this;
  }

  once(event: string, fn: Listener): this {
    const wrapper = (...args: any[]) => { fn(...args); this.off(event, wrapper); };
    return this.on(event, wrapper);
  }

  off(event: string, fn: Listener): this {
    this._events[event] = (this._events[event] || []).filter(f => f !== fn);
    return this;
  }

  emit(event: string, ...args: any[]): void {
    (this._events[event] || []).slice().forEach(fn => fn(...args));
  }
}

class UserbackSDKClass extends Emitter {
  static readonly sdkVersion = '1.0.0';
  static readonly defaultWidgetJSURL = 'https://static.userback.io/widget/v1.js';

  private _config: UserbackConfig | null = null;
  private _widgetConfig: Record<string, any> | null = null;
  private _ready = false;
  private _pending: string[] = [];
  private _inject: ((js: string) => void) | null = null;

  public onWidgetConfigLoaded?: (config: Record<string, any>) => void;
  public onWidgetResize?: (size: { width: number; height: number }) => void;
  /** Called when the user closes the widget. */
  public onClose?: () => void;
  /** Called when the widget encounters a load error. */
  public onLoadError?: (payload: Record<string, any>) => void;
  /** Called when the widget requires hCaptcha verification. */
  public onHcaptchaRequired?: (payload: Record<string, any>) => void;
  /**
   * Called when the widget wants to open an external URL (portal, roadmap,
   * announcement, help). Use Linking.openURL or your in-app browser here.
   */
  public onOpenURL?: (url: string) => void;

  /**
   * Provide a function that captures the current screen and returns a
   * base64 JPEG data URL (e.g. "data:image/jpeg;base64,...").
   * The SDK hides the WebView before calling this so the widget overlay
   * is not included in the screenshot.
   *
   * Example using react-native-view-shot:
   *   UserbackSDK.screenshotProvider = () => captureScreen({ format: 'jpg', quality: 0.8, result: 'data-uri' });
   */
  public screenshotProvider?: () => Promise<string>;

  get config(): UserbackConfig | null {
    return this._config;
  }

  get widgetJSURL(): string {
    return this._config?.widgetJSURL ?? UserbackSDKClass.defaultWidgetJSURL;
  }

  /** @internal */
  _attach(inject: (js: string) => void): void {
    this._inject = inject;
    this._ready = false;
  }

  /** @internal */
  _detach(): void {
    this._inject = null;
    this._ready = false;
    this._pending = [];
  }

  /** @internal */
  _onReady(): void {
    if (__DEV__) console.log(`[Userback] ready — flushing ${this._pending.length} pending call(s)`);
    this._ready = true;
    this._pending.forEach(js => this._inject!(js));
    this._pending = [];
  }

  /** @internal */
  _onMessage(data: Record<string, any>): void {
    const type = (data.type ?? data.event ?? '').toLowerCase();
    switch (type) {
      case 'load':
        this._onReady();
        if (data.payload) {
          this._widgetConfig = data.payload;
          this.onWidgetConfigLoaded?.(data.payload);
          this._startObservers(data.payload);
        }
        break;

      case 'widget_resize':
        this.onWidgetResize?.(data.payload ?? {});
        break;

      case 'widget_action':
        this._handleWidgetAction(data.payload ?? {});
        break;

      case 'close':
        this.emit('_widgetClose');
        this.onClose?.();
        break;

      case 'load_error':
        this.onLoadError?.(data.payload ?? {});
        break;

      case 'hcaptcha_required':
        this.onHcaptchaRequired?.(data.payload ?? {});
        break;

      case 'isloaded':
        this.emit('_isLoaded', data.value);
        break;
    }
  }

  private _handleWidgetAction(payload: Record<string, any>): void {
    const action = (payload.action ?? '').toLowerCase();
    const target = (payload.target ?? '').toLowerCase();

    switch (action) {
      case 'gotoportal':
        if (target === 'widget') {
          this._run('openPortal', ['portal']);
        } else {
          const url = this._widgetConfig?.['portal_url'] as string | undefined;
          if (url) this.onOpenURL?.(url);
          else this._run('openPortal');
        }
        break;

      case 'gotoroadmap':
        if (target === 'widget') {
          this._run('openPortal', ['roadmap']);
        } else {
          const url = this._widgetConfig?.['portal_url'] as string | undefined;
          if (url) this.onOpenURL?.(url);
          else this._run('openRoadmap');
        }
        break;

      case 'gotoannouncement':
        if (target === 'widget') {
          this._run('openPortal', ['announcement']);
        } else {
          const url = this._widgetConfig?.['portal_url'] as string | undefined;
          if (url) this.onOpenURL?.(url);
          else this._run('openAnnouncement');
        }
        break;

      case 'openhelp': {
        const helpURL = (this._widgetConfig?.['help_link'] as string | undefined)
          ?? (this._widgetConfig?.['portal_url'] as string | undefined);
        if (helpURL) this.onOpenURL?.(helpURL);
        break;
      }

      case 'attachscreenshot':
        this.emit('_screenshotRequested');
        break;
    }
  }

  private _startObservers(config: Record<string, any>): void {
    const wantsLogs = config.capture_console_log || config.capture_console_error ||
      config.capture_console_warn || config.capture_console_info || config.capture_console_debug;

    if (wantsLogs) {
      LogObserver.start(event => this._sendNativeEvent(event));
    }
    if (config.capture_network) {
      NetworkObserver.start(event => this._sendNativeEvent(event));
    }
  }

  private _sendNativeEvent(event: Record<string, any>): void {
    if (!this._inject) return;
    if (event.type === 'log') {
      const detail = { payload: { type: event.level, message: event.message } };
      const js = `(function(){window.dispatchEvent(new CustomEvent('userback:nativeLogEvent',{detail:${JSON.stringify(detail)}}));})();true;`;
      this._inject(js);
    } else {
      const detail = { payload: event };
      const js = `(function(){window.dispatchEvent(new CustomEvent('userback:nativeNetworkEvent',{detail:${JSON.stringify(detail)}}));})();true;`;
      this._inject(js);
    }
  }

  /** @internal — called by UserbackProvider after capturing the screenshot */
  _sendScreenshot(dataURL: string): void {
    const message = JSON.stringify({
      type: 'native_screenshot',
      payload: { data_url: dataURL },
    });
    const js = `(function(){window.dispatchEvent(new CustomEvent('userback:nativeScreenshot',{detail:${message}}));})();true;`;
    if (this._inject) this._inject(js);
  }

  private _run(fn: string, args: any[] = []): void {
    const params = args.map(a => (a === undefined ? 'null' : JSON.stringify(a))).join(', ');
    const js = `(function(){window.Userback&&typeof window.Userback.${fn}==='function'&&window.Userback.${fn}(${params});})();true;`;
    if (this._ready && this._inject) {
      this._inject(js);
    } else {
      this._pending.push(js);
    }
  }

  start(config: UserbackConfig): void {
    if (!config.accessToken) {
      console.error('[Userback] accessToken is required');
      return;
    }
    this._config = config;
    this.emit('_start', config);
  }

  stop(): void {
    LogObserver.stop();
    NetworkObserver.stop();
    this._config = null;
    this._widgetConfig = null;
    this._ready = false;
    this._pending = [];
    this.emit('_stop');
  }

  isLoaded(callback: (loaded: boolean) => void): void {
    if (!this._ready || !this._inject) {
      callback(false);
      return;
    }
    this.once('_isLoaded', callback);
    this._inject(
      `(function(){var v=window.Userback&&typeof window.Userback.isLoaded==='function'?!!window.Userback.isLoaded():false;window.ReactNativeWebView.postMessage(JSON.stringify({type:'isLoaded',value:v}));})();true;`
    );
  }

  refresh(refreshFeedback = true, refreshSurvey = true): void {
    this._run('refresh', [refreshFeedback, refreshSurvey]);
  }

  destroy(keepInstance = false, keepRecorder = false): void {
    this._run('destroy', [keepInstance, keepRecorder]);
  }

  openForm(mode = '', directTo?: string): void {
    this._run('openForm', [mode, directTo ?? null]);
  }

  openPortal(): void { this._run('openPortal'); }
  openRoadmap(): void { this._run('openRoadmap'); }
  openAnnouncement(): void { this._run('openAnnouncement'); }
  close(): void { this._run('close'); }

  setEmail(email: string): void { this._run('setEmail', [email]); }
  setName(name: string): void { this._run('setName', [name]); }
  setCategories(categories: string): void { this._run('setCategories', [categories]); }
  setPriority(priority: string): void { this._run('setPriority', [priority]); }
  setTheme(theme: string): void { this._run('setTheme', [theme]); }
  setData(data: Record<string, any>): void { this._run('setData', [data]); }
  addHeader(key: string, value: string): void { this._run('addHeader', [key, value]); }

  identify(userID: string | number, userInfo?: Record<string, any>): void {
    this._run('identify', [userID, userInfo ?? null]);
  }

  clearIdentity(): void { this._run('identify', [-1]); }

  startSessionReplay(options: Record<string, any> = {}): void {
    this._run('startSessionReplay', [options]);
  }

  stopSessionReplay(): void { this._run('stopSessionReplay'); }

  addCustomEvent(title: string, details?: Record<string, any>): void {
    this._run('addCustomEvent', [title, details ?? null]);
  }
}

export const UserbackSDK = new UserbackSDKClass();
