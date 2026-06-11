// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import NetInfo, {NetInfoStateType, type NetInfoState} from '@react-native-community/netinfo';
import {nativeApplicationVersion, nativeBuildVersion} from 'expo-application';
import {isRootedExperimentalAsync, osVersion} from 'expo-device';
import {Platform} from 'react-native';

import {getDeviceToken} from '@queries/app/global';
import {getUrlDomain} from '@utils/url';

export class SessionAttributeCollector {
    getOSVersion() {
        return osVersion || '';
    }

    getClientVersion() {
        if (!nativeApplicationVersion) {
            return '';
        }
        return nativeBuildVersion ? `${nativeApplicationVersion}+${nativeBuildVersion}` : nativeApplicationVersion;
    }

    getServerFQDN(serverUrl: string) {
        return getUrlDomain(serverUrl);
    }

    async getJailbreakDetected() {
        const isRooted = await isRootedExperimentalAsync();
        return isRooted ? 'true' : 'false';
    }

    async getClientDeviceId() {
        return getDeviceToken();
    }

    async getNetworkInterfaceType() {
        const state = await NetInfo.fetch();
        return this.mapNetInfoType(state);
    }

    async getClientIPAddress() {
        const state = await NetInfo.fetch();
        return this.extractIpAddress(state);
    }

    async getIsVpnActive() {
        const state = await NetInfo.fetch();
        return state.type === NetInfoStateType.vpn ? 'true' : 'false';
    }

    getOSPlatform() {
        return Platform.OS;
    }

    async getSSID(): Promise<string> {
        // Native SSID collection pending rnutils bridge.
        return '';
    }

    async getMDMEnrolled(): Promise<string> {
        // Native MDM enrollment check pending rnutils bridge.
        return '';
    }

    protected mapNetInfoType(state: NetInfoState) {
        switch (state.type) {
            case NetInfoStateType.wifi:
                return 'wifi';
            case NetInfoStateType.cellular:
                return 'cellular';
            case NetInfoStateType.ethernet:
                return 'ethernet';
            case NetInfoStateType.vpn:
                return 'vpn';
            case NetInfoStateType.none:
            case NetInfoStateType.unknown:
                return '';
            default:
                return 'other';
        }
    }

    protected extractIpAddress(state: NetInfoState) {
        const details = state.details;
        if (details && 'ipAddress' in details && typeof details.ipAddress === 'string' && details.ipAddress.length) {
            return details.ipAddress;
        }
        return '';
    }
}

const sessionAttributeCollector = new SessionAttributeCollector();
export default sessionAttributeCollector;
