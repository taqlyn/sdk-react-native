package com.taqlyn.bridge

import android.content.Context
import com.taqlyn.sdk.Campaign
import com.taqlyn.sdk.DeferredLink
import com.taqlyn.sdk.LinkProcessingMode
import com.taqlyn.sdk.SdkCore
import com.taqlyn.sdk.SdkOptions
import com.taqlyn.sdk.adapters.IncomingLink
import com.taqlyn.sdk.adapters.InstallReferrer
import com.taqlyn.sdk.adapters.KeyValueStore
import com.taqlyn.sdk.adapters.ResolveClient
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.launchIn
import kotlinx.coroutines.flow.onEach

/**
 * Nitro-free Android bridge over [SdkCore].
 *
 * Hybrid Objects / Flutter plugins call this — matching stays in SdkCore.
 * Wire shape mirrors Nitrogen `DeferredLinkPayload` / sdk-contract.
 */
data class WireDeferredLink(
    val url: String,
    val path: String,
    val params: Map<String, String>,
    val linkId: String,
    val matchType: String,
    val isDeferred: Boolean,
    val campaignJson: String,
)

object TaqlynSdkCoreBridge {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main.immediate)
    private var observeJob: Job? = null

    fun configure(
        clientId: String,
        publicKeyId: String,
        apiBaseUrl: String,
        linkProcessingMode: String,
        env: String,
        context: Context? = null,
        installReferrer: InstallReferrer? = null,
        resolveClient: ResolveClient? = null,
        store: KeyValueStore? = null,
        incomingLink: IncomingLink? = null,
    ) {
        SdkCore.configure(
            clientId = clientId,
            publicKeyId = publicKeyId,
            options =
                SdkOptions(
                    apiBaseUrl = apiBaseUrl,
                    linkProcessingMode = parseMode(linkProcessingMode),
                    env = env.takeIf { it.isNotBlank() },
                ),
            context = context,
            installReferrer = installReferrer,
            resolveClient = resolveClient,
            store = store,
            incomingLink = incomingLink,
        )
    }

    suspend fun resolveDeferred(): WireDeferredLink? =
        SdkCore.resolveDeferred()?.toWire()

    fun observeLinks(onLink: (WireDeferredLink) -> Unit) {
        observeJob?.cancel()
        observeJob =
            SdkCore
                .observeLinks()
                .onEach { onLink(it.toWire()) }
                .launchIn(scope)
    }

    fun stopObserving() {
        observeJob?.cancel()
        observeJob = null
    }

    fun consume(linkId: String) {
        SdkCore.consume(linkId)
    }

    fun setReadyForNavigation(ready: Boolean) {
        SdkCore.setReadyForNavigation(ready)
    }

    fun parseMode(raw: String): LinkProcessingMode =
        when (raw) {
            "web-only", "webOnly", "WEB_ONLY" -> LinkProcessingMode.WEB_ONLY
            "deferred-only", "deferredOnly", "DEFERRED_ONLY" -> LinkProcessingMode.DEFERRED_ONLY
            else -> LinkProcessingMode.ALL
        }

    fun DeferredLink.toWire(): WireDeferredLink =
        WireDeferredLink(
            url = url,
            path = path,
            params = params,
            linkId = linkId,
            matchType = matchType.toWire(),
            isDeferred = isDeferred,
            campaignJson = campaign.toCampaignJson(),
        )

    private fun Campaign?.toCampaignJson(): String {
        if (this == null || values.isEmpty()) return ""
        return values.entries.joinToString(
            prefix = "{",
            postfix = "}",
            separator = ",",
        ) { (k, v) ->
            "\"${k.replace("\"", "\\\"")}\":\"${v.replace("\"", "\\\"")}\""
        }
    }
}
