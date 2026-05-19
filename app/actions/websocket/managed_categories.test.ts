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

import {handleManagedChannelCategoriesPropertyValuesUpdated} from './managed_categories';

jest.mock('@actions/local/category', () => ({
    removeChannelFromManagedCategoryIfNeeded: jest.fn(),
}));
jest.mock('@actions/remote/category', () => ({
    addChannelToManagedCategoryIfNeeded: jest.fn(),
}));
jest.mock('@helpers/sidebar/managed_categories_merge', () => ({
    fetchManagedCategoryPropertyIds: jest.fn(),
}));
jest.mock('@queries/servers/categories', () => ({
    getManagedCategoryForChannel: jest.fn(),
}));
jest.mock('@queries/servers/channel', () => ({
    getChannelById: jest.fn(),
}));
jest.mock('@queries/servers/system', () => ({
    getConfigValue: jest.fn(),
}));
jest.mock('@utils/log', () => ({logDebug: jest.fn()}));

describe('handleManagedChannelCategoriesPropertyValuesUpdated', () => {
    const serverUrl = 'http://test.server.com';
    const propertyIds = {groupId: 'g1', fieldId: 'f1'};
    const channelId = 'channel1';
    const teamId = 'team1';

    const makeMsg = (overrides: Partial<PropertyValuesUpdatedData> = {}): WebSocketMessage => ({
        data: {
            object_type: 'channel',
            target_id: channelId,
            values: JSON.stringify([{group_id: propertyIds.groupId, field_id: propertyIds.fieldId, value: 'Engineering'}]),
            ...overrides,
        },
    } as WebSocketMessage);

    beforeEach(async () => {
        jest.clearAllMocks();
        await DatabaseManager.init([serverUrl]);
        (getConfigValue as jest.Mock).mockResolvedValue('true');
        EphemeralStore.setManagedCategoryPropertyIds(serverUrl, propertyIds);
        (getChannelById as jest.Mock).mockResolvedValue({id: channelId, teamId});
        (getManagedCategoryForChannel as jest.Mock).mockResolvedValue(undefined);
    });

    afterEach(async () => {
        EphemeralStore.clearManagedCategoryPropertyIds(serverUrl);
        await DatabaseManager.destroyServerDatabase(serverUrl);
    });

    it('should skip when feature is disabled', async () => {
        (getConfigValue as jest.Mock).mockResolvedValue('false');

        await handleManagedChannelCategoriesPropertyValuesUpdated(serverUrl, makeMsg());

        expect(addChannelToManagedCategoryIfNeeded).not.toHaveBeenCalled();
    });

    it('should skip when object_type is not channel', async () => {
        await handleManagedChannelCategoriesPropertyValuesUpdated(serverUrl, makeMsg({object_type: 'post'}));

        expect(addChannelToManagedCategoryIfNeeded).not.toHaveBeenCalled();
    });

    it('should skip when target_id is missing', async () => {
        await handleManagedChannelCategoriesPropertyValuesUpdated(serverUrl, makeMsg({target_id: ''}));

        expect(addChannelToManagedCategoryIfNeeded).not.toHaveBeenCalled();
    });

    it('should skip when values array is empty', async () => {
        await handleManagedChannelCategoriesPropertyValuesUpdated(serverUrl, makeMsg({values: '[]'}));

        expect(addChannelToManagedCategoryIfNeeded).not.toHaveBeenCalled();
    });

    it('should fetch propertyIds when not cached and skip if still not found', async () => {
        EphemeralStore.clearManagedCategoryPropertyIds(serverUrl);
        (fetchManagedCategoryPropertyIds as jest.Mock).mockResolvedValue(undefined);

        await handleManagedChannelCategoriesPropertyValuesUpdated(serverUrl, makeMsg());

        expect(fetchManagedCategoryPropertyIds).toHaveBeenCalledWith(serverUrl);
        expect(addChannelToManagedCategoryIfNeeded).not.toHaveBeenCalled();
    });

    it('should skip when no matching property value found', async () => {
        const msg = makeMsg({
            values: JSON.stringify([{group_id: 'other', field_id: 'other', value: 'X'}]),
        });

        await handleManagedChannelCategoriesPropertyValuesUpdated(serverUrl, msg);

        expect(addChannelToManagedCategoryIfNeeded).not.toHaveBeenCalled();
    });

    it('should skip when channel is not found in the database', async () => {
        (getChannelById as jest.Mock).mockResolvedValue(undefined);

        await handleManagedChannelCategoriesPropertyValuesUpdated(serverUrl, makeMsg());

        expect(addChannelToManagedCategoryIfNeeded).not.toHaveBeenCalled();
    });

    it('should skip when channel has no teamId', async () => {
        (getChannelById as jest.Mock).mockResolvedValue({id: channelId, teamId: undefined});

        await handleManagedChannelCategoriesPropertyValuesUpdated(serverUrl, makeMsg());

        expect(addChannelToManagedCategoryIfNeeded).not.toHaveBeenCalled();
    });

    it('should add channel to category when categoryName is set and not already there', async () => {
        const channel = {id: channelId, teamId};
        (getChannelById as jest.Mock).mockResolvedValue(channel);
        (getManagedCategoryForChannel as jest.Mock).mockResolvedValue(undefined);

        await handleManagedChannelCategoriesPropertyValuesUpdated(serverUrl, makeMsg());

        expect(removeChannelFromManagedCategoryIfNeeded).toHaveBeenCalledWith(serverUrl, teamId, channelId);
        expect(addChannelToManagedCategoryIfNeeded).toHaveBeenCalledWith(serverUrl, channel);
    });

    it('should skip re-adding when channel is already in the same managed category', async () => {
        (getManagedCategoryForChannel as jest.Mock).mockResolvedValue({displayName: 'Engineering'});

        await handleManagedChannelCategoriesPropertyValuesUpdated(serverUrl, makeMsg());

        expect(addChannelToManagedCategoryIfNeeded).not.toHaveBeenCalled();
    });

    it('should only remove when categoryName is empty', async () => {
        const msg = makeMsg({
            values: JSON.stringify([{group_id: propertyIds.groupId, field_id: propertyIds.fieldId, value: ''}]),
        });

        await handleManagedChannelCategoriesPropertyValuesUpdated(serverUrl, msg);

        expect(removeChannelFromManagedCategoryIfNeeded).toHaveBeenCalledWith(serverUrl, teamId, channelId);
        expect(addChannelToManagedCategoryIfNeeded).not.toHaveBeenCalled();
    });
});
