package com.taqlyn.bridge

import android.content.Intent
import android.net.Uri
import com.google.common.truth.Truth.assertThat
import com.taqlyn.sdk.Campaign
import com.taqlyn.sdk.DeferredLink
import com.taqlyn.sdk.MatchType
import com.taqlyn.sdk.SdkCore
import com.taqlyn.sdk.adapters.InMemoryKeyValueStore
import com.taqlyn.sdk.adapters.InstallReferrer
import com.taqlyn.sdk.adapters.IntentIncomingLink
import com.taqlyn.sdk.adapters.ResolveClient
import com.taqlyn.sdk.adapters.ResolveOutcome
import com.taqlyn.sdk.adapters.ResolveRequest
import kotlinx.coroutines.async
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.withTimeout
import org.junit.After
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import java.util.concurrent.CopyOnWriteArrayList
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit

/**
 * Closes Phase 08 risk: RN Android bridge deferred resolve against sandbox-shaped
 * resolve client (fake Install Referrer) + ready-gate + warm AL — no Play Store device.
 */
@RunWith(RobolectricTestRunner::class)
class TaqlynSdkCoreBridgeTest {
    private val store = InMemoryKeyValueStore()
    private val incoming = IntentIncomingLink()
    private val bridge = TaqlynSdkCoreBridge()

    @After
    fun tearDown() {
        bridge.stopObserving()
        SdkCore.resetForTests()
    }

    @Test
    fun deferredResolve_sandboxShapedPayload_viaFakeReferrer() =
        runTest {
            val link = sampleLink("lnk_sandbox")
            configureBridge(
                referrer = "click_id=clk_sandbox",
                resolve = { req ->
                    assertThat(req.apiBaseUrl).isEqualTo("https://api.taqlyn.com")
                    assertThat(req.env).isEqualTo("sandbox")
                    ResolveOutcome.Matched(link)
                },
            )

            val payload = bridge.resolveDeferred()
            assertThat(payload).isNotNull()
            assertThat(payload!!.linkId).isEqualTo("lnk_sandbox")
            assertThat(payload.path).toEqual("/offer")
            assertThat(payload.matchType).isEqualTo("install_referrer")
            assertThat(payload.isDeferred).isTrue()
            assertThat(payload.campaignJson).contains("utm_source")

            assertThat(bridge.resolveDeferred()).isNull()
        }

    @Test
    fun readyGate_holdsUntilSetReadyForNavigation() =
        runTest {
            val link = sampleLink("lnk_ready")
            configureBridge(
                referrer = "click_id=clk_ready",
                resolve = { ResolveOutcome.Matched(link) },
            )

            val received = CopyOnWriteArrayList<TaqlynSdkCoreBridge.LinkPayload>()
            val latch = CountDownLatch(1)
            bridge.observeLinks {
                received.add(it)
                if (it.linkId == "lnk_ready") latch.countDown()
            }

            assertThat(bridge.resolveDeferred()?.linkId).isEqualTo("lnk_ready")
            assertThat(received).isEmpty()

            bridge.setReadyForNavigation(true)
            assertThat(latch.await(2, TimeUnit.SECONDS)).isTrue()
            assertThat(received).hasSize(1)

            bridge.consume("lnk_ready")
            assertThat(SdkCore.pendingForTests()).isNull()
        }

    @Test
    fun warmAppLink_deliveredViaObserveWithoutReadyGate() =
        runTest {
            configureBridge(
                referrer = null,
                resolve = { error("warm must not resolve") },
            )

            val received = CopyOnWriteArrayList<TaqlynSdkCoreBridge.LinkPayload>()
            val latch = CountDownLatch(1)
            bridge.observeLinks {
                received.add(it)
                if (it.linkId == "lnk_warm") latch.countDown()
            }

            val uri = Uri.parse("https://go.example.com/product/9?linkId=lnk_warm")
            bridge.onIntent(Intent(Intent.ACTION_VIEW, uri))

            assertThat(latch.await(2, TimeUnit.SECONDS)).isTrue()
            assertThat(received.single().isDeferred).isFalse()
            assertThat(received.single().path).isEqualTo("/product/9")
            assertThat(received.single().matchType).isEqualTo("none")
        }

    private fun configureBridge(
        referrer: String?,
        resolve: suspend (ResolveRequest) -> ResolveOutcome,
    ) {
        bridge.configure(
            clientId = "app_test",
            publicKeyId = "pk_test",
            linkProcessingMode = "all",
            env = "sandbox",
            context = null,
            installReferrer = InstallReferrer { referrer },
            resolveClient = ResolveClient { request -> resolve(request) },
            store = store,
            incomingLink = incoming,
        )
    }

    private fun sampleLink(id: String) =
        DeferredLink(
            url = "https://app.example.com/offer?id=1",
            path = "/offer",
            params = mapOf("id" to "1"),
            linkId = id,
            matchType = MatchType.INSTALL_REFERRER,
            isDeferred = true,
            campaign = Campaign(mapOf("utm_source" to "sandbox")),
        )
}

// Truth helper — keep call sites readable
private fun <T> com.google.common.truth.Subject.toEqual(expected: T) {
    @Suppress("UNCHECKED_CAST")
    (this as com.google.common.truth.Subject).isEqualTo(expected)
}
