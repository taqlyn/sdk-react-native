import type { ExpoConfig } from "expo/config";

const linkingHosts = [
  "demo-application-sandbox.rutvik.qzz.io",
  "demo-application-production.rutvik.qzz.io",
  "new-application-sandbox.rutvik.qzz.io",
  "new-application-production.rutvik.qzz.io",
  "go.rutvik.qzz.io",
  "mark-pr.riddhu.qzz.io",
];

const config: ExpoConfig = {
  name: "Cenomi Malls",
  slug: "cenomi-malls",
  version: "1.0.0",
  orientation: "portrait",
  scheme: "cenomimalls",
  userInterfaceStyle: "automatic",
  newArchEnabled: true,
  ios: {
    bundleIdentifier: "com.cenomi.mallsapp",
    appleTeamId: "H7Y4Z32BAT",
    supportsTablet: true,
  },
  android: {
    package: "com.cenomi.mallsapp",
  },
  extra: {
    taqlynApiBaseUrl:
      process.env.TAQLYN_API_BASE_URL ?? "https://api.rutvik.qzz.io",
    taqlynClientId: process.env.TAQLYN_CLIENT_ID ?? "app_sample",
    taqlynPublicKeyId: process.env.TAQLYN_PUBLIC_KEY_ID ?? "pk_sample",
  },
  plugins: [
    [
      "@taqlyn/sdk-react-native",
      {
        associatedDomains: linkingHosts,
        androidHosts: linkingHosts,
        androidPathPrefix: "/",
      },
    ],
  ],
};

export default config;
