// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {DMS_CATEGORY} from '@constants/categories';
import DatabaseManager from '@database/manager';
import {setCurrentUserId} from '@queries/servers/system';

import {
    deleteCategory,
    handleConvertedGMCategories,
    storeCategories,
    toggleCollapseCategory,
    addChannelToDefaultCategory,
} from './category';

import type ServerDataOperator from '@database/operator/server_data_operator';
import type ChannelModel from '@typings/database/models/servers/channel';

describe('handleConvertedGMCategories', () => {
    const serverUrl = 'baseHandler.test.com';
    const channelId = 'channel_id_1';
    const teamId1 = 'team_id_1';
    const teamId2 = 'team_id_2';
    const team: Team = {
        id: teamId1,
    } as Team;

    let operator: ServerDataOperator;

    it('base case', async () => {
        await DatabaseManager.init([serverUrl]);
        operator = DatabaseManager.serverDatabases[serverUrl]!.operator;
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

        const {models, error} = await handleConvertedGMCategories(serverUrl, channelId, teamId1);
        expect(error).toBeUndefined();
        expect(models).toBeDefined();
        expect(models!.length).toBe(3); // two for removing channel for a custom and a DM category, and one for adding it to default channels category
    });

    it('error - no channel category', async () => {
        await DatabaseManager.init([serverUrl]);
        operator = DatabaseManager.serverDatabases[serverUrl]!.operator;

        const {models, error} = await handleConvertedGMCategories(serverUrl, channelId, teamId1, true);
        expect(error).toBeDefined();
        expect(error).toBe('Failed to find default category when handling category of converted GM');
        expect(models).toBeUndefined();
    });

    it('error - database not prepared', async () => {
        const {error} = await handleConvertedGMCategories('', channelId, teamId1, true);
        expect(error).toBeDefined();
    });
});

describe('category crud', () => {
    const serverUrl = 'baseHandler.test.com';
    const teamId1 = 'team_id_1';
    const channelId1 = 'channel_id_1';
    const channelId2 = 'channel_id_2';
    const team: Team = {
        id: teamId1,
    } as Team;

    let operator: ServerDataOperator;

    beforeAll(async () => {
        await DatabaseManager.init([serverUrl]);
        operator = DatabaseManager.serverDatabases[serverUrl]!.operator;
        await operator.handleTeam({teams: [team], prepareRecordsOnly: false});
    });

    it('deleteCategory', async () => {
        const defaultCategory: Category = {
            id: 'default_category_id',
            team_id: teamId1,
            type: 'channels',
        } as Category;

        await operator.handleCategories({categories: [defaultCategory], prepareRecordsOnly: false});

        const {category, error} = await deleteCategory(serverUrl, defaultCategory.id);
        expect(error).toBeUndefined();
        expect(category).toBeDefined();
        expect(category?.id).toBe(defaultCategory.id);

        const {category: nullCategory, error: error2} = await deleteCategory(serverUrl, 'junk');
        expect(nullCategory).toBeUndefined();
        expect(error2).toBeUndefined();
    });

    it('deleteCategory - handle database not found', async () => {
        const {error} = await deleteCategory('', '');
        expect(error).toBeDefined();
    });

    it('storeCategories', async () => {
        const defaultCategory: CategoryWithChannels = {
            id: 'default_category_id',
            team_id: teamId1,
            type: 'channels',
            channel_ids: [channelId1, channelId2],
        } as CategoryWithChannels;

        const {models: prepModels, error: prepError} = await storeCategories(serverUrl, [defaultCategory], false, true); // only prepare
        expect(prepError).toBeUndefined();
        expect(prepModels).toBeDefined();
        expect(prepModels!.length).toBe(3); // one for the category and two for the channels added to the category

        const {models, error} = await storeCategories(serverUrl, [defaultCategory], false, false);
        expect(error).toBeUndefined();
        expect(models).toBeDefined();
        expect(models!.length).toBe(3);
    });

    it('storeCategories - handle database not found', async () => {
        const {error} = await storeCategories('', []);
        expect(error).toBeDefined();
    });

    it('toggleCollapseCategory', async () => {
        const defaultCategory: Category = {
            id: 'default_category_id',
            team_id: teamId1,
            type: 'channels',
            collapsed: false,
        } as Category;

        await operator.handleCategories({categories: [defaultCategory], prepareRecordsOnly: false});

        const {category: categoryResult1, error: error1} = await toggleCollapseCategory(serverUrl, defaultCategory.id);
        expect(error1).toBeUndefined();
        expect(categoryResult1).toBeDefined();
        expect(categoryResult1?.collapsed).toBe(!defaultCategory.collapsed);

        const {category: categoryResult2, error: error2} = await toggleCollapseCategory(serverUrl, defaultCategory.id);
        expect(error2).toBeUndefined();
        expect(categoryResult2).toBeDefined();
        expect(categoryResult2?.collapsed).toBe(defaultCategory.collapsed);
    });

    it('toggleCollapseCategory - handle database not found', async () => {
        const {error} = await toggleCollapseCategory('', '');
        expect(error).toBeDefined();
    });
});

