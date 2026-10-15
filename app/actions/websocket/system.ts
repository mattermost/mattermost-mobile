// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {updateDmGmDisplayName} from '@actions/local/channel';
import {reconcilePersistenceFlag} from '@actions/local/ephemeral_mode/wipe';
import {invalidateRedactionGlobally, RedactionInvalidationReason} from '@actions/local/redaction';
import {storeConfig} from '@actions/local/systems';
import {fetchCategories} from '@actions/remote/category';
import {applyPersistenceModeChange} from '@actions/remote/refresh';
import {invalidateRedactionForCurrentUser} from '@actions/websocket/access_control';
import {License} from '@constants';
import {SYSTEM_IDENTIFIERS} from '@constants/database';
import DatabaseManager from '@database/manager';
import SessionAttributesManager from '@managers/session_attributes_manager';
import {getConfig, getCurrentTeamId, getLicense} from '@queries/servers/system';
import EphemeralStore from '@store/ephemeral_store';
import {getFullErrorMessage} from '@utils/errors';
import {isMinimumLicenseTier} from '@utils/helpers';
import {logError} from '@utils/log';

export async function handleLicenseChangedEvent(serverUrl: string, msg: WebSocketMessage): Promise<void> {
    try {
        const {database, operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);

        const license = msg.data.license;
        const systems: IdValue[] = [{id: SYSTEM_IDENTIFIERS.LICENSE, value: JSON.stringify(license)}];

        const prevLicense = await getLicense(database);
        await operator.handleSystem({systems, prepareRecordsOnly: false});

        if (license?.LockTeammateNameDisplay && (prevLicense?.LockTeammateNameDisplay !== license.LockTeammateNameDisplay)) {
            updateDmGmDisplayName(serverUrl);
        }

        const prevSessionAttributes = prevLicense?.SkuShortName === License.SKU_SHORT_NAME.EnterpriseAdvanced;
        const newSessionAttributes = license?.SkuShortName === License.SKU_SHORT_NAME.EnterpriseAdvanced;
        if (newSessionAttributes !== prevSessionAttributes) {
            if (newSessionAttributes) {
                await SessionAttributesManager.refreshManifest(serverUrl);
            } else {
                SessionAttributesManager.removeServer(serverUrl);
            }
        }

        // The ABAC engine refuses to evaluate below Enterprise Advanced and every fail-closed decision
        // becomes a deny, so crossing that tier flips file access without any policy event. Raised after
        // the manifest refresh so the refetch already carries the session attributes the tier enables.
        const wasAbacLicensed = isMinimumLicenseTier(prevLicense, License.SKU_SHORT_NAME.EnterpriseAdvanced);
        const isAbacLicensed = isMinimumLicenseTier(license, License.SKU_SHORT_NAME.EnterpriseAdvanced);
        if (wasAbacLicensed !== isAbacLicensed) {
            invalidateRedactionForCurrentUser(serverUrl, RedactionInvalidationReason.LicenseChanged);
        }
    } catch {
        // do nothing
    }
}

export async function handleConfigChangedEvent(serverUrl: string, msg: WebSocketMessage): Promise<void> {
    try {
        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const config = msg.data.config;
        const prevConfig = await getConfig(database);
        await storeConfig(serverUrl, config);
        if (config?.LockTeammateNameDisplay && (prevConfig?.LockTeammateNameDisplay !== config.LockTeammateNameDisplay)) {
            updateDmGmDisplayName(serverUrl);
        }

        const prevManagedSetting = prevConfig?.EnableManagedChannelCategories;
        const newManagedSetting = config?.EnableManagedChannelCategories;
        if (newManagedSetting !== prevManagedSetting) {
            EphemeralStore.clearManagedCategoryPropertyIds(serverUrl);
            const currentTeamId = await getCurrentTeamId(database);
            if (currentTeamId) {
                await fetchCategories(serverUrl, currentTeamId, true);
            }
        }

        // Either transition invalidates everything cached. Turning ABAC on must not trust decisions
        // made before it was enforced. Turning it off leaves cached denials whose file rows are gone
        // and that no since-fetch re-delivers; raising the epoch lets them be re-checked. The trigger
        // path is gated on enforcement, so the off transition raises the epoch directly. Both read
        // the config stored above.
        const abacWasEnforced = prevConfig?.FeatureFlagPermissionPolicies === 'true' && prevConfig?.EnableAttributeBasedAccessControl === 'true';
        const abacIsEnforced = config?.FeatureFlagPermissionPolicies === 'true' && config?.EnableAttributeBasedAccessControl === 'true';
        if (abacIsEnforced && !abacWasEnforced) {
            invalidateRedactionForCurrentUser(serverUrl, RedactionInvalidationReason.ConfigChanged);
        } else if (abacWasEnforced && !abacIsEnforced) {
            await invalidateRedactionGlobally(serverUrl, RedactionInvalidationReason.ConfigChanged);
        }

        // Run last: a flag transition can wipe and recreate the server DB, invalidating
        // the `database` reference captured above.
        const needsModeChange = await reconcilePersistenceFlag(serverUrl, config);
        if (needsModeChange) {
            const {error: modeChangeError} = await applyPersistenceModeChange(serverUrl);
            if (modeChangeError) {
                logError('handleConfigChangedEvent', getFullErrorMessage(modeChangeError));
            }
        }

        const prevSessionAttributes = prevConfig?.FeatureFlagSessionAttributes === 'true';
        const newSessionAttributes = config?.FeatureFlagSessionAttributes === 'true';
        if (newSessionAttributes !== prevSessionAttributes) {
            if (newSessionAttributes) {
                await SessionAttributesManager.refreshManifest(serverUrl);
            } else {
                SessionAttributesManager.removeServer(serverUrl);
            }

            // Session attributes are part of the ABAC subject, so sending them or not can flip decisions.
            invalidateRedactionForCurrentUser(serverUrl, RedactionInvalidationReason.SessionAttributes);
        }
    } catch {
        // do nothing
    }
}

