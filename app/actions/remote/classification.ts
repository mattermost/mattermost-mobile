// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {
    DISPLAY_BANNER_TOP,
    FIELD_NAME,
    GROUP_NAME,
    LINKED_FIELD_NAME,
    LINKED_OBJECT_TYPE,
    OBJECT_TYPE,
    SYSTEM_FIELD_TARGET_ID,
    TARGET_ID,
    TARGET_TYPE,
} from '@constants/classification';
import DatabaseManager from '@database/manager';
import NetworkManager from '@managers/network_manager';
import {getConfigValue} from '@queries/servers/system';
import {setClassificationBannerState} from '@store/classification_banner_store';
import {logDebug} from '@utils/log';

const defaultState = {visible: false, levelName: '', color: ''};

export async function fetchClassificationBanner(serverUrl: string): Promise<{error?: unknown}> {
    try {
        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const featureFlag = await getConfigValue(database, 'FeatureFlagClassificationMarkings');
        if (featureFlag !== 'true') {
            setClassificationBannerState(serverUrl, defaultState);
            return {};
        }

        const client = NetworkManager.getClient(serverUrl);

        const [templateFields, linkedFields] = await Promise.all([
            client.getPropertyFields(GROUP_NAME, OBJECT_TYPE, TARGET_TYPE, TARGET_ID),
            client.getPropertyFields(GROUP_NAME, LINKED_OBJECT_TYPE, TARGET_TYPE, SYSTEM_FIELD_TARGET_ID),
        ]);

        const templateField = templateFields.find(
            (f: PropertyField) => f.object_type === OBJECT_TYPE && f.name === FIELD_NAME && f.delete_at === 0,
        );

        const linkedField = linkedFields.find(
            (f: PropertyField) => f.object_type === LINKED_OBJECT_TYPE && f.name === LINKED_FIELD_NAME && f.linked_field_id && f.delete_at === 0,
        );

        if (!templateField || !linkedField) {
            setClassificationBannerState(serverUrl, defaultState);
            return {};
        }

        const actions = (linkedField.attrs?.actions as string[] | undefined) ?? [];
        if (!actions.includes(DISPLAY_BANNER_TOP)) {
            setClassificationBannerState(serverUrl, defaultState);
            return {};
        }

        const values = await client.getSystemPropertyValues<string>(GROUP_NAME);
        const systemValue = values.find((v: PropertyValue<string>) => v.field_id === linkedField.id);
        const optionId = systemValue?.value ?? '';

        if (!optionId) {
            setClassificationBannerState(serverUrl, defaultState);
            return {};
        }

        const options = (linkedField.attrs?.options as PropertyFieldOption[]) ?? [];
        const levelOption = options.find((o) => o.id === optionId);

        setClassificationBannerState(serverUrl, {
            visible: Boolean(levelOption?.name),
            levelName: levelOption?.name ?? '',
            color: levelOption?.color ?? '',
        });

        return {};
    } catch (error) {
        logDebug('fetchClassificationBanner', 'Failed to fetch classification banner data', error);
        setClassificationBannerState(serverUrl, defaultState);
        return {error};
    }
}
