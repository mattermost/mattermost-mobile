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
        expect(mockClient.getCategories).toHaveBeenCalledWith('me', teamId, undefined);
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
        expect(mockClient.getCategories).toHaveBeenCalledWith('me', teamId, undefined);
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
        expect(mockClient.getCategories).toHaveBeenCalledWith('me', teamId, undefined);
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
            getCategories: jest.fn().mockResolvedValue({categories: []}),
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
            getCategories: jest.fn().mockResolvedValue({
                categories: [
                    {...favCategory, channel_ids: [channelId]},
                    {...defaultCategory, channel_ids: []},
                ],
            }),
        };
        (NetworkManager.getClient as jest.Mock).mockReturnValue(mockClient);

        const result = await toggleFavoriteChannel(serverUrl, channelId, true);

        expect(result).toEqual({data: true});
        expect(NetworkManager.getClient).toHaveBeenCalledWith(serverUrl);
        expect(mockClient.updateChannelCategories).toHaveBeenCalled();
    });

    it('should keep sibling favorites when unfavoriting one channel', async () => {
        const otherChannelId = 'someone-elses-channel';
        await operator.handleCategoryChannels({
            categoryChannels: [
                categoryChannels,
                {id: 'teamid1_other', category_id: favCategory.id, channel_id: otherChannelId, sort_order: 0},
            ],
            prepareRecordsOnly: false,
        });
        await operator.handleCategories({categories: [favCategory, defaultCategory], prepareRecordsOnly: false});
        await operator.handleChannel({channels: [channel], prepareRecordsOnly: false});
        await operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.CURRENT_TEAM_ID, value: teamId}], prepareRecordsOnly: false});

        const mockClient = {
            updateChannelCategories: jest.fn().mockResolvedValue({}),
            getCategories: jest.fn().mockResolvedValue({categories: []}),
            getCategory: jest.fn(),
        };
        (NetworkManager.getClient as jest.Mock).mockReturnValue(mockClient);

        const result = await toggleFavoriteChannel(serverUrl, channelId, true);

        expect(result).toEqual({data: true});
        expect(mockClient.getCategory).not.toHaveBeenCalled();

        const sent = mockClient.updateChannelCategories.mock.calls[0][2] as CategoryWithChannels[];
        const favorites = sent.find((c) => c.id === favCategory.id);
        const target = sent.find((c) => c.id === defaultCategory.id);
        expect(favorites?.channel_ids).toEqual([otherChannelId]);
        expect(target?.channel_ids).toEqual([channelId]);
    });

    it('should not duplicate the channel when the server already reflects the toggle', async () => {
        await operator.handleCategoryChannels({categoryChannels: [categoryChannels], prepareRecordsOnly: false});
        await operator.handleCategories({categories: [favCategory, defaultCategory], prepareRecordsOnly: false});
        await operator.handleChannel({channels: [channel], prepareRecordsOnly: false});
        await operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.CURRENT_TEAM_ID, value: teamId}], prepareRecordsOnly: false});

        const mockClient = {
            updateChannelCategories: jest.fn().mockResolvedValue({}),
            getCategories: jest.fn().mockResolvedValue({
                categories: [
                    {...favCategory, channel_ids: []},

                    // Server already has it filed under the target category.
                    {...defaultCategory, channel_ids: [channelId]},
                ],
            }),
        };
        (NetworkManager.getClient as jest.Mock).mockReturnValue(mockClient);

        const result = await toggleFavoriteChannel(serverUrl, channelId, true);

        expect(result).toEqual({data: true});
        const sent = mockClient.updateChannelCategories.mock.calls[0][2] as CategoryWithChannels[];
        const target = sent.find((c) => c.id === defaultCategory.id);
        expect(target?.channel_ids).toEqual([channelId]);
    });

    it('should unfavorite DM channel successfully', async () => {
        await operator.handleCategoryChannels({categoryChannels: [categoryChannels], prepareRecordsOnly: false});
        await operator.handleCategories({categories: [favCategory, dmCategory], prepareRecordsOnly: false});
        await operator.handleChannel({channels: [{...channel, type: 'D', display_name: 'displayname'}], prepareRecordsOnly: false});
        await operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.CURRENT_TEAM_ID, value: teamId}], prepareRecordsOnly: false});
        const mockClient = {
            updateChannelCategories: jest.fn().mockResolvedValue({}),
            getCategories: jest.fn().mockResolvedValue({
                categories: [
                    {...favCategory, channel_ids: [channelId]},
                    {...dmCategory, channel_ids: []},
                ],
            }),
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
            getCategories: jest.fn().mockResolvedValue({
                categories: [
                    {...defaultCategory, channel_ids: [channelId]},
                    {...favCategory, channel_ids: []},
                ],
            }),
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
            getCategories: jest.fn().mockResolvedValue({
                categories: [
                    {...defaultCategory, channel_ids: [channelId]},
                    {...favCategory, channel_ids: []},
                ],
            }),
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
            getCategories: jest.fn().mockResolvedValue({categories: []}),
        };
        (NetworkManager.getClient as jest.Mock).mockReturnValue(mockClient);

        const result = await toggleFavoriteChannel(serverUrl, channelId, true);

        expect(result).toEqual({error: 'No favorites category'});
        expect(NetworkManager.getClient).toHaveBeenCalledWith(serverUrl);
    });

    const offTopicCC: CategoryChannel = {
        id: 'teamid1_offtopic',
        category_id: 'default_category_id',
        channel_id: 'offtopic',
        sort_order: 2,
    };
    const townSquareCC: CategoryChannel = {
        id: 'teamid1_townsquare',
        category_id: 'default_category_id',
        channel_id: 'townsquare',
        sort_order: 3,
    };

    // The server always knows all three channels; only the local rows vary.
    const serverCategories: CategoryWithChannels[] = [
        {...defaultCategory, channel_ids: [channelId, 'offtopic', 'townsquare']} as CategoryWithChannels,
        {...favCategory, channel_ids: []} as CategoryWithChannels,
    ];
    const favouriteSetup = async (categoryChannelRows: CategoryChannel[]) => {
        await operator.handleCategoryChannels({categoryChannels: categoryChannelRows, prepareRecordsOnly: false});
        await operator.handleCategories({categories: [favCategory, defaultCategory], prepareRecordsOnly: false});
        await operator.handleChannel({channels: [channel], prepareRecordsOnly: false});
        await operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.CURRENT_TEAM_ID, value: teamId}], prepareRecordsOnly: false});
        const mockClient = {
            updateChannelCategories: jest.fn().mockResolvedValue({}),
            getCategories: jest.fn().mockResolvedValue({categories: serverCategories}),
            getCategory: jest.fn(),
        };
        (NetworkManager.getClient as jest.Mock).mockReturnValue(mockClient);
        return mockClient;
    };
    const sentCategory = (mockClient: {updateChannelCategories: jest.Mock}, type: string) => {
        const [, , categories] = mockClient.updateChannelCategories.mock.calls[0];
        return (categories as CategoryWithChannels[]).find((c) => c.type === type);
    };

    it('should send the remaining channels when favoriting with the sidebar fully synced', async () => {
        const mockClient = await favouriteSetup([
            {...categoryChannels, category_id: defaultCategory.id},
            offTopicCC,
            townSquareCC,
        ]);

        await toggleFavoriteChannel(serverUrl, channelId, false);

        expect(mockClient.getCategory).not.toHaveBeenCalled();
        expect(sentCategory(mockClient, FAVORITES_CATEGORY)?.channel_ids).toEqual([channelId]);
        expect(sentCategory(mockClient, CHANNELS_CATEGORY)?.channel_ids).toEqual(['offtopic', 'townsquare']);
    });

    it('should fetch only the custom source category when local rows are truncated', async () => {
        const customCategory = {
            id: 'custom_category_id',
            team_id: teamId,
            type: 'custom',
        } as Category;
        await operator.handleCategoryChannels({categoryChannels: [{...categoryChannels, category_id: customCategory.id}], prepareRecordsOnly: false});
        await operator.handleCategories({categories: [favCategory, defaultCategory, customCategory], prepareRecordsOnly: false});
        await operator.handleChannel({channels: [channel], prepareRecordsOnly: false});
        await operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.CURRENT_TEAM_ID, value: teamId}], prepareRecordsOnly: false});

        const mockClient = {
            updateChannelCategories: jest.fn().mockResolvedValue({}),
            getCategories: jest.fn().mockResolvedValue({categories: []}),
            getCategory: jest.fn().mockResolvedValue({
                ...customCategory,
                channel_ids: [channelId, 'kept-channel'],
            }),
        };
        (NetworkManager.getClient as jest.Mock).mockReturnValue(mockClient);

        const result = await toggleFavoriteChannel(serverUrl, channelId, false);

        expect(result).toEqual({data: true});
        expect(mockClient.getCategory).toHaveBeenCalledWith('me', teamId, customCategory.id);
        expect(mockClient.getCategory).toHaveBeenCalledTimes(1);
        const sent = mockClient.updateChannelCategories.mock.calls[0][2] as CategoryWithChannels[];
        expect(sent.find((c) => c.id === customCategory.id)?.channel_ids).toEqual(['kept-channel']);
        expect(sent.find((c) => c.id === favCategory.id)?.channel_ids).toEqual([channelId]);
    });

    it('should not replace a custom category when its membership fetch fails', async () => {
        const customCategory = {
            id: 'custom_category_id',
            team_id: teamId,
            type: 'custom',
        } as Category;
        await operator.handleCategoryChannels({categoryChannels: [{...categoryChannels, category_id: customCategory.id}], prepareRecordsOnly: false});
        await operator.handleCategories({categories: [favCategory, defaultCategory, customCategory], prepareRecordsOnly: false});
        await operator.handleChannel({channels: [channel], prepareRecordsOnly: false});
        await operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.CURRENT_TEAM_ID, value: teamId}], prepareRecordsOnly: false});
        const fetchError = new Error('category unavailable');
        const mockClient = {
            updateChannelCategories: jest.fn().mockResolvedValue({}),
            getCategories: jest.fn().mockResolvedValue({categories: []}),
            getCategory: jest.fn().mockRejectedValue(fetchError),
        };
        (NetworkManager.getClient as jest.Mock).mockReturnValue(mockClient);

        const result = await toggleFavoriteChannel(serverUrl, channelId, false);

        expect(mockClient.updateChannelCategories).not.toHaveBeenCalled();
        expect(result).toEqual({error: fetchError});
    });

    it('should not fall back to local rows when a custom category has no channel_ids', async () => {
        const customCategory = {
            id: 'custom_category_id',
            team_id: teamId,
            type: 'custom',
        } as Category;
        await operator.handleCategoryChannels({categoryChannels: [{...categoryChannels, category_id: customCategory.id}], prepareRecordsOnly: false});
        await operator.handleCategories({categories: [favCategory, defaultCategory, customCategory], prepareRecordsOnly: false});
        await operator.handleChannel({channels: [channel], prepareRecordsOnly: false});
        await operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.CURRENT_TEAM_ID, value: teamId}], prepareRecordsOnly: false});
        const mockClient = {
            updateChannelCategories: jest.fn().mockResolvedValue({}),
            getCategories: jest.fn().mockResolvedValue({categories: []}),
            getCategory: jest.fn().mockResolvedValue({...customCategory}),
        };
        (NetworkManager.getClient as jest.Mock).mockReturnValue(mockClient);

        const result = await toggleFavoriteChannel(serverUrl, channelId, false);

        expect(mockClient.updateChannelCategories).not.toHaveBeenCalled();
        expect(result).toEqual({error: 'remote category membership unavailable'});
    });

    it('should handle error during toggle favorite channel', async () => {
        await operator.handleCategoryChannels({categoryChannels: [categoryChannels], prepareRecordsOnly: false});
        await operator.handleCategories({categories: [favCategory, defaultCategory], prepareRecordsOnly: false});
        await operator.handleChannel({channels: [channel], prepareRecordsOnly: false});
        await operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.CURRENT_TEAM_ID, value: teamId}], prepareRecordsOnly: false});
        const mockClient = {
            updateChannelCategories: jest.fn().mockRejectedValue(error),
            getCategories: jest.fn().mockResolvedValue({
                categories: [
                    {...favCategory, channel_ids: [channelId]},
                    {...defaultCategory, channel_ids: []},
                ],
            }),
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
