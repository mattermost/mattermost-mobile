// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {removeChannelFromManagedCategoryIfNeeded} from '@actions/local/category';
import {addChannelToManagedCategoryIfNeeded} from '@actions/remote/category';
import DatabaseManager from '@database/manager';
import {fetchManagedCategoryPropertyIds} from '@helpers/sidebar/managed_categories_merge';
import {getManagedCategoryForChannel} from '@queries/servers/categories';
import {getChannelById} from '@queries/servers/channel';
import {getConfigValue} from '@queries/servers/system';
import EphemeralStore from '@store/ephemeral_store';
import {logDebug} from '@utils/log';

export async function handleManagedChannelCategoriesPropertyValuesUpdated(serverUrl: string, msg: WebSocketMessage) {
    try {
        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const enabled = await getConfigValue(database, 'EnableManagedChannelCategories');
        if (enabled !== 'true') {
            return;
        }

        const data = msg.data as PropertyValuesUpdatedData;

        if (data.object_type && data.object_type !== 'channel') {
            return;
        }

        const channelId = data.target_id;
        if (!channelId) {
            return;
        }

        const values: PropertyValue[] = JSON.parse(data.values);
        if (!values.length) {
            return;
        }

        let propertyIds = EphemeralStore.getManagedCategoryPropertyIds(serverUrl);
        if (!propertyIds) {
            propertyIds = await fetchManagedCategoryPropertyIds(serverUrl);
        }
        if (!propertyIds) {
            return;
        }

        const matched = values.find((v) => v.group_id === propertyIds!.groupId && v.field_id === propertyIds!.fieldId);
        if (!matched) {
            return;
        }

        const channel = await getChannelById(database, channelId);
        if (!channel) {
            return;
        }

        const categoryName = matched.value;
        const teamId = channel.teamId;
        if (!teamId) {
            return;
        }

        if (categoryName) {
            const currentManaged = await getManagedCategoryForChannel(database, teamId, channelId);
            if (currentManaged?.displayName === String(categoryName)) {
                return;
            }
            await removeChannelFromManagedCategoryIfNeeded(serverUrl, teamId, channelId);
            await addChannelToManagedCategoryIfNeeded(serverUrl, channel);
        } else {
            await removeChannelFromManagedCategoryIfNeeded(serverUrl, teamId, channelId);
        }
    } catch (error) {
        logDebug('[handleManagedCategoryWS]', error);
    }
}
