# @userback/react-native-sdk

Userback feedback widget for React Native, powered by a transparent WebView overlay.

## Requirements

- React >= 17
- React Native >= 0.68
- [`react-native-webview`](https://github.com/react-native-webview/react-native-webview) >= 11
- [`react-native-view-shot`](https://github.com/gre/react-native-view-shot) >= 3.0

Both are native modules and must be installed in your app alongside this SDK.

## Installation

```sh
# npm
npm install @userback/react-native-sdk react-native-webview react-native-view-shot

# yarn
yarn add @userback/react-native-sdk react-native-webview react-native-view-shot
```

**iOS** — run pod install after installing:

```sh
cd ios && pod install
```

**Android** — no extra steps required; native modules are auto-linked via Gradle.

**Expo** — Expo Go is not supported as this SDK uses native modules. Use a development build:

```sh
npx expo install expo-dev-client react-native-webview react-native-view-shot
npx expo run:ios     # or run:android
```

## Setup

Wrap your app's root component with `UserbackProvider`. It renders a transparent WebView overlay that hosts the widget.

```tsx
import { UserbackProvider } from '@userback/react-native-sdk';

export default function App() {
  return (
    <UserbackProvider>
      <YourApp />
    </UserbackProvider>
  );
}
```

## Starting the widget

Call `UserbackSDK.start()` with your access token anywhere in your app. The widget will appear once the WebView is ready.

```tsx
import { UserbackSDK } from '@userback/react-native-sdk';

UserbackSDK.start({
  accessToken: 'YOUR_ACCESS_TOKEN',
});
```

Call `UserbackSDK.stop()` to remove the widget entirely.

```tsx
UserbackSDK.stop();
```

## Configuration

`UserbackSDK.start()` accepts a `UserbackConfig` object:

| Option | Type | Required | Description |
|---|---|---|---|
| `accessToken` | `string` | Yes | Your Userback access token |
| `userData` | `UserbackUserData` | No | Initial user data passed to the widget |
| `widgetCSS` | `string` | No | Custom CSS injected into the widget |
| `surveyURL` | `string` | No | Override the survey endpoint URL |
| `requestURL` | `string` | No | Override the request endpoint URL |
| `trackURL` | `string` | No | Override the tracking endpoint URL |
| `widgetJSURL` | `string` | No | Override the widget JS URL (default: `https://static.userback.io/widget/v1.js`) |

`UserbackUserData` shape:

```ts
{
  id?: string | number;
  info?: {
    name?: string;
    email?: string;
    [key: string]: string | number | boolean | undefined;
  };
}
```

## API

All methods are on the `UserbackSDK` singleton.

### Widget lifecycle

```ts
UserbackSDK.start(config: UserbackConfig): void
UserbackSDK.stop(): void
UserbackSDK.isLoaded(callback: (loaded: boolean) => void): void
UserbackSDK.refresh(refreshFeedback?: boolean, refreshSurvey?: boolean): void
UserbackSDK.destroy(keepInstance?: boolean, keepRecorder?: boolean): void
```

### Opening/closing the widget

```ts
UserbackSDK.openForm(mode?: string, directTo?: string): void
UserbackSDK.openPortal(): void
UserbackSDK.openRoadmap(): void
UserbackSDK.openAnnouncement(): void
UserbackSDK.close(): void
```

### User identity

```ts
UserbackSDK.identify(userID: string | number, userInfo?: Record<string, any>): void
UserbackSDK.clearIdentity(): void
UserbackSDK.setEmail(email: string): void
UserbackSDK.setName(name: string): void
```

### Customisation

```ts
UserbackSDK.setCategories(categories: string): void
UserbackSDK.setPriority(priority: string): void
UserbackSDK.setTheme(theme: string): void
UserbackSDK.setData(data: Record<string, any>): void
UserbackSDK.addHeader(key: string, value: string): void
```

### Session replay

```ts
UserbackSDK.startSessionReplay(options?: Record<string, any>): void
UserbackSDK.stopSessionReplay(): void
```

### Custom events

```ts
UserbackSDK.addCustomEvent(title: string, details?: Record<string, any>): void
```

### Screenshot capture

Screenshots are captured automatically using `react-native-view-shot` when a user attaches a screenshot in the feedback form. To use a custom capture implementation instead:

```ts
UserbackSDK.screenshotProvider = () => myCustomCapture();
```

### Callbacks

```ts
UserbackSDK.onClose = () => { ... };
UserbackSDK.onWidgetConfigLoaded = (config: Record<string, any>) => { ... };
UserbackSDK.onWidgetResize = (size: { width: number; height: number }) => { ... };
UserbackSDK.onLoadError = (payload: Record<string, any>) => { ... };
UserbackSDK.onHcaptchaRequired = (payload: Record<string, any>) => { ... };
UserbackSDK.onOpenURL = (url: string) => { ... };
```

## Example

```tsx
import React, { useEffect } from 'react';
import { Button, View } from 'react-native';
import { UserbackProvider, UserbackSDK } from '@userback/react-native-sdk';

function FeedbackButton() {
  return (
    <Button
      title="Give Feedback"
      onPress={() => UserbackSDK.openForm()}
    />
  );
}

export default function App() {
  useEffect(() => {
    UserbackSDK.start({ accessToken: 'YOUR_ACCESS_TOKEN' });
    return () => UserbackSDK.stop();
  }, []);

  return (
    <UserbackProvider>
      <View style={{ flex: 1 }}>
        <FeedbackButton />
      </View>
    </UserbackProvider>
  );
}
```
