import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Dimensions, PixelRatio, Platform, StyleSheet, View } from 'react-native';
import { captureScreen } from 'react-native-view-shot';
import WebView, { WebViewMessageEvent } from 'react-native-webview';
import { UserbackSDK } from './UserbackSDK';
import { UserbackConfig } from './types';

function getDeviceModel(): string {
  if (Platform.OS === 'android') {
    const c = Platform.constants as any;
    return [c.Brand, c.Model].filter(Boolean).join(' ') || 'Android Device';
  }
  const c = Platform.constants as any;
  return c.interfaceIdiom === 'pad' ? 'iPad' : 'iPhone';
}

function getNativeEnv(): Record<string, any> {
  const screen = Dimensions.get('screen');
  const scale = PixelRatio.get();
  const osVersion = typeof Platform.Version === 'string'
    ? Platform.Version
    : String(Platform.Version);

  return {
    platform: Platform.OS,
    sdk_version: '1.0.0',
    os_version: osVersion,
    device_model: getDeviceModel(),
    resolution_x: Math.round(screen.width * scale),
    resolution_y: Math.round(screen.height * scale),
    screen_width_pt: Math.round(screen.width),
    screen_height_pt: Math.round(screen.height),
    dpi_scale: scale,
  };
}

function buildHTML(config: UserbackConfig): string {
  const widgetJSURL = config.widgetJSURL ?? 'https://static.userback.io/widget/v1.js';

  const nativeEnv = getNativeEnv();
  const nativeUAData = {
    platform: Platform.OS,
    platformVersion: typeof Platform.Version === 'string' ? Platform.Version : String(Platform.Version),
    model: getDeviceModel(),
    sdkVersion: '1.0.0',
  };

  const overrides: string[] = [];
  if (config.widgetCSS) overrides.push(`Userback.widget_css=${JSON.stringify(config.widgetCSS)};`);
  if (config.surveyURL) overrides.push(`Userback.survey_url=${JSON.stringify(config.surveyURL)};`);
  if (config.requestURL) overrides.push(`Userback.request_url=${JSON.stringify(config.requestURL)};`);
  if (config.trackURL) overrides.push(`Userback.track_url=${JSON.stringify(config.trackURL)};`);

  return `<!DOCTYPE html>
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
    <style>
      html, body { margin: 0; padding: 0; width: 100%; height: 100%; background: transparent; }
    </style>
    <script>
      // window.webkit.messageHandlers is a native WKWebView object — adding a JS
      // property to it succeeds silently but the native Proxy never returns it.
      // Fix: replace window.webkit entirely so our userbackSDK handler is always found.
      // window.ReactNativeWebView is already set up by react-native-webview before
      // this script runs, so its internal bridge is unaffected by this replacement.
      (function() {
        var _origHandlers = window.webkit && window.webkit.messageHandlers;
        var _post = function(msg) {
          var data = typeof msg === 'string' ? msg : JSON.stringify(msg);
          window.ReactNativeWebView.postMessage(data);
        };
        window.webkit = {
          messageHandlers: new Proxy(_origHandlers || {}, {
            get: function(target, prop) {
              if (prop === 'userbackSDK') return { postMessage: _post };
              return target[prop];
            }
          })
        };
      })();

      window.Userback = window.Userback || {};
      Userback.load_type = 'mobile_sdk';
      Userback.access_token = ${JSON.stringify(config.accessToken)};
      Userback.user_data = ${JSON.stringify(config.userData ?? {})};
      ${overrides.join('\n      ')}
      Userback.native_env = ${JSON.stringify(nativeEnv)};
      Userback.native_ua_data = ${JSON.stringify(nativeUAData)};
    </script>
  </head>
  <body>
    <script src="${widgetJSURL}"></script>
  </body>
</html>`;
}

type SurveyLayoutConfig = {
  format: string;
  position: string;
  size: string;
  hasOverlay: boolean;
};

type SurveyInfo = SurveyLayoutConfig & { height: number };

const SURVEY_SPACE = 24;

const SURVEY_SIZE_WIDTHS: Record<string, number> = {
  'smaller': 352, 'smaller-wide': 448,
  'small': 448,   'small-wide': 544,
  'medium': 544,  'medium-wide': 640,
  'large': 640,   'large-wide': 736,
  'larger': 736,  'larger-wide': 832,
  'largest': 1120,
};

