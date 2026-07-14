//
//  SessionAttributesCollector.swift
//  Gekidou
//
// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
//

import Foundation
import Network
import NetworkExtension
import SystemConfiguration.CaptiveNetwork

struct NetworkSnapshot {
    let interfaceType: String
    let ipAddress: String
    let vpnActive: Bool
    let ssid: String
}

public class SessionAttributesCollector {
    public static let shared = SessionAttributesCollector()

    private let store = SessionAttributesStore.shared
    private var fqdnCache: [String: String] = [:]

    private let monitorQueue = DispatchQueue(label: "com.mattermost.sessionattributes.network")
    private let pathMonitor = NWPathMonitor()
    private var cachedInterfaceType = ""
    private var cachedSsid = ""
    private let ssidUnavailable: Bool

    private init() {
        ssidUnavailable = Bundle.main.bundlePath.hasSuffix(".appex") &&
            Bundle.main.bundleIdentifier?.contains("NotificationService") == true

        pathMonitor.pathUpdateHandler = { [weak self] path in
            guard let self else {
                return
            }
            if path.usesInterfaceType(.wifi) {
                self.cachedInterfaceType = "wifi"
            } else if path.usesInterfaceType(.cellular) {
                self.cachedInterfaceType = "cellular"
            } else if path.usesInterfaceType(.wiredEthernet) {
                self.cachedInterfaceType = "ethernet"
            } else if path.status == .unsatisfied {
                self.cachedInterfaceType = ""
            } else {
                self.cachedInterfaceType = "other"
            }

            if self.cachedInterfaceType == "wifi" {
                self.refreshSsid()
            } else {
                self.cachedSsid = ""
            }
        }
        pathMonitor.start(queue: monitorQueue)
    }

    func collect(_ name: String, serverUrl: String) -> String {
        if let stableValue = store.getStableValue(name), !stableValue.isEmpty {
            return stableValue
        }

        switch name {
        case SessionAttributesConstants.AttributeKey.clientIpAddress:
            return currentNetworkSnapshot().ipAddress
        case SessionAttributesConstants.AttributeKey.networkInterfaceType:
            return currentNetworkSnapshot().interfaceType
        case SessionAttributesConstants.AttributeKey.vpnActive:
            return currentNetworkSnapshot().vpnActive ? "true" : "false"
        case SessionAttributesConstants.AttributeKey.ssid:
            return currentNetworkSnapshot().ssid
        case SessionAttributesConstants.AttributeKey.mdmEnrolled:
            return isMdmEnrolled() ? "true" : "false"
        case SessionAttributesConstants.AttributeKey.serverFqdn:
            return getServerFqdn(serverUrl)
        default:
            return ""
        }
    }

    private func getServerFqdn(_ serverUrl: String) -> String {
        if let cached = fqdnCache[serverUrl] {
            return cached
        }
        guard let url = URL(string: serverUrl), let host = url.host, !host.isEmpty else {
            fqdnCache[serverUrl] = ""
            return ""
        }
        fqdnCache[serverUrl] = host
        return host
    }

    private func isMdmEnrolled() -> Bool {
        guard let managedConfig = UserDefaults.standard.dictionary(forKey: SessionAttributesConstants.managedConfigKey) else {
            return false
        }
        return isTruthyManagedFlag(managedConfig[SessionAttributesConstants.isDeviceManagedKey]) ||
            isTruthyManagedFlag(managedConfig[SessionAttributesConstants.isSupervisedKey])
    }

    private func isTruthyManagedFlag(_ value: Any?) -> Bool {
        guard let value else {
            return false
        }
        if let bool = value as? Bool {
            return bool
        }
        if let number = value as? NSNumber {
            return number.boolValue
        }
        if let string = value as? String {
            let normalized = string.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
            return normalized == "true" || normalized == "1" || normalized == "yes"
        }
        return false
    }

    func currentNetworkSnapshot() -> NetworkSnapshot {
        let vpnActive = hasVpnInterface()
        let ipAddress = resolveIpAddress()
        return monitorQueue.sync {
            let interfaceType = vpnActive ? "vpn" : cachedInterfaceType
            let ssid = interfaceType == "wifi" ? cachedSsid : ""
            return NetworkSnapshot(
                interfaceType: interfaceType,
                ipAddress: ipAddress,
                vpnActive: vpnActive,
                ssid: ssid
            )
        }
    }

    private func refreshSsid() {
        guard !ssidUnavailable else {
            cachedSsid = ""
            return
        }

        if #available(iOS 14.0, *) {
            NEHotspotNetwork.fetchCurrent { [weak self] network in
                guard let self else {
                    return
                }
                let ssid: String
                if let networkSSID = network?.ssid,
                   networkSSID != "Wi-Fi",
                   networkSSID != "WLAN" {
                    ssid = networkSSID
                } else {
                    ssid = ""
                }
                self.monitorQueue.async {
                    self.cachedSsid = ssid
                }
            }
            return
        }

        cachedSsid = resolveLegacySsid()
    }

    private func resolveLegacySsid() -> String {
        guard let interfaces = CNCopySupportedInterfaces() as? [String] else {
            return ""
        }
        for interface in interfaces {
            if let info = CNCopyCurrentNetworkInfo(interface as CFString) as? [String: AnyObject],
               let networkSSID = info[kCNNetworkInfoKeySSID as String] as? String,
               networkSSID != "Wi-Fi",
               networkSSID != "WLAN" {
                return networkSSID
            }
        }
        return ""
    }

    private func hasVpnInterface() -> Bool {
        var interfaces: UnsafeMutablePointer<ifaddrs>?
        guard getifaddrs(&interfaces) == 0, let first = interfaces else {
            return false
        }
        defer { freeifaddrs(interfaces) }

        var ptr = first
        while true {
            let name = String(cString: ptr.pointee.ifa_name)
            if name.hasPrefix("utun") || name.hasPrefix("ipsec") || name.hasPrefix("ppp") {
                return true
            }
            guard let next = ptr.pointee.ifa_next else {
                break
            }
            ptr = next
        }
        return false
    }

    private func resolveIpAddress() -> String {
        var address = ""
        var interfaces: UnsafeMutablePointer<ifaddrs>?
        guard getifaddrs(&interfaces) == 0, let first = interfaces else {
            return address
        }
        defer { freeifaddrs(interfaces) }

        var ptr = first
        while true {
            let interface = ptr.pointee
            if let ifaAddr = interface.ifa_addr, ifaAddr.pointee.sa_family == UInt8(AF_INET) {
                let name = String(cString: interface.ifa_name)
                if name == "en0" || name == "en1" {
                    var addr = ifaAddr.pointee
                    var buffer = [CChar](repeating: 0, count: Int(INET_ADDRSTRLEN))
                    inet_ntop(AF_INET, &addr, &buffer, socklen_t(INET_ADDRSTRLEN))
                    let ip = String(cString: buffer)
                    if ip != "0.0.0.0" {
                        address = ip
                    }
                }
            }
            guard let next = interface.ifa_next else {
                break
            }
            ptr = next
        }
        return address
    }
}
