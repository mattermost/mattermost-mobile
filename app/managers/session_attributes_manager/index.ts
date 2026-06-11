// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import base64 from 'base-64';

import {License} from '@constants';
import {AttributeKey} from '@constants/session_attributes';
import DatabaseManager from '@database/manager';
import NetworkManager from '@managers/network_manager';
import {getConfig, getLicense} from '@queries/servers/system';
import {getFullErrorMessage} from '@utils/errors';
import {isMinimumLicenseTier} from '@utils/helpers';
import {logDebug, logError, logWarning} from '@utils/log';

import sessionAttributeCollector from './collector';

type ServerState = {
    manifest: SAField[];
    isSending: boolean;
    lastSentAt: Map<string, number>;
};

class SessionAttributesManagerSingleton {
    private servers: Map<string, ServerState> = new Map();

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

            const client = NetworkManager.getClient(serverUrl);
            const manifest = await client.getSessionAttributesManifest();
            if (!Array.isArray(manifest) || !manifest.length) {
                this.servers.delete(serverUrl);
                return;
            }

            this.servers.set(serverUrl, {
                manifest,
                lastSentAt: new Map(),
                isSending: false,
            });
        } catch (error) {
            logDebug('[SessionAttributesManager.refreshManifest]', getFullErrorMessage(error));
            this.servers.delete(serverUrl);
        }
    };

    removeServer = (serverUrl: string) => {
        this.servers.delete(serverUrl);
    };

    getOutboundHeader = async (serverUrl: string): Promise<string | undefined> => {
        const state = this.servers.get(serverUrl);
        if (!state || state.isSending) {
            return undefined;
        }

        state.isSending = true;

        try {
            const now = Date.now();
            const fieldsToSend = state.manifest.filter((field) => {
                const lastSentAt = state.lastSentAt.get(field.name);
                if (!lastSentAt || field.ttl_seconds === 0) {
                    return true;
                }
                return (now - lastSentAt) >= field.ttl_seconds * 1000;
            });

            const payload: Record<string, string> = {};
            await Promise.all(fieldsToSend.map(async (field) => {
                const value = await this.collectAttribute(field.name, serverUrl);
                if (value) {
                    payload[field.name] = value;
                }
                state.lastSentAt.set(field.name, now);
            }));

            if (!Object.keys(payload).length) {
                return undefined;
            }

            return base64.encode(JSON.stringify(payload));
        } finally {
            state.isSending = false;
        }
    };

    private collectAttribute = async (name: string, serverUrl: string): Promise<string> => {
        try {
            switch (name) {
                case AttributeKey.clientIpAddress:
                    return await sessionAttributeCollector.getClientIPAddress();
                case AttributeKey.networkInterfaceType:
                    return await sessionAttributeCollector.getNetworkInterfaceType();
                case AttributeKey.vpnActive:
                    return await sessionAttributeCollector.getIsVpnActive();
                case AttributeKey.ssid:
                    return await sessionAttributeCollector.getSSID();
                case AttributeKey.mdmEnrolled:
                    return await sessionAttributeCollector.getMDMEnrolled();
                case AttributeKey.osPlatform:
                    return sessionAttributeCollector.getOSPlatform();
                case AttributeKey.osVersion:
                    return sessionAttributeCollector.getOSVersion();
                case AttributeKey.clientVersion:
                    return sessionAttributeCollector.getClientVersion();
                case AttributeKey.serverFqdn:
                    return sessionAttributeCollector.getServerFQDN(serverUrl);
                case AttributeKey.jailbreakDetected:
                    return await sessionAttributeCollector.getJailbreakDetected();
                case AttributeKey.clientDeviceId:
                    return await sessionAttributeCollector.getClientDeviceId();
                default:
                    logWarning('[SessionAttributesManager.collectAttribute] unknown attribute', name);
                    return '';
            }
        } catch (error) {
            logError('[SessionAttributesManager.collectAttribute] collector failed', {name, error});
            return '';
        }
    };

}

const SessionAttributesManager = new SessionAttributesManagerSingleton();
export default SessionAttributesManager;
