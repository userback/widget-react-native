export interface UserbackUserInfo {
  name?: string;
  email?: string;
  [key: string]: string | number | boolean | undefined;
}

export interface UserbackUserData {
  id?: string | number;
  info?: UserbackUserInfo;
}

export interface UserbackConfig {
  accessToken: string;
  userData?: UserbackUserData;
  widgetCSS?: string;
  surveyURL?: string;
  requestURL?: string;
  trackURL?: string;
  widgetJSURL?: string;
}
