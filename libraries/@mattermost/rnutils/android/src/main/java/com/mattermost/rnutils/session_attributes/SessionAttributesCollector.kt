package com.mattermost.rnutils.session_attributes

import android.app.admin.DevicePolicyManager
import android.content.Context
import android.content.RestrictionsManager
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.net.wifi.WifiManager
import android.os.Build
import java.net.Inet4Address
import java.net.NetworkInterface
import java.util.concurrent.ConcurrentHashMap

data class NetworkSnapshot(
    val interfaceType: String,
    val ipAddress: String,
    val vpnActive: Boolean,
    val ssid: String,
)

class SessionAttributesCollector(
    private val context: Context,
    private val store: SessionAttributesStore,
) {
    private val fqdnCache = ConcurrentHashMap<String, String>()

    fun collect(name: String, serverUrl: String): String {
        store.getStableValue(name)?.let { return it }

        val snapshot = currentNetworkSnapshot()
        return when (name) {
            SessionAttributesConstants.AttributeKey.CLIENT_IP_ADDRESS -> snapshot.ipAddress
            SessionAttributesConstants.AttributeKey.NETWORK_INTERFACE_TYPE -> snapshot.interfaceType
            SessionAttributesConstants.AttributeKey.VPN_ACTIVE -> if (snapshot.vpnActive) "true" else "false"
            SessionAttributesConstants.AttributeKey.SSID -> snapshot.ssid
            SessionAttributesConstants.AttributeKey.MDM_ENROLLED -> if (isMdmEnrolled()) "true" else "false"
            SessionAttributesConstants.AttributeKey.SERVER_FQDN -> getServerFqdn(serverUrl)
            else -> ""
        }
    }

    private fun getServerFqdn(serverUrl: String): String {
        return fqdnCache.computeIfAbsent(serverUrl) { url ->
            try {
                android.net.Uri.parse(url).host ?: ""
            } catch (_: Exception) {
                ""
            }
        }
    }

    private fun isMdmEnrolled(): Boolean {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            val devicePolicyManager = context.getSystemService(Context.DEVICE_POLICY_SERVICE) as? DevicePolicyManager
            if (devicePolicyManager?.isOrganizationOwnedDeviceWithManagedProfile == true) {
                return true
            }
        }

        val restrictionsManager = context.getSystemService(Context.RESTRICTIONS_SERVICE) as? RestrictionsManager
        val restrictions = restrictionsManager?.applicationRestrictions
        if (restrictions != null) {
            if (isTruthyManagedFlag(restrictions.get(SessionAttributesConstants.IS_DEVICE_MANAGED_KEY)) ||
                isTruthyManagedFlag(restrictions.get(SessionAttributesConstants.IS_SUPERVISED_KEY))
            ) {
                return true
            }
        }
        return false
    }

    private fun isTruthyManagedFlag(value: Any?): Boolean {
        return when (value) {
            is Boolean -> value
            is Int -> value != 0
            is String -> {
                val normalized = value.trim().lowercase()
                normalized == "true" || normalized == "1" || normalized == "yes"
            }
            else -> false
        }
    }

    fun currentNetworkSnapshot(): NetworkSnapshot {
        val connectivityManager = context.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
        val activeNetwork = connectivityManager.activeNetwork
        val capabilities = activeNetwork?.let { connectivityManager.getNetworkCapabilities(it) }

        val vpnActive = capabilities?.hasTransport(NetworkCapabilities.TRANSPORT_VPN) == true
        val interfaceType = when {
            vpnActive -> "vpn"
            capabilities?.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) == true -> "wifi"
            capabilities?.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR) == true -> "cellular"
            capabilities?.hasTransport(NetworkCapabilities.TRANSPORT_ETHERNET) == true -> "ethernet"
            activeNetwork == null -> ""
            else -> "other"
        }

        val ipAddress = resolveIpAddress()
        val ssid = if (interfaceType == "wifi") resolveSsid() else ""

        return NetworkSnapshot(interfaceType, ipAddress, vpnActive, ssid)
    }

    private fun resolveIpAddress(): String {
        return try {
            val interfaces = NetworkInterface.getNetworkInterfaces()
            while (interfaces.hasMoreElements()) {
                val networkInterface = interfaces.nextElement()
                val addresses = networkInterface.inetAddresses
                while (addresses.hasMoreElements()) {
                    val address = addresses.nextElement()
                    if (!address.isLoopbackAddress && address is Inet4Address) {
                        return address.hostAddress ?: ""
                    }
                }
            }
            ""
        } catch (_: Exception) {
            ""
        }
    }

    @Suppress("DEPRECATION")
    private fun resolveSsid(): String {
        return try {
            val wifiManager = context.applicationContext.getSystemService(Context.WIFI_SERVICE) as WifiManager
            val info = wifiManager.connectionInfo
            val ssid = info?.ssid?.replace("\"", "") ?: ""
            if (ssid == "<unknown ssid>" || ssid == "0x" || ssid == "Wi-Fi" || ssid == "WLAN") {
                ""
            } else {
                ssid
            }
        } catch (_: Exception) {
            ""
        }
    }
}
