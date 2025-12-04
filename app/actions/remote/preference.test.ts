// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/* eslint-disable max-lines */

import {Preferences} from '@constants';
import {SYSTEM_IDENTIFIERS} from '@constants/database';
import DatabaseManager from '@database/manager';
import NetworkManager from '@managers/network_manager';
import {querySavedPostsPreferences, queryPreferencesByCategoryAndName} from '@queries/servers/preference';
import TestHelper from '@test/test_helper';

import {
    fetchMyPreferences,
    saveFavoriteChannel,
    savePostPreference,
    savePreference,
    deleteSavedPost,
    openChannelIfNeeded,
    openAllUnreadChannels,
    setDirectChannelVisible,
    savePreferredSkinTone,
} from './preference';

import type {PreferenceModel} from '@database/models/server';
import type ServerDataOperator from '@database/operator/server_data_operator';

const serverUrl = 'baseHandler.test.com';
let operator: ServerDataOperator;

const teamId = 'teamid1';
const channelId = 'channelid1';
const channel: Channel = {
    id: channelId,
    display_name: 'channelname',
    team_id: teamId,
    total_msg_count: 0,
} as Channel;

const user1 = {id: 'userid1', username: 'user1', email: 'user1@mattermost.com', roles: ''} as UserProfile;

const preference1 = {category: 'category1', name: 'name1', user_id: user1.id, value: 'value1'} as PreferenceType;
const post1 = TestHelper.fakePost({channel_id: channelId, id: 'postid1'});

const throwFunc = () => {
    throw Error('error');
};

jest.mock('@queries/servers/preference');

const mockClient = {
    getMyPreferences: jest.fn(() => [preference1]),
    savePreferences: jest.fn(),
    deletePreferences: jest.fn(),
};

beforeAll(() => {
    // eslint-disable-next-line
    // @ts-ignore
    NetworkManager.getClient = () => mockClient;
});

beforeEach(async () => {
    await DatabaseManager.init([serverUrl]);
    operator = DatabaseManager.serverDatabases[serverUrl]!.operator;
});

afterEach(async () => {
    await DatabaseManager.destroyServerDatabase(serverUrl);
});

