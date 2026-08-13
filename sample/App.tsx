/**
 * Cenomi Malls RN sample — bundle/package com.cenomi.mallsapp
 * Deep links (https short URLs + cenomimalls://) open the Home tab.
 */
import { useCallback, useEffect, useState } from "react";
import {
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import * as Linking from "expo-linking";
import {
  configure,
  createShareLink,
  resolveDeferred,
  observePlatformLinks,
  setReadyForNavigation,
  consume,
  type DeferredLink,
  type TaqlynOs,
} from "@taqlyn/sdk-react-native";
import {
  mapDeferredLinkToHref,
  whenReadyNavigate,
  subscribeWarmLinks,
  createTaqlynLinking,
} from "@taqlyn/nav-expo-router";

type Tab = "home" | "malls" | "account";

function env(name: string, fallback: string): string {
  try {
    const g = globalThis as {
      process?: { env?: Record<string, string | undefined> };
    };
    const v = g.process?.env?.[name];
    return v && v.length > 0 ? v : fallback;
  } catch {
    return fallback;
  }
}

function bootSdk() {
  const apiBaseUrl = env("TAQLYN_API_BASE_URL", "");
  configure(env("TAQLYN_CLIENT_ID", "app_sample"), env("TAQLYN_PUBLIC_KEY_ID", "pk_sample"), {
    ...(apiBaseUrl ? { apiBaseUrl } : {}),
    linkProcessingMode: "all",
    env: "sandbox",
  });
}

bootSdk();

const os: TaqlynOs =
  Platform.OS === "ios" || Platform.OS === "android" ? Platform.OS : "unknown";

const linking = createTaqlynLinking({
  prefixes: [
    "https://new-application-production.rutvik.qzz.io",
    "https://new-application-sandbox.rutvik.qzz.io",
    "https://demo-application-production.rutvik.qzz.io",
    "https://go.rutvik.qzz.io",
  ],
  scheme: "cenomimalls",
});

/** Skip Expo Metro handshake; treat short links + custom scheme as product deep links. */
function isProductDeepLink(url: string): boolean {
  if (!url || url.includes("expo-development-client")) return false;
  try {
    const u = new URL(url);
    if (u.protocol === "cenomimalls:") return true;
    const host = u.hostname.toLowerCase();
    if (host.endsWith("rutvik.qzz.io") || host === "mark-pr.riddhu.qzz.io") {
      return true;
    }
    if (u.pathname === "/home" || u.pathname.startsWith("/open")) return true;
  } catch {
    return url.startsWith("cenomimalls://");
  }
  return false;
}

export default function App() {
  const [tab, setTab] = useState<Tab>("malls");
  const [status, setStatus] = useState("boot");
  const [pending, setPending] = useState<DeferredLink | null>(null);
  const [href, setHref] = useState<string | null>(null);
  const [openedUrl, setOpenedUrl] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);

  const goHomeFromLink = useCallback((url: string) => {
    if (!isProductDeepLink(url)) return;
    setOpenedUrl(url);
    setTab("home");
    setStatus(`open-url:${url}`);
    whenReadyNavigate(() => {
      setReadyForNavigation(true);
    });
  }, []);

  useEffect(() => {
    // Platform-only SdkCore listener: iOS clipboard/UL, Android referrer/AL.
    const sub = observePlatformLinks((link) => {
      setPending(link);
      const mapped = mapDeferredLinkToHref(link);
      setHref(mapped);
      setTab("home");
      setStatus(`link:${link.matchType}:${link.linkId}`);
      whenReadyNavigate(() => {
        setReadyForNavigation(true);
      });
    }, os);

    void (async () => {
      setStatus(os === "ios" ? "resolving-clipboard" : "resolving-referrer");
      await resolveDeferred();
      setStatus("waiting-ready");
    })();

    const stopWarm = subscribeWarmLinks(Linking, (url) => {
      if (!linking.filter(url) && !isProductDeepLink(url)) return;
      goHomeFromLink(url);
    });

    return () => {
      sub.unsubscribe();
      stopWarm();
    };
  }, [goHomeFromLink]);

  return (
    <SafeAreaView style={styles.shell}>
      <View style={styles.body}>
        {tab === "home" ? (
          <HomeScreen
            status={status}
            href={href}
            openedUrl={openedUrl}
            pending={pending}
            shareUrl={shareUrl}
            onShare={async () => {
              try {
                const link = await createShareLink({
                  destinationPath: "/home",
                  params: { from: "share" },
                });
                setShareUrl(link.shortUrl);
                setStatus(`share:${link.code}`);
              } catch (err) {
                setStatus(`share-error:${String(err)}`);
              }
            }}
            onConsume={() => {
              if (!pending) return;
              consume(pending.linkId);
              setPending(null);
              setStatus("consumed");
            }}
          />
        ) : null}
        {tab === "malls" ? (
          <PlaceholderScreen
            title="Malls"
            subtitle="Browse malls. Open a Taqlyn short link to jump to Home."
          />
        ) : null}
        {tab === "account" ? (
          <PlaceholderScreen
            title="Account"
            subtitle="Profile placeholder."
          />
        ) : null}
      </View>

      <View style={styles.tabBar}>
        <TabButton label="Home" active={tab === "home"} onPress={() => setTab("home")} />
        <TabButton label="Malls" active={tab === "malls"} onPress={() => setTab("malls")} />
        <TabButton
          label="Account"
          active={tab === "account"}
          onPress={() => setTab("account")}
        />
      </View>
    </SafeAreaView>
  );
}

