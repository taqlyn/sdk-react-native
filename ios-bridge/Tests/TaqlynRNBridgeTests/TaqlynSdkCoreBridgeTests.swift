import Foundation
import TaqlynRNBridge
import TaqlynSDK
import XCTest

/// Closes Phase 08 deferred/warm risk for the RN iOS bridge:
/// fake pasteboard + sandbox-shaped ResolveClient → SdkCore (no real device).
final class TaqlynSdkCoreBridgeTests: XCTestCase {
    private var store: InMemoryKeyValueStore!
    private var incoming: ContinuationsIncomingLink!

    override func setUp() {
        super.setUp()
        store = InMemoryKeyValueStore()
        incoming = ContinuationsIncomingLink()
        TaqlynSdkCoreBridge.stopObserving()
        SdkCore.resetForTests()
    }

    override func tearDown() {
        TaqlynSdkCoreBridge.stopObserving()
        SdkCore.resetForTests()
        super.tearDown()
    }

    func testDeferredResolve_sandboxPayload_readyGate_andConsume() async {
        let link = sampleLink("lnk_sandbox")
        configure(
            pasteboard: FixedPasteboard(token: "tok_sandbox"),
            resolve: { _ in .matched(link) }
        )

        let box = DeliveryBox()
        let delivered = expectation(description: "deferred delivered")
        TaqlynSdkCoreBridge.observeLinks { wire in
            if wire.linkId == "lnk_sandbox" {
                box.mark(wire)
                delivered.fulfill()
            }
        }

        let resolved = await TaqlynSdkCoreBridge.resolveDeferred()
        XCTAssertEqual(resolved?.linkId, "lnk_sandbox")
        XCTAssertEqual(resolved?.matchType, "clipboard")
        XCTAssertEqual(resolved?.isDeferred, true)
        XCTAssertNil(box.value)

        TaqlynSdkCoreBridge.setReadyForNavigation(true)
        await fulfillment(of: [delivered], timeout: 2)
        XCTAssertEqual(box.value?.path, "/offer")
        XCTAssertTrue(box.value?.campaignJson.contains("utm_source") == true)

        TaqlynSdkCoreBridge.consume("lnk_sandbox")
        XCTAssertNil(SdkCore.pendingForTests())
    }

    func testWarmUniversalLink_deliveredWithoutReadyGate() async {
        configure(
            pasteboard: FixedPasteboard(token: nil),
            resolve: { _ in
                XCTFail("warm must not resolve")
                return .softFailure
            }
        )

        let delivered = expectation(description: "warm delivered")
        let box = DeliveryBox()
        TaqlynSdkCoreBridge.observeLinks { wire in
            if wire.linkId == "warm_1" {
                box.mark(wire)
                delivered.fulfill()
            }
        }

        TaqlynSdkCoreBridge.onOpenURL(
            URL(string: "https://links.example.com/product/9?linkId=warm_1")!
        )
        await fulfillment(of: [delivered], timeout: 2)
        XCTAssertEqual(box.value?.isDeferred, false)
        XCTAssertEqual(box.value?.path, "/product/9")
    }

    private func configure(
        pasteboard: PasteboardClient,
        resolve: @escaping @Sendable (ResolveRequest) async -> ResolveOutcome
    ) {
        TaqlynSdkCoreBridge.configure(
            clientId: "app_test",
            publicKeyId: "pk_test",
            linkProcessingMode: "all",
            env: "sandbox",
            pasteboard: pasteboard,
            resolveClient: ClosureResolveClient(resolve),
            store: store,
            incomingLink: incoming
        )
    }

    private func sampleLink(_ id: String) -> DeferredLink {
        DeferredLink(
            url: "https://app.example.com/offer?id=1",
            path: "/offer",
            params: ["id": "1"],
            linkId: id,
            matchType: .clipboard,
            isDeferred: true,
            campaign: Campaign(["utm_source": "sandbox"])
        )
    }
}

private final class DeliveryBox: @unchecked Sendable {
    private let lock = NSLock()
    private var _value: WireDeferredLink?
    var value: WireDeferredLink? {
        lock.lock(); defer { lock.unlock() }
        return _value
    }

    func mark(_ wire: WireDeferredLink) {
        lock.lock()
        _value = wire
        lock.unlock()
    }
}
