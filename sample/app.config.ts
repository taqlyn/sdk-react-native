import type { ExpoConfig } from "expo/config";

const linkingHosts = [
  "cenomi-centers-sandbox.uat.links.taqlyn.com",
  "cenomi-centers-production.uat.links.taqlyn.com",
  "cenomi-uat.touchpay.qzz.io"
];

const config: ExpoConfig = {
  name: "Taqlyn Link Tester",
  slug: "cenomi-malls",
  version: "2.12.3",
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
    package: "com.taqlyn.test",
  },
  extra: {
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
