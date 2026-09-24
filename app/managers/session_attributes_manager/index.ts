// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {
    removeSessionAttributesField,
    removeSessionAttributesServer,
    setSessionAttributesEnabled,
    setSessionAttributesManifest,
    setSessionAttributesStableValues,
    upsertSessionAttributesField,
} from '@mattermost/react-native-network-client';
import {getAndroidId, getIosIdForVendorAsync, nativeApplicationVersion, nativeBuildVersion} from 'expo-application';
import {isRootedExperimentalAsync, osVersion} from 'expo-device';
import {Platform} from 'react-native';
import {PERMISSIONS, RESULTS, check, request} from 'react-native-permissions';

import {fetchSessionAttributesManifest} from '@actions/remote/session_attributes';
import {License} from '@constants';
import {SESSION_ATTRIBUTES_SSID_FIELD} from '@constants/session_attributes';
import DatabaseManager from '@database/manager';
import {getConfigBooleanValue, getLicense} from '@queries/servers/system';
import {getFullErrorMessage} from '@utils/errors';
import {isMinimumLicenseTier} from '@utils/helpers';
import {logDebug} from '@utils/log';

export class SessionAttributesManagerSingleton {
    // Servers whose requests carry session attributes, mirroring what the native client was told.
    private enabledServers = new Set<string>();

    syncStaticValues = async (): Promise<void> => {
        const values = await this.collectStaticValues();
        setSessionAttributesStableValues(values);
    };

    refreshManifest = async (serverUrl: string): Promise<void> => {
        try {
            await this.syncStaticValues();

            const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
            if (!database) {
                this.disableServer(serverUrl);
                return;
            }

            const sessionAttributesEnabled = await getConfigBooleanValue(database, 'FeatureFlagSessionAttributes');
            const license = await getLicense(database);
            const enabled = sessionAttributesEnabled &&
                isMinimumLicenseTier(license, License.SKU_SHORT_NAME.EnterpriseAdvanced);
            if (!enabled) {
                this.disableServer(serverUrl);
                return;
            }

            this.enabledServers.add(serverUrl);
            setSessionAttributesEnabled(serverUrl, true);

            const {manifest, error} = await fetchSessionAttributesManifest(serverUrl);
            if (error) {
                logDebug('[SessionAttributesManager.refreshManifest]', getFullErrorMessage(error));
                return;
            }

            if (!Array.isArray(manifest) || !manifest.length) {
                setSessionAttributesManifest(serverUrl, []);
                return;
            }

            setSessionAttributesManifest(serverUrl, manifest);

            if (manifest.some((field) => field.name === SESSION_ATTRIBUTES_SSID_FIELD)) {
                // Not awaited so the permission prompt never blocks the reconnect sync.
                this.requestLocationPermission();
            }
        } catch (error) {
            logDebug('[SessionAttributesManager.refreshManifest]', getFullErrorMessage(error));
            this.disableServer(serverUrl);
        }
    };

    removeServer = (serverUrl: string) => {
        this.disableServer(serverUrl);
    };

    /**
     * Servers that evaluate this device's session attributes, which include its network (SSID,
     * interface, IP), in ABAC decisions.
     */
    getEnabledServers = () => [...this.enabledServers];

    upsertManifestField = (serverUrl: string, field: SAField) => {
        upsertSessionAttributesField(serverUrl, field);

        if (field.name === SESSION_ATTRIBUTES_SSID_FIELD) {
            this.requestLocationPermission();
        }
    };

    removeManifestField = (serverUrl: string, name: string) => {
        removeSessionAttributesField(serverUrl, name);
    };

    private disableServer = (serverUrl: string) => {
        this.enabledServers.delete(serverUrl);
        removeSessionAttributesServer(serverUrl);
    };

    /**
     * The SSID is read natively, which both platforms gate behind location authorization.
     * Only the resulting status is logged, never the network name.
     */
    private requestLocationPermission = async (): Promise<void> => {
        const location = Platform.select({
            ios: PERMISSIONS.IOS.LOCATION_WHEN_IN_USE,
            default: PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION,
        });

        try {
            const status = await check(location);
            if (status === RESULTS.DENIED) {
                const result = await request(location);
                logDebug('[SessionAttributesManager.requestLocationPermission] requested for the ssid attribute:', result);
                return;
            }

            if (status !== RESULTS.GRANTED) {
                logDebug('[SessionAttributesManager.requestLocationPermission] the ssid attribute cannot be collected:', status);
            }
        } catch (error) {
            logDebug('[SessionAttributesManager.requestLocationPermission]', getFullErrorMessage(error));
        }
    };

    private collectStaticValues = async (): Promise<Record<string, string>> => {
        let clientVersion = '';
        if (nativeApplicationVersion) {
            if (nativeBuildVersion) {
                clientVersion = `${nativeApplicationVersion}+${nativeBuildVersion}`;
            } else {
                clientVersion = nativeApplicationVersion;
            }
        }

        let clientDeviceId = '';
        if (Platform.OS === 'android') {
            clientDeviceId = getAndroidId();
        } else if (Platform.OS === 'ios') {
            clientDeviceId = (await getIosIdForVendorAsync()) ?? '';
        }

        const isRooted = await isRootedExperimentalAsync();

        return {
            jailbreak_detected: isRooted ? 'true' : 'false',
            os_version: osVersion ?? '',
            os_platform: Platform.OS,
            client_version: clientVersion,
            client_device_id: clientDeviceId,
        };
    };
}

const SessionAttributesManager = new SessionAttributesManagerSingleton();
export default SessionAttributesManager;
