// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import DatabaseManager from '@database/manager';

import {handleConvertedGMCategories} from './category';

import type ServerDataOperator from '@database/operator/server_data_operator';

describe('handleConvertedGMCategories', () => {
    const serverUrl = 'baseHandler.test.com';
    const channelId = 'channel_id_1';
    const teamId1 = 'team_id_1';
    const teamId2 = 'team_id_2';
    const team: Team = {
        id: teamId1,
    } as Team;

    let operator: ServerDataOperator;

    beforeEach(async () => {
        await DatabaseManager.init([serverUrl]);
        operator = DatabaseManager.serverDatabases[serverUrl]!.operator;
    });

    it('base case', async () => {
        await operator.handleTeam({teams: [team], prepareRecordsOnly: false});

        const defaultCategory: Category = {
            id: 'default_category_id',
            team_id: teamId1,
            type: 'channels',
        } as Category;

        const customCategory: Category = {
            id: 'custom_category_id',
            team_id: teamId2,
            type: 'custom',
        } as Category;

        const dmCategory: Category = {
            id: 'dm_category_id',
            team_id: teamId1,
            type: 'direct_messages',
        } as Category;

        await operator.handleCategories({categories: [defaultCategory, customCategory, dmCategory], prepareRecordsOnly: false});

        const dmCategoryChannel: CategoryChannel = {
            id: 'dm_category_channel_id',
            category_id: 'dm_category_id',
            channel_id: channelId,
            sort_order: 1,
        };

        const customCategoryChannel: CategoryChannel = {
            id: 'custom_category_channel_id',
            category_id: 'dm_category_id',
            channel_id: channelId,
            sort_order: 1,
        };
        await operator.handleCategoryChannels({categoryChannels: [dmCategoryChannel, customCategoryChannel], prepareRecordsOnly: false});

        const {models, error} = await handleConvertedGMCategories(serverUrl, channelId, teamId1, true);
        expect(error).toBeUndefined();
        expect(models).toBeDefined();
        expect(models!.length).toBe(3); // two for removing channel for a custom and a DM category, and one for adding it to default channels category
    });
});
