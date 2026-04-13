// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {removeChannelFromManagedCategoryIfNeeded} from '@actions/local/category';
import {addChannelToManagedCategoryIfNeeded} from '@actions/remote/category';
import {MANAGED_CHANNEL_CATEGORIES_GROUP} from '@constants/categories';
import DatabaseManager from '@database/manager';
import {getChannelById} from '@queries/servers/channel';
import {getConfigValue} from '@queries/servers/system';
import {logDebug} from '@utils/log';

export async function handleManagedChannelCategoriesPropertyValuesUpdated(serverUrl: string, msg: WebSocketMessage) {
    try {
        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const enabled = await getConfigValue(database, 'EnableManagedChannelCategories');
        if (enabled !== 'true') {
            return;
        }

        const data = msg.data as PropertyValuesUpdatedData;
        const fieldName = data.field_name ?? data.name;
        const groupName = data.group_name;
        const isMatchingGroup = groupName === MANAGED_CHANNEL_CATEGORIES_GROUP;
        const isFallbackMatch = !groupName && fieldName === 'category_name';
        if (!isMatchingGroup && !isFallbackMatch) {
            return;
        }

        if (data.object_type && data.object_type !== 'channel') {
            return;
        }

        const channelId = data.target_id ?? data.channel_id;
        if (!channelId) {
            return;
        }

        const channel = await getChannelById(database, channelId);
        if (!channel) {
            return;
        }

        if (data.delete_at && data.delete_at > 0) {
            const teamId = channel.teamId;
            if (teamId) {
                await removeChannelFromManagedCategoryIfNeeded(serverUrl, teamId, channelId);
            }
        } else {
            await addChannelToManagedCategoryIfNeeded(serverUrl, channel);
        }
    } catch (error) {
        logDebug('handleManagedChannelCategoriesPropertyValuesUpdated', error);
    }
}
