package com.mattermost.wireguard

import com.wireguard.config.BadConfigException
import com.wireguard.config.Config
import com.wireguard.config.Interface
import java.io.BufferedReader
import java.io.StringReader
import java.net.InetAddress

/** A configuration error that is safe to show without echoing keys or configuration text. */
class WireGuardConfigException(message: String) : Exception(message)

/**
 * Validates wg-quick configurations with WireGuard's own parser and applies the per-app policy.
 * No method in this object logs or returns secret configuration material.
 */
object WireGuardConfigParser {
    const val MAX_CONFIG_BYTES = 64 * 1024

    @Throws(WireGuardConfigException::class)
    fun parse(rawConfig: String, applicationId: String): Config {
        if (rawConfig.isBlank()) {
            throw WireGuardConfigException("The WireGuard configuration is empty.")
        }
        if (rawConfig.toByteArray(Charsets.UTF_8).size > MAX_CONFIG_BYTES) {
            throw WireGuardConfigException("The WireGuard configuration must be no larger than 64 KB.")
        }

        val parsed = parseWithWireGuard(rawConfig)
        validateRequiredSettings(parsed)

        if (parsed.`interface`.includedApplications.isNotEmpty() ||
            parsed.`interface`.excludedApplications.isNotEmpty()
        ) {
            throw WireGuardConfigException(
                "IncludedApplications and ExcludedApplications are managed by the app and cannot be imported.",
            )
        }

        val perAppConfig = applyPerAppPolicy(parsed, applicationId)
        if (perAppConfig.`interface`.includedApplications != setOf(applicationId) ||
            perAppConfig.`interface`.excludedApplications.isNotEmpty()
        ) {
            throw WireGuardConfigException("The per-application VPN policy could not be applied.")
        }
        return perAppConfig
    }

    @Throws(WireGuardConfigException::class)
    private fun applyPerAppPolicy(config: Config, applicationId: String): Config {
        try {
            val source = config.`interface`
            val interfaceBuilder = Interface.Builder()
                .addAddresses(source.addresses)
                .addDnsServers(source.dnsServers)
                .addDnsSearchDomains(source.dnsSearchDomains)
                .includeApplication(applicationId)
                .setKeyPair(source.keyPair)
            source.listenPort.ifPresent { interfaceBuilder.setListenPort(it) }
            source.mtu.ifPresent { interfaceBuilder.setMtu(it) }

            // GoBackend consumes IncludedApplications with VpnService.Builder.addAllowedApplication().
            // Copy with the official builders so no setting is lost through string serialization.
            return Config.Builder()
                .setInterface(interfaceBuilder.build())
                .addPeers(config.peers)
                .build()
        } catch (error: BadConfigException) {
            throw WireGuardConfigException("The per-application VPN policy could not be applied.")
        }
    }

    @Throws(WireGuardConfigException::class)
    private fun parseWithWireGuard(rawConfig: String): Config {
        try {
            return Config.parse(BufferedReader(StringReader(rawConfig)))
        } catch (error: BadConfigException) {
            val location = error.location.name.ifEmpty { error.section.name }
            val reason = error.reason.name.lowercase().replace('_', ' ')
            throw WireGuardConfigException("Invalid WireGuard $location: $reason.")
        } catch (error: IllegalArgumentException) {
            throw WireGuardConfigException("The WireGuard configuration is incomplete or invalid.")
        } catch (error: Exception) {
            throw WireGuardConfigException("The WireGuard configuration could not be parsed as UTF-8 text.")
        }
    }

    @Throws(WireGuardConfigException::class)
    private fun validateRequiredSettings(config: Config) {
        if (config.`interface`.addresses.isEmpty()) {
            throw WireGuardConfigException("Invalid WireGuard Address: at least one interface address is required.")
        }
        if (config.peers.isEmpty()) {
            throw WireGuardConfigException("Invalid WireGuard Peer: at least one peer is required.")
        }
        if (config.peers.any { it.allowedIps.isEmpty() }) {
            throw WireGuardConfigException("Invalid WireGuard AllowedIPs: every peer must route at least one address range.")
        }
        if (config.peers.none { it.endpoint.isPresent }) {
            throw WireGuardConfigException("Invalid WireGuard Endpoint: at least one peer endpoint is required.")
        }
    }

    /**
     * Selects one small UDP probe destination per peer. The probe only causes WireGuard to
     * negotiate a handshake; it does not send credentials or application data.
     */
    fun probeAddresses(config: Config): List<InetAddress> {
        val targets = linkedSetOf<InetAddress>()
        config.peers.forEach { peer ->
            val allowedAddress = peer.allowedIps.firstOrNull { it.mask != 0 }?.address
            val endpointAddress = if (allowedAddress == null) {
                peer.endpoint.orElse(null)?.resolved?.orElse(null)?.let { endpoint ->
                    InetAddress.getByName(endpoint.host)
                }
            } else {
                null
            }
            (allowedAddress ?: endpointAddress)?.let(targets::add)
        }
        return targets.toList()
    }
}
