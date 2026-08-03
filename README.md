# @userback/react-native-sdk

Userback feedback widget for React Native, powered by a transparent WebView overlay.

## What's new in v2

- **Surveys** — `openSurvey(surveyKey)` opens a specific survey directly.
- **Screen tracking** — `enterScreen`/`leaveScreen` attribute feedback, surveys, and session replay to the screen the user was on.
- **Multi-project support** — `openForm` accepts an optional third `projectKey` argument to route feedback to a specific Userback project when your app is set up with more than one.

All of the above are additive. Existing v1 `openForm(mode, directTo)` calls keep working unchanged — no code changes required to upgrade.

### Upgrading from v1

```sh
# npm
npm install @userback/react-native-sdk@^2.0.0

# yarn
yarn add @userback/react-native-sdk@^2.0.0
```

If you're still passing a general web widget access token (`P-...`) as `accessToken`, switch to your app's **Mobile Key** instead — find it in the Userback app under **Workspace Settings → Mobile SDK**. The Mobile Key is required for screen tracking, native events, and multi-project routing (see [Starting the widget](#starting-the-widget)).

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

Call `UserbackSDK.start()` with your **Mobile Key** anywhere in your app. The widget will appear once the WebView is ready.

Find your Mobile Key in the Userback app under **Workspace Settings → Mobile SDK**. This is a dedicated key for mobile apps — don't use the general web widget access token (`P-...`) here, as it isn't configured for the mobile SDK's screen tracking, native events, or multi-project routing.

```tsx
import { UserbackSDK } from '@userback/react-native-sdk';

UserbackSDK.start({
  accessToken: 'YOUR_MOBILE_KEY',
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
| `accessToken` | `string` | Yes | Your Userback Mobile Key, from Workspace Settings → Mobile SDK in the Userback app |
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
UserbackSDK.openForm(mode?: string, directTo?: string, projectKey?: string): void
UserbackSDK.openPortal(): void
UserbackSDK.openRoadmap(): void
UserbackSDK.openAnnouncement(): void
UserbackSDK.openSurvey(surveyKey: string): void
UserbackSDK.close(): void
```

- `mode` — feedback type, e.g. `'general'`, `'bug'`, `'feature_request'`. Defaults to your project's configured default.
- `directTo` — jump straight to a destination, e.g. `'screenshot'` to open the form with a screenshot already attached.
- `projectKey` — if you've set up multiple Userback projects for this app, pass the target project's key to route the form to that project instead of the default one tied to your `accessToken`. Find a project's key in the Userback dashboard under that project's settings. Leave empty to use the default project.
- `openSurvey(surveyKey)` — opens a specific survey by its survey key (found in the Userback dashboard under that survey's settings), independent of the feedback form.

### Screen tracking

```ts
UserbackSDK.enterScreen(screenName: string): void
UserbackSDK.leaveScreen(screenName?: string): void
```

Call `enterScreen` when a screen becomes active and `leaveScreen` when it's dismissed, so feedback, surveys, and session replay can be attributed to the correct screen. Typically wired up in a screen component's `useEffect`:

```tsx
useEffect(() => {
  UserbackSDK.enterScreen('BasicScreen');
  return () => { UserbackSDK.leaveScreen('BasicScreen'); };
}, []);
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
    UserbackSDK.start({ accessToken: 'YOUR_MOBILE_KEY' });
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

## Running the Example App

```sh
git clone https://github.com/userback/widget-react-native
cd widget-react-native
yarn install
```

**iOS**

```sh
yarn ios
```

**Android**

Start an emulator first, then:

```sh
yarn android
```

If the build fails with `SDK location not found`, create `examples/android/local.properties`:

```
sdk.dir=/Users/YOUR_USERNAME/Library/Android/sdk
```

Replace `YOUR_USERNAME` with your macOS username, or run `echo $HOME` to find the path.
