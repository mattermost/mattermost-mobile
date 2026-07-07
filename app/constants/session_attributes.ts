// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

export const SESSION_ATTRIBUTES_OBJECT_TYPE = 'session';
export const SESSION_ATTRIBUTES_PLATFORM_MOBILE = 'mobile';
export const AttributeKey = {
    vpnActive: 'vpn_active',
    clientDeviceId: 'client_device_id',
    clientIpAddress: 'client_ip_address',
    clientVersion: 'client_version',
    jailbreakDetected: 'jailbreak_detected',
    mdmEnrolled: 'mdm_enrolled',
    networkInterfaceType: 'network_interface_type',
    osPlatform: 'os_platform',
    osVersion: 'os_version',
    serverFqdn: 'server_fqdn',
    ssid: 'ssid',
} as const;