describe('addChannelToDefaultCategory', () => {
    const serverUrl = 'baseHandler.test.com';
    const channelId = 'channel_id_1';
    const teamId1 = 'team_id_1';
    const team: Team = {
        id: teamId1,
    } as Team;
    const channel: Channel = {
        id: channelId,
        team_id: teamId1,
        type: 'O',
    } as Channel;
    const dmChannel: Channel = {
        id: channelId,
        team_id: '',
        type: 'D',
    } as Channel;

    let operator: ServerDataOperator;

    it('base case', async () => {
        await DatabaseManager.init([serverUrl]);
        operator = DatabaseManager.serverDatabases[serverUrl]!.operator;
        await operator.handleTeam({teams: [team], prepareRecordsOnly: false});
        setCurrentUserId(operator, 'userid');

        const myTeams: MyTeam[] = [{
            id: team.id,
            roles: 'team_user',
        }];

        await operator.handleMyTeam({myTeams, prepareRecordsOnly: false});

        const defaultCategory: Category = {
            id: 'default_category_id',
            team_id: teamId1,
            type: 'channels',
        } as Category;

        const dmCategory: Category = {
            id: 'dm_category_id',
            team_id: teamId1,
            type: DMS_CATEGORY,
        } as Category;

        await operator.handleCategories({categories: [defaultCategory, dmCategory], prepareRecordsOnly: false});

        const {models, error} = await addChannelToDefaultCategory(serverUrl, channel);
        expect(error).toBeUndefined();
        expect(models).toBeDefined();
        expect(models!.length).toBe(1); // one for the channel

        const {models: dmModels, error: dmError} = await addChannelToDefaultCategory(serverUrl, dmChannel);
        expect(dmError).toBeUndefined();
        expect(dmModels).toBeDefined();
        expect(dmModels!.length).toBe(1); // one for the dm channel

        const {models: channelModels, error: channelModelError} = await addChannelToDefaultCategory(serverUrl, {teamId: teamId1, id: channelId} as ChannelModel);
        expect(channelModelError).toBeUndefined();
        expect(channelModels).toBeDefined();
        expect(channelModels!.length).toBe(1); // one for the channel
    });

    it('error - no current user', async () => {
        await DatabaseManager.init([serverUrl]);
        operator = DatabaseManager.serverDatabases[serverUrl]!.operator;
        const {models, error} = await addChannelToDefaultCategory(serverUrl, channel);
        expect(error).toBeDefined();
        expect(error).toBe('no current user id');
        expect(models).toBeUndefined();
    });

    it('error - database not prepared', async () => {
        const {error} = await addChannelToDefaultCategory('', channel);
        expect(error).toBeDefined();
    });
});
