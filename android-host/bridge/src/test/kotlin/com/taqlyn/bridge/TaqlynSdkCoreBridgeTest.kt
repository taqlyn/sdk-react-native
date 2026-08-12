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
 * Closes Phase 08 deferred/warm risk for the RN Android bridge:
 * fake Install Referrer + sandbox-shaped ResolveClient → SdkCore via bridge
 * (no Play Store / real device required for wrapper proof).
 */
@RunWith(RobolectricTestRunner::class)
class TaqlynSdkCoreBridgeTest {
    private val store = InMemoryKeyValueStore()
    private val incoming = IntentIncomingLink()

    @After
    fun tearDown() {
        TaqlynSdkCoreBridge.stopObserving()
        SdkCore.resetForTests()
    }

    @Test
    fun deferredResolve_sandboxPayload_readyGate_andConsume() =
        runTest {
            val link = sampleLink("lnk_sandbox")
            configureBridge(
                referrer = "click_id=clk_sandbox",
                resolve = { ResolveOutcome.Matched(link) },
            )

            val received = CopyOnWriteArrayList<WireDeferredLink>()
            TaqlynSdkCoreBridge.observeLinks { received.add(it) }

            val resolved = TaqlynSdkCoreBridge.resolveDeferred()
            assertThat(resolved?.linkId).isEqualTo("lnk_sandbox")
            assertThat(resolved?.matchType).isEqualTo("install_referrer")
            assertThat(resolved?.isDeferred).isTrue()
            assertThat(received).isEmpty()

            TaqlynSdkCoreBridge.setReadyForNavigation(true)
            withTimeout(2_000) {
                while (received.isEmpty()) {
                    kotlinx.coroutines.yield()
                }
            }
            assertThat(received).hasSize(1)
            assertThat(received[0].path).isEqualTo("/offer")
            assertThat(received[0].campaignJson).contains("utm_source")

            TaqlynSdkCoreBridge.consume("lnk_sandbox")
            assertThat(SdkCore.pendingForTests()).isNull()
        }

    @Test
    fun warmAppLink_deliveredWithoutReadyGate() =
        runTest {
            configureBridge(
                referrer = null,
                resolve = { error("warm must not resolve") },
            )

            val latch = CountDownLatch(1)
            val received = CopyOnWriteArrayList<WireDeferredLink>()
            TaqlynSdkCoreBridge.observeLinks {
                received.add(it)
                latch.countDown()
            }

            val uri = Uri.parse("https://links.example.com/product/9?linkId=warm_1")
            SdkCore.onIntent(Intent(Intent.ACTION_VIEW, uri))

            assertThat(latch.await(2, TimeUnit.SECONDS)).isTrue()
            assertThat(received).hasSize(1)
            assertThat(received[0].isDeferred).isFalse()
            assertThat(received[0].path).isEqualTo("/product/9")
        }

    @Test
    fun resolveOnce_secondCallNull() =
        runTest {
            configureBridge(
                referrer = "click_id=once",
                resolve = { ResolveOutcome.Matched(sampleLink("lnk_once")) },
            )
            assertThat(TaqlynSdkCoreBridge.resolveDeferred()?.linkId).isEqualTo("lnk_once")
            assertThat(TaqlynSdkCoreBridge.resolveDeferred()).isNull()
        }

    private fun configureBridge(
        referrer: String?,
        resolve: suspend (ResolveRequest) -> ResolveOutcome,
    ) {
        TaqlynSdkCoreBridge.configure(
            clientId = "app_test",
            publicKeyId = "pk_test",
            apiBaseUrl = "https://api.sandbox.example.com",
            linkProcessingMode = "all",
            env = "sandbox",
            context = null,
            installReferrer = InstallReferrer { referrer },
            resolveClient = ResolveClient { resolve(it) },
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
