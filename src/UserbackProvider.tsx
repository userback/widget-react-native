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

interface UserbackProviderProps {
  children: React.ReactNode;
}

export function UserbackProvider({ children }: UserbackProviderProps) {
  const [config, setConfig] = useState<UserbackConfig | null>(null);
  const [widgetOpen, setWidgetOpen] = useState(false);
  const [takingScreenshot, setTakingScreenshot] = useState(false);
  const webViewRef = useRef<WebView>(null);

  useEffect(() => {
    const onStart = (cfg: UserbackConfig) => setConfig({ ...cfg });
    const onStop = () => setConfig(null);
    UserbackSDK.on('_start', onStart);
    UserbackSDK.on('_stop', onStop);
    return () => {
      UserbackSDK.off('_start', onStart);
      UserbackSDK.off('_stop', onStop);
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

  const inject = useCallback((js: string) => {
    webViewRef.current?.injectJavaScript(js);
  }, []);

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
      if (type === 'widget_resize' && data.payload?.last === true) setWidgetOpen(true);
      if (type === 'close') setWidgetOpen(false);

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
        <View style={StyleSheet.absoluteFill} pointerEvents={widgetOpen ? 'box-none' : 'none'}>
          <WebView
            style={[styles.webView, (!widgetOpen || takingScreenshot) && styles.webViewHidden]}
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
