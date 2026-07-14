package com.mattermost.rnutils.session_attributes

object SessionAttributesConstants {
    const val HEADER_NAME = "X-MM-Session-Attributes"
    const val STORE_PREFIX = "sa_"
    const val PREFS_NAME = "session_attributes"
    const val STABLE_VALUES_KEY = "stable_values"
    const val IS_DEVICE_MANAGED_KEY = "isDeviceManaged"
    const val IS_SUPERVISED_KEY = "isSupervised"

    object AttributeKey {
        const val VPN_ACTIVE = "vpn_active"
        const val CLIENT_DEVICE_ID = "client_device_id"
        const val CLIENT_IP_ADDRESS = "client_ip_address"
        const val CLIENT_VERSION = "client_version"
        const val JAILBREAK_DETECTED = "jailbreak_detected"
        const val MDM_ENROLLED = "mdm_enrolled"
        const val NETWORK_INTERFACE_TYPE = "network_interface_type"
        const val OS_PLATFORM = "os_platform"
        const val OS_VERSION = "os_version"
        const val SERVER_FQDN = "server_fqdn"
        const val SSID = "ssid"
    }
}
