// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {storeCategories} from '@actions/local/category';
import {CHANNELS_CATEGORY, DMS_CATEGORY, FAVORITES_CATEGORY} from '@constants/categories';
import {SYSTEM_IDENTIFIERS} from '@constants/database';
import DatabaseManager from '@database/manager';
import NetworkManager from '@managers/network_manager';
import {getFullErrorMessage} from '@utils/errors';
import {logDebug} from '@utils/log';

import {fetchCategories, toggleFavoriteChannel} from './category';

import type ServerDataOperator from '@database/operator/server_data_operator';

jest.mock('@managers/network_manager');
jest.mock('@utils/log');
jest.mock('@utils/errors');
jest.mock('@actions/local/category');

const serverUrl = 'baseHandler.test.com';
let operator: ServerDataOperator;

const teamId = 'teamid1';
const channelId = 'channelid1';
const channel = {id: channelId, type: 'O'} as Channel;
const mockCategories = [{id: 'category1'}, {id: 'category2'}];
const error = new Error('Test error');

beforeEach(async () => {
    jest.clearAllMocks();
    await DatabaseManager.init([serverUrl]);
    operator = DatabaseManager.serverDatabases[serverUrl]!.operator;
});

describe('fetchCategories', () => {
    it('should fetch categories successfully', async () => {
        const mockClient = {
            getCategories: jest.fn().mockResolvedValue({categories: mockCategories}),
        };
        (NetworkManager.getClient as jest.Mock).mockReturnValue(mockClient);

        const result = await fetchCategories(serverUrl, teamId);

        expect(NetworkManager.getClient).toHaveBeenCalledWith(serverUrl);
        expect(mockClient.getCategories).toHaveBeenCalledWith('me', teamId);
        expect(storeCategories).toHaveBeenCalledWith(serverUrl, mockCategories, false);
        expect(result).toEqual({categories: mockCategories});
    });

    it('should only fetch categories successfully', async () => {
        const mockClient = {
            getCategories: jest.fn().mockResolvedValue({categories: mockCategories}),
        };
        (NetworkManager.getClient as jest.Mock).mockReturnValue(mockClient);

        const result = await fetchCategories(serverUrl, teamId, false, true);

        expect(NetworkManager.getClient).toHaveBeenCalledWith(serverUrl);
        expect(mockClient.getCategories).toHaveBeenCalledWith('me', teamId);
        expect(result).toEqual({categories: mockCategories});
    });

    it('should handle error during fetch categories', async () => {
        const mockClient = {
            getCategories: jest.fn().mockRejectedValue(error),
        };
        (NetworkManager.getClient as jest.Mock).mockReturnValue(mockClient);
        (getFullErrorMessage as jest.Mock).mockReturnValue('Full error message');

        const result = await fetchCategories(serverUrl, teamId);

        expect(NetworkManager.getClient).toHaveBeenCalledWith(serverUrl);
        expect(mockClient.getCategories).toHaveBeenCalledWith('me', teamId);
        expect(logDebug).toHaveBeenCalledWith('error on fetchCategories', 'Full error message');
        expect(result).toEqual({error});
    });
});