function getSurveyContainerStyle(info: SurveyInfo): object {
  if (info.hasOverlay) {
    return StyleSheet.absoluteFillObject;
  }

  const screen = Dimensions.get('window');
  const width = Math.min(SURVEY_SIZE_WIDTHS[info.size] ?? 640, screen.width - SURVEY_SPACE * 2);
  const height = info.height;
  const centerX = (screen.width - width) / 2;
  const centerY = (screen.height - height) / 2;

  if (info.format === 'pageless') {
    return { position: 'absolute' as const, top: 0, left: centerX, width, height: screen.height };
  }

  switch (info.position) {
    case 'top':         return { position: 'absolute' as const, top: SURVEY_SPACE, left: centerX, width, height };
    case 'top_left':    return { position: 'absolute' as const, top: SURVEY_SPACE, left: SURVEY_SPACE, width, height };
    case 'top_right':   return { position: 'absolute' as const, top: SURVEY_SPACE, right: SURVEY_SPACE, width, height };
    case 'bottom':      return { position: 'absolute' as const, bottom: SURVEY_SPACE, left: centerX, width, height };
    case 'bottom_left': return { position: 'absolute' as const, bottom: SURVEY_SPACE, left: SURVEY_SPACE, width, height };
    case 'bottom_right':return { position: 'absolute' as const, bottom: SURVEY_SPACE, right: SURVEY_SPACE, width, height };
    case 'left':        return { position: 'absolute' as const, top: centerY, left: SURVEY_SPACE, width, height };
    case 'right':       return { position: 'absolute' as const, top: centerY, right: SURVEY_SPACE, width, height };
    case 'center':      return { position: 'absolute' as const, top: centerY, left: centerX, width, height };
    default:            return StyleSheet.absoluteFillObject;
  }
}

interface UserbackProviderProps {
  children: React.ReactNode;
}

