package com.mattermost.wireguard

import com.wireguard.crypto.KeyPair
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertThrows
import org.junit.Assert.assertTrue
import org.junit.Test
import java.net.InetAddress

class WireGuardConfigParserTest {
    private val applicationId = "com.encma.hxmain"

    private fun validConfig(
        allowedIps: String = "10.20.0.0/24",
        interfaceExtra: String = "",
    ): String {
        val interfaceKey = KeyPair()
        val peerKey = KeyPair()
        return """
            [Interface]
            PrivateKey = ${interfaceKey.privateKey.toBase64()}
            Address = 10.20.0.2/32
            DNS = 10.20.0.1
            $interfaceExtra

            [Peer]
            PublicKey = ${peerKey.publicKey.toBase64()}
            Endpoint = 192.0.2.10:51820
            AllowedIPs = $allowedIps
            PersistentKeepalive = 25
        """.trimIndent()
    }

    @Test
    fun parseAppliesOnlyTheCurrentApplicationToTheTunnel() {
        val config = WireGuardConfigParser.parse(validConfig(), applicationId)

        assertEquals(setOf(applicationId), config.`interface`.includedApplications)
        assertTrue(config.`interface`.excludedApplications.isEmpty())
        assertEquals(1, config.peers.size)
        assertEquals(25, config.peers.first().persistentKeepalive.get())
    }

    @Test
    fun parseRejectsImportedApplicationRoutingDirectives() {
        val error = assertThrows(WireGuardConfigException::class.java) {
            WireGuardConfigParser.parse(
                validConfig(interfaceExtra = "IncludedApplications = com.example.other"),
                applicationId,
            )
        }

        assertTrue(error.message!!.contains("cannot be imported"))
    }

    @Test
    fun parseRequiresAnInterfaceAddress() {
        val configWithoutAddress = validConfig().lines().filterNot { it.startsWith("Address =") }.joinToString("\n")

        val error = assertThrows(WireGuardConfigException::class.java) {
            WireGuardConfigParser.parse(configWithoutAddress, applicationId)
        }

        assertTrue(error.message!!.contains("Address"))
    }

    @Test
    fun parseDoesNotEchoInvalidKeyMaterialInErrors() {
        val invalidSecret = "not-a-valid-private-key"
        val invalidConfig = validConfig().replace(Regex("PrivateKey = .*"), "PrivateKey = $invalidSecret")

        val error = assertThrows(WireGuardConfigException::class.java) {
            WireGuardConfigParser.parse(invalidConfig, applicationId)
        }

        assertFalse(error.message!!.contains(invalidSecret))
        assertTrue(error.message!!.contains("PrivateKey"))
    }

    @Test
    fun parsePreservesDnsSearchDomainsWithoutDnsServers() {
        val config = WireGuardConfigParser.parse(
            validConfig().replace("DNS = 10.20.0.1", "DNS = corp.internal"),
            applicationId,
        )

        assertTrue(config.`interface`.dnsServers.isEmpty())
        assertEquals(setOf("corp.internal"), config.`interface`.dnsSearchDomains)
        assertEquals(setOf(applicationId), config.`interface`.includedApplications)
    }

    @Test
    fun probeAddressesUsesAnAllowedAddressForSplitTunneling() {
        val config = WireGuardConfigParser.parse(validConfig(), applicationId)

        assertEquals(listOf(InetAddress.getByName("10.20.0.0")), WireGuardConfigParser.probeAddresses(config))
    }

    @Test
    fun probeAddressesUsesTheResolvedEndpointForADefaultRoute() {
        val config = WireGuardConfigParser.parse(validConfig(allowedIps = "0.0.0.0/0"), applicationId)

        assertEquals(listOf(InetAddress.getByName("192.0.2.10")), WireGuardConfigParser.probeAddresses(config))
    }
}