function HomeScreen({
  status,
  href,
  openedUrl,
  pending,
  shareUrl,
  onShare,
  onConsume,
}: {
  status: string;
  href: string | null;
  openedUrl: string | null;
  pending: DeferredLink | null;
  shareUrl: string | null;
  onShare: () => void;
  onConsume: () => void;
}) {
  return (
    <View style={styles.screen}>
      <Text style={styles.kicker}>Home</Text>
      <Text style={styles.title}>Cenomi Malls</Text>
      <Text style={styles.meta}>com.cenomi.mallsapp</Text>
      <View style={styles.card}>
        <Text style={styles.cardLabel}>Deep link</Text>
        <Text style={styles.cardValue}>{openedUrl ?? href ?? "None yet"}</Text>
        <Text style={styles.cardHint}>status: {status}</Text>
        {shareUrl ? (
          <Text style={styles.cardHint}>share: {shareUrl}</Text>
        ) : null}
        <Pressable style={styles.primaryBtn} onPress={onShare}>
          <Text style={styles.primaryBtnText}>Create share link</Text>
        </Pressable>
        {pending ? (
          <Pressable style={styles.primaryBtn} onPress={onConsume}>
            <Text style={styles.primaryBtnText}>Consume pending link</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

function PlaceholderScreen({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <View style={styles.screen}>
      <Text style={styles.kicker}>{title}</Text>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.meta}>{subtitle}</Text>
    </View>
  );
}

function TabButton({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.tabBtn} onPress={onPress}>
      <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{label}</Text>
      {active ? <View style={styles.tabDot} /> : <View style={styles.tabDotSpacer} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1, backgroundColor: "#F6F4F0" },
  body: { flex: 1 },
  screen: { flex: 1, paddingHorizontal: 24, paddingTop: 28, gap: 8 },
  kicker: { fontSize: 12, fontWeight: "600", color: "#8A6A3A", letterSpacing: 1 },
  title: { fontSize: 28, fontWeight: "700", color: "#1C1916" },
  meta: { fontSize: 15, color: "#6B645C", marginTop: 4 },
  card: {
    marginTop: 20,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    gap: 8,
  },
  cardLabel: { fontSize: 12, fontWeight: "600", color: "#8A6A3A" },
  cardValue: { fontSize: 14, color: "#1C1916" },
  cardHint: { fontSize: 12, color: "#8A837C" },
  primaryBtn: {
    marginTop: 8,
    backgroundColor: "#1C1916",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  primaryBtnText: { color: "#FFFFFF", fontWeight: "600" },
  tabBar: {
    flexDirection: "row",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#E6E1DA",
    backgroundColor: "#FFFFFF",
    paddingBottom: 10,
    paddingTop: 8,
  },
  tabBtn: { flex: 1, alignItems: "center", gap: 4 },
  tabLabel: { fontSize: 13, color: "#8A837C", fontWeight: "600" },
  tabLabelActive: { color: "#1C1916" },
  tabDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#C4A46A",
  },
  tabDotSpacer: { width: 6, height: 6 },
});