export function UserbackProvider({ children }: UserbackProviderProps) {
  const [config, setConfig] = useState<UserbackConfig | null>(null);
  const [widgetOpen, setWidgetOpen] = useState(false);
  const [surveyInfo, setSurveyInfo] = useState<SurveyInfo | null>(null);
  const [takingScreenshot, setTakingScreenshot] = useState(false);
  const surveyConfigsRef = useRef<Record<string, SurveyLayoutConfig>>({});
  const webViewRef = useRef<WebView>(null);
  const pendingFormScreenshotRef = useRef<string | null>(null);
  const formOpenedWithScreenshotRef = useRef(false);

  useEffect(() => {
    const onStart = (cfg: UserbackConfig) => setConfig({ ...cfg });
    const onStop = () => setConfig(null);
    const onForceClose = () => setWidgetOpen(false);
    UserbackSDK.on('_start', onStart);
    UserbackSDK.on('_stop', onStop);
    UserbackSDK.on('_forceClose', onForceClose);
    return () => {
      UserbackSDK.off('_start', onStart);
      UserbackSDK.off('_stop', onStop);
      UserbackSDK.off('_forceClose', onForceClose);
    };
  }, []);

  useEffect(() => {
    const onScreenshotRequested = async () => {
      const capture = UserbackSDK.screenshotProvider
        ?? (() => captureScreen({ format: 'jpg', quality: 0.8, result: 'data-uri' }));
      // Hide the WebView so it's not in the screenshot (mirrors iOS: webView.isHidden = true)
      setTakingScreenshot(true);
      // Wait two frames for the native layer to update before capturing
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
      try {
        const dataURL = await capture();
        // Restore the WebView before dispatching so the widget re-renders while visible
        setTakingScreenshot(false);
        UserbackSDK._sendScreenshot(dataURL);
      } catch (e) {
        if (__DEV__) console.warn('[Userback] screenshot failed:', e);
        setTakingScreenshot(false);
      }
    };
    UserbackSDK.on('_screenshotRequested', onScreenshotRequested);
    return () => { UserbackSDK.off('_screenshotRequested', onScreenshotRequested); };
  }, []);

  useEffect(() => {
    const onCaptureBeforeForm = async () => {
      pendingFormScreenshotRef.current = null;
      formOpenedWithScreenshotRef.current = true;
      const capture = UserbackSDK.screenshotProvider
        ?? (() => captureScreen({ format: 'jpg', quality: 0.8, result: 'data-uri' }));
      setTakingScreenshot(true);
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
      try {
        const dataURL = await capture();
        setTakingScreenshot(false);
        if (formOpenedWithScreenshotRef.current) {
          // Form not yet shown — store and send when widget_resize fires
          pendingFormScreenshotRef.current = dataURL;
        } else {
          // Form already shown — send immediately
          UserbackSDK._sendScreenshot(dataURL);
        }
      } catch (e) {
        if (__DEV__) console.warn('[Userback] pre-form screenshot failed:', e);
        setTakingScreenshot(false);
        formOpenedWithScreenshotRef.current = false;
      }
    };
    UserbackSDK.on('_captureScreenshotBeforeForm', onCaptureBeforeForm);
    return () => { UserbackSDK.off('_captureScreenshotBeforeForm', onCaptureBeforeForm); };
  }, []);

  const inject = useCallback((js: string) => {
    webViewRef.current?.injectJavaScript(js);
  }, []);

  useEffect(() => {
    const sub = Dimensions.addEventListener('change', () => {
      inject(`(function(){window.dispatchEvent(new CustomEvent('userback:rotate'));})();true;`);
    });
    return () => sub.remove();
  }, [inject]);

  useEffect(() => {
    if (config) {
      UserbackSDK._attach(inject);
    } else {
      UserbackSDK._detach();
    }
  }, [config, inject]);

  const handleMessage = useCallback((event: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);

      const type = (data.type ?? data.event ?? '').toLowerCase();

      // Mirror iOS SDK: widget_resize with last:true → show, close → hide
      if (type === 'widget_resize' && data.payload?.last === true) {
        setWidgetOpen(true);
        if (formOpenedWithScreenshotRef.current) {
          formOpenedWithScreenshotRef.current = false;
          const dataURL = pendingFormScreenshotRef.current;
          if (dataURL) {
            pendingFormScreenshotRef.current = null;
            UserbackSDK._sendScreenshot(dataURL);
          }
          // If dataURL is null, capture hasn't finished yet — the onCaptureBeforeForm
          // handler will send it as soon as capture completes (formOpenedWithScreenshotRef is false).
        }
      }
      if (type === 'close') setWidgetOpen(false);

      if (type === 'survey_configs' && Array.isArray(data.payload)) {
        const map: Record<string, SurveyLayoutConfig> = {};
        for (const cfg of data.payload) {
          if (cfg.key) map[cfg.key] = { format: cfg.format ?? '', position: cfg.position ?? 'center', size: cfg.size ?? 'large', hasOverlay: !!cfg.has_background_colour };
        }
        surveyConfigsRef.current = map;
      }
      if (type === 'survey_open') {
        if (!widgetOpen) {
          const cfg = data.payload?.key ? surveyConfigsRef.current[data.payload.key] : undefined;
          setSurveyInfo(cfg ? { ...cfg, height: 0 } : { format: '', position: 'center', size: 'large', hasOverlay: false, height: 0 });
        }
      }
      if (type === 'survey_close') setSurveyInfo(null);
      if (type === 'survey_height') {
        const { height } = data.payload ?? {};
        if (height) setSurveyInfo(prev => prev ? { ...prev, height: height + 40 } : null);
      }

      UserbackSDK._onMessage(data);
    } catch (e) {
      if (__DEV__) console.warn('[Userback] failed to parse message:', e);
    }
  }, []);

  const widgetJSURL = config?.widgetJSURL ?? 'https://static.userback.io/widget/v1.js';
  const baseUrl = (() => {
    try { return new URL(widgetJSURL).origin; } catch { return 'https://static.userback.io'; }
  })();
  return (
    <>
      {children}
      {config && (
        <View style={surveyInfo ? getSurveyContainerStyle(surveyInfo) : StyleSheet.absoluteFillObject} pointerEvents={(widgetOpen || !!surveyInfo) ? 'box-none' : 'none'}>
          <WebView
            style={[styles.webView, (!widgetOpen && !surveyInfo || takingScreenshot) && styles.webViewHidden]}
            ref={webViewRef}
            source={{ html: buildHTML(config), baseUrl }}
            onMessage={handleMessage}
            scrollEnabled={false}
            showsHorizontalScrollIndicator={false}
            showsVerticalScrollIndicator={false}
            allowsInlineMediaPlayback
            mediaPlaybackRequiresUserAction={false}
            webviewDebuggingEnabled={__DEV__}
          />
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  webView: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  webViewHidden: {
    opacity: 0,
  },
});
