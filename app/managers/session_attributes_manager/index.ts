// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import RNUtils from '@mattermost/rnutils';
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
        RNUtils.setSessionAttributesStableValues(JSON.stringify(values));
    };

    refreshManifest = async (serverUrl: string): Promise<void> => {
        try {
            await this.syncStaticValues();

            const database = DatabaseManager.serverDatabases[serverUrl]?.database;
            if (!database) {
                RNUtils.removeSessionAttributesServer(serverUrl);
                return;
            }

            const sessionAttributesEnabled = await getConfigBooleanValue(database, 'FeatureFlagSessionAttributes');
            const license = await getLicense(database);
            const enabled = sessionAttributesEnabled &&
                isMinimumLicenseTier(license, License.SKU_SHORT_NAME.EnterpriseAdvanced);
            RNUtils.setSessionAttributesEnabled(serverUrl, enabled);
            if (!enabled) {
                return;
            }

            const {manifest} = await fetchSessionAttributesManifest(serverUrl);
            if (!Array.isArray(manifest) || !manifest.length) {
                RNUtils.removeSessionAttributesServer(serverUrl);
                return;
            }

            RNUtils.setSessionAttributesManifest(serverUrl, JSON.stringify(manifest));
        } catch (error) {
            logDebug('[SessionAttributesManager.refreshManifest]', getFullErrorMessage(error));
            RNUtils.removeSessionAttributesServer(serverUrl);
        }
    };

    removeServer = (serverUrl: string) => {
        RNUtils.removeSessionAttributesServer(serverUrl);
    };

    upsertManifestField = (serverUrl: string, field: SAField) => {
        RNUtils.upsertSessionAttributesField(serverUrl, JSON.stringify(field));
    };

    removeManifestField = (serverUrl: string, name: string) => {
        RNUtils.removeSessionAttributesField(serverUrl, name);
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