describe('toggleFavoriteChannel', () => {
    const favCategory: Category = {
        id: 'fav_category_id',
        team_id: teamId,
        type: FAVORITES_CATEGORY,
    } as Category;

    const categoryChannels: CategoryChannel = {
        id: 'teamid1_channelid1',
        category_id: 'fav_category_id',
        channel_id: channelId,
        sort_order: 1,
    };

    const defaultCategory: Category = {
        id: 'default_category_id',
        team_id: teamId,
        type: CHANNELS_CATEGORY,
    } as Category;

    const dmCategory: Category = {
        id: 'dm_category_id',
        team_id: teamId,
        type: DMS_CATEGORY,
    } as Category;

    it('should handle no channel found', async () => {
        const result = await toggleFavoriteChannel(serverUrl, channelId, true);

        expect(NetworkManager.getClient).toHaveBeenCalledWith(serverUrl);
        expect(result).toEqual({error: 'channel not found'});
    });

    it('should handle no channel category', async () => {
        await operator.handleChannel({channels: [channel], prepareRecordsOnly: false});
        const result = await toggleFavoriteChannel(serverUrl, channelId, true);

        expect(NetworkManager.getClient).toHaveBeenCalledWith(serverUrl);
        expect(result).toEqual({error: 'channel does not belong to a category'});
    });

    it('should error on no target category', async () => {
        await operator.handleCategoryChannels({categoryChannels: [categoryChannels], prepareRecordsOnly: false});
        await operator.handleCategories({categories: [favCategory], prepareRecordsOnly: false});
        await operator.handleChannel({channels: [channel], prepareRecordsOnly: false});
        await operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.CURRENT_TEAM_ID, value: teamId}], prepareRecordsOnly: false});
        const mockClient = {
            updateChannelCategories: jest.fn().mockResolvedValue({}),
        };
        (NetworkManager.getClient as jest.Mock).mockReturnValue(mockClient);

        const result = await toggleFavoriteChannel(serverUrl, channelId, true);

        expect(result).toEqual({error: 'target category not found'});
        expect(NetworkManager.getClient).toHaveBeenCalledWith(serverUrl);
    });

    it('should unfavorite channel successfully', async () => {
        await operator.handleCategoryChannels({categoryChannels: [categoryChannels], prepareRecordsOnly: false});
        await operator.handleCategories({categories: [favCategory, defaultCategory], prepareRecordsOnly: false});
        await operator.handleChannel({channels: [channel], prepareRecordsOnly: false});
        await operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.CURRENT_TEAM_ID, value: teamId}], prepareRecordsOnly: false});
        const mockClient = {
            updateChannelCategories: jest.fn().mockResolvedValue({}),
        };
        (NetworkManager.getClient as jest.Mock).mockReturnValue(mockClient);

        const result = await toggleFavoriteChannel(serverUrl, channelId, true);

        expect(result).toEqual({data: true});
        expect(NetworkManager.getClient).toHaveBeenCalledWith(serverUrl);
        expect(mockClient.updateChannelCategories).toHaveBeenCalled();
    });

    it('should unfavorite DM channel successfully', async () => {
        await operator.handleCategoryChannels({categoryChannels: [categoryChannels], prepareRecordsOnly: false});
        await operator.handleCategories({categories: [favCategory, dmCategory], prepareRecordsOnly: false});
        await operator.handleChannel({channels: [{...channel, type: 'D', display_name: 'displayname'}], prepareRecordsOnly: false});
        await operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.CURRENT_TEAM_ID, value: teamId}], prepareRecordsOnly: false});
        const mockClient = {
            updateChannelCategories: jest.fn().mockResolvedValue({}),
        };
        (NetworkManager.getClient as jest.Mock).mockReturnValue(mockClient);

        const result = await toggleFavoriteChannel(serverUrl, channelId, true);

        expect(result).toEqual({data: true});
        expect(NetworkManager.getClient).toHaveBeenCalledWith(serverUrl);
        expect(mockClient.updateChannelCategories).toHaveBeenCalled();
    });

    it('should favorite channel successfully', async () => {
        await operator.handleCategoryChannels({categoryChannels: [{...categoryChannels, category_id: defaultCategory.id}], prepareRecordsOnly: false});
        await operator.handleCategories({categories: [favCategory, defaultCategory], prepareRecordsOnly: false});
        await operator.handleChannel({channels: [channel], prepareRecordsOnly: false});
        await operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.CURRENT_TEAM_ID, value: teamId}], prepareRecordsOnly: false});
        const mockClient = {
            updateChannelCategories: jest.fn().mockResolvedValue({}),
        };
        (NetworkManager.getClient as jest.Mock).mockReturnValue(mockClient);

        const result = await toggleFavoriteChannel(serverUrl, channelId, true);

        expect(result).toEqual({data: true});
        expect(NetworkManager.getClient).toHaveBeenCalledWith(serverUrl);
        expect(mockClient.updateChannelCategories).toHaveBeenCalled();
    });

    it('should favorite channel successfully with no snack bar', async () => {
        await operator.handleCategoryChannels({categoryChannels: [{...categoryChannels, category_id: defaultCategory.id}], prepareRecordsOnly: false});
        await operator.handleCategories({categories: [favCategory, defaultCategory], prepareRecordsOnly: false});
        await operator.handleChannel({channels: [channel], prepareRecordsOnly: false});
        await operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.CURRENT_TEAM_ID, value: teamId}], prepareRecordsOnly: false});
        const mockClient = {
            updateChannelCategories: jest.fn().mockResolvedValue({}),
        };
        (NetworkManager.getClient as jest.Mock).mockReturnValue(mockClient);

        const result = await toggleFavoriteChannel(serverUrl, channelId, false);

        expect(result).toEqual({data: true});
        expect(NetworkManager.getClient).toHaveBeenCalledWith(serverUrl);
        expect(mockClient.updateChannelCategories).toHaveBeenCalled();
    });

    it('should error on no favorites category', async () => {
        await operator.handleCategoryChannels({categoryChannels: [{...categoryChannels, category_id: defaultCategory.id}], prepareRecordsOnly: false});
        await operator.handleCategories({categories: [defaultCategory], prepareRecordsOnly: false});
        await operator.handleChannel({channels: [channel], prepareRecordsOnly: false});
        await operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.CURRENT_TEAM_ID, value: teamId}], prepareRecordsOnly: false});
        const mockClient = {
            updateChannelCategories: jest.fn().mockResolvedValue({}),
        };
        (NetworkManager.getClient as jest.Mock).mockReturnValue(mockClient);

        const result = await toggleFavoriteChannel(serverUrl, channelId, true);

        expect(result).toEqual({error: 'No favorites category'});
        expect(NetworkManager.getClient).toHaveBeenCalledWith(serverUrl);
    });

    it('should handle error during toggle favorite channel', async () => {
        await operator.handleCategoryChannels({categoryChannels: [categoryChannels], prepareRecordsOnly: false});
        await operator.handleCategories({categories: [favCategory, defaultCategory], prepareRecordsOnly: false});
        await operator.handleChannel({channels: [channel], prepareRecordsOnly: false});
        await operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.CURRENT_TEAM_ID, value: teamId}], prepareRecordsOnly: false});
        const mockClient = {
            updateChannelCategories: jest.fn().mockRejectedValue(error),
        };
        (NetworkManager.getClient as jest.Mock).mockReturnValue(mockClient);
        (getFullErrorMessage as jest.Mock).mockReturnValue('Full error message');

        const result = await toggleFavoriteChannel(serverUrl, channelId);

        expect(NetworkManager.getClient).toHaveBeenCalledWith(serverUrl);
        expect(mockClient.updateChannelCategories).toHaveBeenCalled();
        expect(logDebug).toHaveBeenCalledWith('error on toggleFavoriteChannel', 'Full error message');
        expect(result).toEqual({error});
    });
});
