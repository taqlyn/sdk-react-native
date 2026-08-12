package com.taqlyn.bridge

import android.content.Context
import android.content.Intent
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
 * Nitro-free Android bridge → [SdkCore].
 *
 * Used by the RN Nitro Hybrid and unit-tested without React Native / Nitrogen.
 * Feature / JS code never imports this type — only the Hybrid adapter does.
 */
class TaqlynSdkCoreBridge(
    private val scope: CoroutineScope =
        CoroutineScope(SupervisorJob() + Dispatchers.Main.immediate),
) {
    private var observeJob: Job? = null

    /** Wire-shape payload for JS / Nitro (mirrors DeferredLinkPayload). */
    data class LinkPayload(
        val url: String,
        val path: String,
        val params: Map<String, String>,
        val linkId: String,
        val matchType: String,
        val isDeferred: Boolean,
        val campaignJson: String,
    )

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

    suspend fun resolveDeferred(): LinkPayload? =
        SdkCore.resolveDeferred()?.toPayload()

    fun observeLinks(listener: (LinkPayload) -> Unit) {
        observeJob?.cancel()
        observeJob =
            SdkCore
                .observeLinks()
                .onEach { listener(it.toPayload()) }
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

    fun onIntent(intent: Intent?) {
        SdkCore.onIntent(intent)
    }

    companion object {
        fun parseMode(raw: String): LinkProcessingMode =
            when (raw) {
                "web-only" -> LinkProcessingMode.WEB_ONLY
                "deferred-only" -> LinkProcessingMode.DEFERRED_ONLY
                else -> LinkProcessingMode.ALL
            }

        fun DeferredLink.toPayload(): LinkPayload {
            val campaignJson =
                if (campaign == null || campaign!!.values.isEmpty()) {
                    ""
                } else {
                    campaign!!.values.entries.joinToString(
                        prefix = "{",
                        postfix = "}",
                        separator = ",",
                    ) { (k, v) ->
                        "\"${k.replace("\"", "\\\"")}\":\"${v.replace("\"", "\\\"")}\""
                    }
                }
            return LinkPayload(
                url = url,
                path = path,
                params = HashMap(params),
                linkId = linkId,
                matchType = matchType.toWire(),
                isDeferred = isDeferred,
                campaignJson = campaignJson,
            )
        }
    }
}
