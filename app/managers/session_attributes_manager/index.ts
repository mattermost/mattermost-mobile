// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import NetInfo, {NetInfoStateType, type NetInfoState, type NetInfoSubscription} from '@react-native-community/netinfo';
import base64 from 'base-64';
import {nativeApplicationVersion, nativeBuildVersion} from 'expo-application';
import {isRootedExperimentalAsync, osVersion} from 'expo-device';
import {Platform} from 'react-native';

import {fetchSessionAttributesManifest} from '@actions/remote/session_attributes';
import {License} from '@constants';
import {AttributeKey} from '@constants/session_attributes';
import DatabaseManager from '@database/manager';
import {getDeviceToken} from '@queries/app/global';
import {getConfig, getLicense} from '@queries/servers/system';
import {getFullErrorMessage} from '@utils/errors';
import {isMinimumLicenseTier} from '@utils/helpers';
import {logDebug, logError, logWarning} from '@utils/log';
import {getUrlDomain} from '@utils/url';

type ServerState = {
    manifest: SAField[];
    lastSentAt: Map<string, number>;
};

export class SessionAttributesManagerSingleton {
    private servers: Map<string, ServerState> = new Map();
    private netInfoState?: NetInfoState;
    private netInfoListener?: NetInfoSubscription;
    private jailbroken = false;
    private deviceToken = '';
    private fqdnCache = new Map<string, string>();

    refreshManifest = async (serverUrl: string): Promise<void> => {
        try {
            const database = DatabaseManager.serverDatabases[serverUrl]?.database;
            if (!database) {
                this.servers.delete(serverUrl);
                return;
            }

            // Mirror the server: the feature requires the flag and an Enterprise Advanced license.
            const config = await getConfig(database);
            const license = await getLicense(database);
            const enabled = config?.FeatureFlagSessionAttributes === 'true' &&
                isMinimumLicenseTier(license, License.SKU_SHORT_NAME.EnterpriseAdvanced);
            if (!enabled) {
                this.servers.delete(serverUrl);
                return;
            }

            const {manifest} = await fetchSessionAttributesManifest(serverUrl);
            if (!Array.isArray(manifest) || !manifest.length) {
                this.servers.delete(serverUrl);
                return;
            }

            this.initCollection();

            this.servers.set(serverUrl, {
                manifest,
                lastSentAt: new Map(),
            });
        } catch (error) {
            logDebug('[SessionAttributesManager.refreshManifest]', getFullErrorMessage(error));
            this.servers.delete(serverUrl);
        }
    };

    removeServer = (serverUrl: string) => {
        this.servers.delete(serverUrl);
    };

    getOutboundHeader = (serverUrl: string): string | undefined => {
        const state = this.servers.get(serverUrl);
        if (!state) {
            return undefined;
        }

        const now = Date.now();
        const fieldsToSend = state.manifest.filter((field) => {
            const lastSentAt = state.lastSentAt.get(field.name);
            if (!lastSentAt || field.ttl_seconds === 0) {
                return true;
            }
            return (now - lastSentAt) >= field.ttl_seconds * 1000;
        });

        const payload: Record<string, string> = {};
        for (const field of fieldsToSend) {
            const value = this.collectAttribute(field.name, serverUrl);
            if (value) {
                payload[field.name] = value;
            }
            state.lastSentAt.set(field.name, now);
        }

        if (!Object.keys(payload).length) {
            return undefined;
        }

        return base64.encode(JSON.stringify(payload));
    };

    // Sets up the network listener and caches the values that are stable for the
    // lifetime of the app process so that attributes can be collected synchronously.
    private initCollection = () => {
        if (this.netInfoListener) {
            return;
        }

        this.netInfoListener = NetInfo.addEventListener((state) => {
            this.netInfoState = state;
        });

        NetInfo.fetch().then((state) => {
            this.netInfoState = state;
        });

        // Root/jailbreak status can only change with a cold app restart.
        isRootedExperimentalAsync().then((rooted) => {
            this.jailbroken = rooted;
        });

        getDeviceToken().then((token) => {
            this.deviceToken = token;
        });
    };

    private collectAttribute = (name: string, serverUrl: string): string => {
        try {
            switch (name) {
                case AttributeKey.clientIpAddress:
                    return this.netInfoState ? this.extractIpAddress(this.netInfoState) : '';
                case AttributeKey.networkInterfaceType:
                    return this.netInfoState ? this.mapNetInfoType(this.netInfoState) : '';
                case AttributeKey.vpnActive:
                    return this.netInfoState?.type === NetInfoStateType.vpn ? 'true' : 'false';
                case AttributeKey.ssid:
                    // Native SSID collection pending rnutils bridge.
                    return '';
                case AttributeKey.mdmEnrolled:
                    // Native MDM enrollment check pending rnutils bridge.
                    return '';
                case AttributeKey.osPlatform:
                    return Platform.OS;
                case AttributeKey.osVersion:
                    return osVersion || '';
                case AttributeKey.clientVersion:
                    return this.getClientVersion();
                case AttributeKey.serverFqdn:
                    return this.getServerFQDN(serverUrl);
                case AttributeKey.jailbreakDetected:
                    return this.jailbroken ? 'true' : 'false';
                case AttributeKey.clientDeviceId:
                    return this.deviceToken;
                default:
                    logWarning('[SessionAttributesManager.collectAttribute] unknown attribute', name);
                    return '';
            }
        } catch (error) {
            logError('[SessionAttributesManager.collectAttribute] collector failed', {name, error});
            return '';
        }
    };

    private getClientVersion = () => {
        if (!nativeApplicationVersion) {
            return '';
        }
        return nativeBuildVersion ? `${nativeApplicationVersion}+${nativeBuildVersion}` : nativeApplicationVersion;
    };

    private getServerFQDN = (serverUrl: string) => {
        const cached = this.fqdnCache.get(serverUrl);
        if (cached !== undefined) {
            return cached;
        }

        const fqdn = getUrlDomain(serverUrl);
        this.fqdnCache.set(serverUrl, fqdn);
        return fqdn;
    };

    private mapNetInfoType = (state: NetInfoState) => {
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
    };

    private extractIpAddress = (state: NetInfoState) => {
        const details = state.details;
        if (details && 'ipAddress' in details && typeof details.ipAddress === 'string' && details.ipAddress.length) {
            return details.ipAddress;
        }
        return '';
    };
}

const SessionAttributesManager = new SessionAttributesManagerSingleton();
export default SessionAttributesManager;
