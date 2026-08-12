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

import {fetchSessionAttributesManifest} from '@actions/remote/session_attributes';
import {License} from '@constants';
import DatabaseManager from '@database/manager';
import {getConfigBooleanValue, getLicense} from '@queries/servers/system';
import {getFullErrorMessage} from '@utils/errors';
import {isMinimumLicenseTier} from '@utils/helpers';
import {logDebug} from '@utils/log';

export class SessionAttributesManagerSingleton {
    syncStaticValues = async (): Promise<void> => {
        const values = await this.collectStaticValues();
        setSessionAttributesStableValues(values);
    };

    refreshManifest = async (serverUrl: string): Promise<void> => {
        try {
            await this.syncStaticValues();

            const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
            if (!database) {
                removeSessionAttributesServer(serverUrl);
                return;
            }

            const sessionAttributesEnabled = await getConfigBooleanValue(database, 'FeatureFlagSessionAttributes');
            const license = await getLicense(database);
            const enabled = sessionAttributesEnabled &&
                isMinimumLicenseTier(license, License.SKU_SHORT_NAME.EnterpriseAdvanced);
            if (!enabled) {
                removeSessionAttributesServer(serverUrl);
                return;
            }

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
        } catch (error) {
            logDebug('[SessionAttributesManager.refreshManifest]', getFullErrorMessage(error));
            removeSessionAttributesServer(serverUrl);
        }
    };

    removeServer = (serverUrl: string) => {
        removeSessionAttributesServer(serverUrl);
    };

    upsertManifestField = (serverUrl: string, field: SAField) => {
        upsertSessionAttributesField(serverUrl, field);
    };

    removeManifestField = (serverUrl: string, name: string) => {
        removeSessionAttributesField(serverUrl, name);
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
