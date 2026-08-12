import Foundation
import TaqlynSDK

/// Nitro-free wire payload (mirrors Nitrogen `DeferredLinkPayload` / sdk-contract).
public struct WireDeferredLink: Equatable, Sendable {
    public var url: String
    public var path: String
    public var params: [String: String]
    public var linkId: String
    public var matchType: String
    public var isDeferred: Bool
    public var campaignJson: String

    public init(
        url: String,
        path: String,
        params: [String: String],
        linkId: String,
        matchType: String,
        isDeferred: Bool,
        campaignJson: String
    ) {
        self.url = url
        self.path = path
        self.params = params
        self.linkId = linkId
        self.matchType = matchType
        self.isDeferred = isDeferred
        self.campaignJson = campaignJson
    }
}

/// Nitro-free bridge over `SdkCore` — used by HybridTaqlynSdk and unit tests.
public enum TaqlynSdkCoreBridge {
    private static let lock = NSLock()
    private static var observeTask: Task<Void, Never>?

    public static func configure(
        clientId: String,
        publicKeyId: String,
        apiBaseUrl: String,
        linkProcessingMode: String,
        env: String,
        pasteboard: PasteboardClient? = nil,
        appClip: AppClipBridge? = nil,
        resolveClient: ResolveClient? = nil,
        store: KeyValueStore? = nil,
        incomingLink: IncomingLink? = nil
    ) {
        let mode: LinkProcessingMode
        switch linkProcessingMode {
        case "web-only", "webOnly", "WEB_ONLY": mode = .webOnly
        case "deferred-only", "deferredOnly", "DEFERRED_ONLY": mode = .deferredOnly
        default: mode = .all
        }
        SdkCore.configure(
            clientId: clientId,
            publicKeyId: publicKeyId,
            options: SdkOptions(
                apiBaseUrl: apiBaseUrl,
                linkProcessingMode: mode,
                env: env.isEmpty ? nil : env
            ),
            pasteboard: pasteboard,
            appClip: appClip,
            resolveClient: resolveClient,
            store: store,
            incomingLink: incomingLink
        )
    }

    public static func resolveDeferred() async -> WireDeferredLink? {
        await SdkCore.resolveDeferred().map(toWire)
    }

    public static func observeLinks(_ onLink: @escaping @Sendable (WireDeferredLink) -> Void) {
        lock.lock()
        observeTask?.cancel()
        observeTask = Task {
            for await link in SdkCore.observeLinks() {
                if Task.isCancelled { break }
                onLink(toWire(link))
            }
        }
        lock.unlock()
    }

    public static func stopObserving() {
        lock.lock()
        observeTask?.cancel()
        observeTask = nil
        lock.unlock()
    }

    public static func consume(_ linkId: String) {
        SdkCore.consume(linkId)
    }

    public static func setReadyForNavigation(_ ready: Bool) {
        SdkCore.setReadyForNavigation(ready)
    }

    public static func onOpenURL(_ url: URL) {
        SdkCore.onOpenURL(url)
    }

    public static func toWire(_ link: DeferredLink) -> WireDeferredLink {
        let campaignJson: String
        if let campaign = link.campaign, !campaign.values.isEmpty,
           let data = try? JSONSerialization.data(withJSONObject: campaign.values),
           let s = String(data: data, encoding: .utf8) {
            campaignJson = s
        } else {
            campaignJson = ""
        }
        return WireDeferredLink(
            url: link.url,
            path: link.path,
            params: link.params,
            linkId: link.linkId,
            matchType: link.matchType.wireValue,
            isDeferred: link.isDeferred,
            campaignJson: campaignJson
        )
    }
}