describe('preferences', () => {
    it('fetchMyPreferences - handle not found database', async () => {
        const result = await fetchMyPreferences('foo');
        expect(result).toBeDefined();
        expect(result.error).toBeDefined();
    });

    it('fetchMyPreferences - base case', async () => {
        const result = await fetchMyPreferences(serverUrl);
        expect(result).toBeDefined();
        expect(result.error).toBeUndefined();
        expect(result.preferences).toBeDefined();
        expect(result.preferences?.length).toBe(1);
    });

    it('saveFavoriteChannel - handle not found database', async () => {
        const result = await saveFavoriteChannel('foo', '', false);
        expect(result).toBeDefined();
        expect(result.error).toBeDefined();
    });

    it('saveFavoriteChannel - base case', async () => {
        await operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.CURRENT_USER_ID, value: user1.id}], prepareRecordsOnly: false});

        const result = await saveFavoriteChannel(serverUrl, channelId, true);
        expect(result).toBeDefined();
        expect(result.error).toBeUndefined();
        expect(result.preferences).toBeDefined();
        expect(result.preferences?.length).toBe(0); // Favourite channel preferences are not stored in the database
    });

    it('savePostPreference - handle not found database', async () => {
        const result = await savePostPreference('foo', '');
        expect(result).toBeDefined();
        expect(result.error).toBeDefined();
    });

    it('savePostPreference - base case', async () => {
        await operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.CURRENT_USER_ID, value: user1.id}], prepareRecordsOnly: false});

        const result = await savePostPreference(serverUrl, post1.id);
        expect(result).toBeDefined();
        expect(result.error).toBeUndefined();
        expect(result.preferences).toBeDefined();
        expect(result.preferences?.length).toBe(1);
        expect(result.preferences?.[0].category).toBe(Preferences.CATEGORIES.SAVED_POST);
    });

    it('savePreference - handle error', async () => {
        mockClient.savePreferences.mockImplementationOnce(jest.fn(throwFunc));

        const result = await savePreference(serverUrl, [preference1]);
        expect(result).toBeDefined();
        expect(result.error).toBeDefined();
    });

    it('savePreference - empty preferences', async () => {
        const result = await savePreference(serverUrl, []);
        expect(result).toBeDefined();
        expect(result.error).toBeUndefined();
        expect(result.preferences).toBeDefined();
        expect(result.preferences?.length).toBe(0);
    });

    it('deleteSavedPost - handle not found database', async () => {
        const result = await deleteSavedPost('foo', '');
        expect(result).toBeDefined();
        expect(result.error).toBeDefined();
    });

    it('deleteSavedPost - base case', async () => {
        await operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.CURRENT_USER_ID, value: user1.id}], prepareRecordsOnly: false});

        const prefModel = {
            user_id: user1.id,
            name: post1.id,
            category: Preferences.CATEGORIES.SAVED_POST,
            value: 'true',
            destroyPermanently: jest.fn(),
        } as unknown as PreferenceModel;
        (querySavedPostsPreferences as jest.Mock).mockReturnValueOnce({fetch: jest.fn(() => [prefModel])});

        const result = await deleteSavedPost(serverUrl, post1.id);
        expect(result).toBeDefined();
        expect(result.error).toBeUndefined();
        expect(result.preference).toBeDefined();
        expect(prefModel.destroyPermanently).toHaveBeenCalledTimes(1);
    });

    it('openChannelIfNeeded - handle not found database', async () => {
        const result = await openChannelIfNeeded('foo', '') as {error: unknown};
        expect(result).toBeDefined();
        expect(result.error).toBeDefined();
    });

    it('openChannelIfNeeded - base case', async () => {
        await operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.CURRENT_USER_ID, value: user1.id}], prepareRecordsOnly: false});

        const {DIRECT_CHANNEL_SHOW, GROUP_CHANNEL_SHOW} = Preferences.CATEGORIES;
        const dmPrefModel = {
            user_id: user1.id,
            name: channelId,
            category: DIRECT_CHANNEL_SHOW,
            value: 'true',
        } as unknown as PreferenceModel;
        const gmPrefModel = {
            user_id: user1.id,
            name: 'gmid',
            category: GROUP_CHANNEL_SHOW,
            value: 'true',
        } as unknown as PreferenceModel;
        (queryPreferencesByCategoryAndName as jest.Mock).mockReturnValue({fetch: jest.fn((d, c) => (c === DIRECT_CHANNEL_SHOW ? [dmPrefModel] : [gmPrefModel]))});

        await operator.handleChannel({channels: [{...channel, type: 'D'}], prepareRecordsOnly: false});

        const result = await openChannelIfNeeded(serverUrl, channelId) as {preferences?: PreferenceModel[]; error: unknown};
        expect(result).toBeDefined();
        expect(result.error).toBeUndefined();
        expect(result.preferences).toBeDefined();
        expect(result.preferences?.length).toBe(2);
    });

    it('openChannelIfNeeded - not dm/gm', async () => {
        await operator.handleChannel({channels: [{...channel, type: 'O'}], prepareRecordsOnly: false});

        const result = await openChannelIfNeeded(serverUrl, channelId);
        expect(result).toMatchObject({});
    });

    it('openAllUnreadChannels - handle not found database', async () => {
        const result = await openAllUnreadChannels('foo');
        expect(result).toBeDefined();
        expect(result.error).toBeDefined();
    });

    it('openAllUnreadChannels - base case', async () => {
        await operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.CURRENT_USER_ID, value: user1.id}], prepareRecordsOnly: false});

        const {DIRECT_CHANNEL_SHOW, GROUP_CHANNEL_SHOW} = Preferences.CATEGORIES;
        const dmPrefModel = {
            user_id: user1.id,
            name: channelId,
            category: DIRECT_CHANNEL_SHOW,
            value: 'true',
        } as unknown as PreferenceModel;
        const gmPrefModel = {
            user_id: user1.id,
            name: 'gmid',
            category: GROUP_CHANNEL_SHOW,
            value: 'true',
        } as unknown as PreferenceModel;
        (queryPreferencesByCategoryAndName as jest.Mock).mockReturnValue({fetch: jest.fn((d, c) => (c === DIRECT_CHANNEL_SHOW ? [dmPrefModel] : [gmPrefModel]))});

        await operator.handleChannel({channels: [{...channel, type: 'D'}], prepareRecordsOnly: false});

        const result = await openAllUnreadChannels(serverUrl);
        expect(result).toBeDefined();
        expect(result.error).toBeUndefined();
        expect(result.preferences).toBeDefined();
        expect(result.preferences?.length).toBe(0); // no unread channels
    });

    it('setDirectChannelVisible - handle not found database', async () => {
        const result = await setDirectChannelVisible('foo', '') as {error: unknown};
        expect(result).toBeDefined();
        expect(result.error).toBeDefined();
    });

    it('setDirectChannelVisible - base case', async () => {
        await operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.CURRENT_USER_ID, value: user1.id}], prepareRecordsOnly: false});
        await operator.handleChannel({channels: [{...channel, type: 'D'}], prepareRecordsOnly: false});

        const result = await setDirectChannelVisible(serverUrl, channelId) as {preferences?: PreferenceModel[]; error: unknown};
        expect(result).toBeDefined();
        expect(result.error).toBeUndefined();
        expect(result.preferences).toBeDefined();
        expect(result.preferences?.length).toBe(1);
        expect(result.preferences?.[0].category).toBe(Preferences.CATEGORIES.DIRECT_CHANNEL_SHOW);
        expect(result.preferences?.[0].value).toBe('true');
    });

    it('setDirectChannelVisible - no channel', async () => {
        const result = await setDirectChannelVisible(serverUrl, channelId);
        expect(result).toMatchObject({});
    });

    it('savePreferredSkinTone - handle not found database', async () => {
        const result = await savePreferredSkinTone('foo', '');
        expect(result).toBeDefined();
        expect(result.error).toBeDefined();
    });

    it('savePreferredSkinTone - base case', async () => {
        await operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.CURRENT_USER_ID, value: user1.id}], prepareRecordsOnly: false});

        const result = await savePreferredSkinTone(serverUrl, 'tone');
        expect(result).toBeDefined();
        expect(result.error).toBeUndefined();
        expect(result.preferences).toBeDefined();
        expect(result.preferences?.length).toBe(1);
        expect(result.preferences?.[0].category).toBe(Preferences.CATEGORIES.EMOJI);
        expect(result.preferences?.[0].value).toBe('tone');
    });
});
