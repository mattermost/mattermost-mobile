// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/* eslint-disable max-lines */

import {Preferences} from '@constants';
import DatabaseManager from '@database/manager';
import TestHelper from '@test/test_helper';

import {
    makeCategoryChannelId,
    isUnreadChannel,
    filterArchivedChannels,
    filterAutoclosedDMs,
    filterManuallyClosedDms,
    sortChannels,
    getUnreadIds,
    type ChannelWithMyChannel,
} from './categories';

import type {ServerDatabase} from '@typings/database/database';
import type UserModel from '@typings/database/models/servers/user';

describe('Categories utils', () => {
    const serverUrl = 'baseHandler.test.com';

    const buildChannelsData = () => {
        const dt1 = Date.now();
        const dt2 = Date.now() - (24 * 60 * 60 * 1000);
        const dt3 = Date.now() - (2 * 24 * 60 * 60 * 1000);
        const dt4 = Date.now() - (3 * 24 * 60 * 60 * 1000);

        const channels: Channel[] = [{
            id: 'dm1',
            name: 'me__other1',
            display_name: 'DM 1',
            type: 'D',
            create_at: dt2,
            update_at: dt2,
            delete_at: 0,
            team_id: '123',
            header: '',
            purpose: '',
            last_post_at: dt2,
            creator_id: 'me',
            total_msg_count: 20,
            extra_update_at: 0,
            shared: false,
            scheme_id: null,
            group_constrained: false,
        }, {
            id: 'dm2',
            name: 'me__other2',
            display_name: 'Zandoval 2',
            type: 'D',
            create_at: dt4,
            update_at: dt4,
            delete_at: 0,
            team_id: '123',
            header: '',
            purpose: '',
            last_post_at: dt4,
            creator_id: 'me',
            total_msg_count: 20,
            extra_update_at: 0,
            shared: false,
            scheme_id: null,
            group_constrained: false,
        }, {
            id: 'open-channel',
            name: 'open-channel',
            display_name: 'Open Channel',
            type: 'O',
            create_at: dt1,
            update_at: dt1,
            delete_at: 0,
            team_id: '123',
            header: '',
            purpose: '',
            last_post_at: dt1,
            creator_id: 'me',
            total_msg_count: 20,
            extra_update_at: 0,
            shared: false,
            scheme_id: null,
            group_constrained: false,
        }, {
            id: 'gm1',
            name: 'the_gm_channel_name',
            display_name: 'Mario, Persona 2, Persona 3',
            type: 'G',
            create_at: dt3,
            update_at: dt3,
            delete_at: 0,
            team_id: '123',
            header: '',
            purpose: '',
            last_post_at: dt3,
            creator_id: 'me',
            total_msg_count: 20,
            extra_update_at: 0,
            shared: false,
            scheme_id: null,
            group_constrained: false,
        }];
        const myChannels: ChannelMembership[] = [
            {
                id: 'dm1',
                user_id: 'me',
                channel_id: 'dm1',
                last_post_at: dt2,
                last_viewed_at: dt2,
                last_update_at: dt2,
                mention_count: 0,
                msg_count: 20,
                roles: 'user',
                notify_props: {
                    desktop: 'default',
                    email: 'default',
                    mark_unread: 'mention',
                    push: 'mention',
                    ignore_channel_mentions: 'default',
                },
            },
            {
                id: 'dm2',
                user_id: 'me',
                channel_id: 'dm2',
                last_post_at: dt4,
                last_viewed_at: dt4,
                last_update_at: dt4,
                mention_count: 3,
                msg_count: 23,
                roles: 'user',
                notify_props: {
                    desktop: 'default',
                    email: 'default',
                    mark_unread: 'mention',
                    push: 'mention',
                    ignore_channel_mentions: 'default',
                },
            }, {
                id: 'open-channel',
                user_id: 'me',
                channel_id: 'open-channel',
                last_post_at: dt1,
                last_viewed_at: dt1,
                last_update_at: dt1,
                mention_count: 1,
                msg_count: 21,
                roles: 'user',
                notify_props: {
                    desktop: 'default',
                    email: 'default',
                    mark_unread: 'all',
                    push: 'mention',
                    ignore_channel_mentions: 'default',
                },
            }, {
                id: 'gm1',
                user_id: 'me',
                channel_id: 'gm1',
                last_post_at: dt3,
                last_viewed_at: dt3,
                last_update_at: dt3,
                mention_count: 0,
                msg_count: 0,
                roles: 'user',
                notify_props: {
                    desktop: 'default',
                    email: 'default',
                    mark_unread: 'mention',
                    push: 'mention',
                    ignore_channel_mentions: 'default',
                },
            },
        ];

        return {channels, myChannels};
    };

    const createChannelsDbRecords = async (db: ServerDatabase, channels: Channel[], myChannels: ChannelMembership[]): Promise<ChannelWithMyChannel[]> => {
        const channelModels = await db.operator.handleChannel({channels, prepareRecordsOnly: false});
        const myChannelModels = await db.operator.handleMyChannel({channels, myChannels, prepareRecordsOnly: false});
        return channelModels.map((channel, index) => {
            const myChannel = myChannelModels[index];
            return {
                channel,
                myChannel,
                sortOrder: index,
            };
        });
    };

    beforeEach(async () => {
        await DatabaseManager.init([serverUrl]);
    });

    afterEach(() => {
        DatabaseManager.destroyServerDatabase(serverUrl);
    });

    test('makeCategoryChannelId', () => {
        const teamId = 'my-team-id';
        const channelId = 'my-channel-id';
        const category = makeCategoryChannelId(teamId, channelId);
        expect(category).toBe(`${teamId}_${channelId}`);
    });

    test('isUnreadChannel', async () => {
        const db = DatabaseManager.getServerDatabaseAndOperator(serverUrl);

        const channels: Channel[] = [{
            id: 'c',
            name: 'channel',
            display_name: 'Channel',
            type: 'O',
            create_at: 1,
            update_at: 1,
            delete_at: 0,
            team_id: '123',
            header: '',
            purpose: '',
            last_post_at: 2,
            creator_id: 'me',
            total_msg_count: 20,
            extra_update_at: 0,
            shared: false,
            scheme_id: null,
            group_constrained: false,
        }];
        const myChannels: ChannelMembership[] = [
            {
                id: 'c',
                user_id: 'me',
                channel_id: 'c',
                last_post_at: 1617311494451,
                last_viewed_at: 1617311494451,
                last_update_at: 1617311494451,
                mention_count: 3,
                msg_count: 10,
                roles: 'guest',
                notify_props: {
                    desktop: 'default',
                    email: 'default',
                    mark_unread: 'mention',
                    push: 'mention',
                    ignore_channel_mentions: 'default',
                },
            },
        ];

        const models = await db.operator.handleMyChannel({channels, myChannels, isCRTEnabled: false, prepareRecordsOnly: false});
        expect(models).toHaveLength(1);
        const myChannel = models[0];
        let isUnread = isUnreadChannel(myChannel);
        expect(isUnread).toBe(true);
        await db.database.write(async () => {
            await myChannel.update((record) => {
                record.mentionsCount = 0;
            });
        });

        isUnread = isUnreadChannel(myChannel);
        expect(isUnread).toBe(true);

        const notifyProps: Partial<ChannelNotifyProps> = {mark_unread: 'mention'};
        isUnread = isUnreadChannel(myChannel, notifyProps);
        expect(isUnread).toBe(false);

        isUnread = isUnreadChannel(myChannel, notifyProps, myChannel.id);
        expect(isUnread).toBe(true);
    });

    test('filterArchivedChannels', async () => {
        const db = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const channels: Channel[] = [{
            id: 'channel_1',
            name: 'channel_1',
            display_name: 'Channel 1',
            type: 'O',
            create_at: 1,
            update_at: 1,
            delete_at: 0,
            team_id: '123',
            header: '',
            purpose: '',
            last_post_at: 2,
            creator_id: 'me',
            total_msg_count: 20,
            extra_update_at: 0,
            shared: false,
            scheme_id: null,
            group_constrained: false,
        }, {
            id: 'channel_2',
            name: 'channel_2',
            display_name: 'Channel 2',
            type: 'O',
            create_at: 1,
            update_at: 1,
            delete_at: 123,
            team_id: '123',
            header: '',
            purpose: '',
            last_post_at: 2,
            creator_id: 'me',
            total_msg_count: 20,
            extra_update_at: 0,
            shared: false,
            scheme_id: null,
            group_constrained: false,
        }];
        const myChannels: ChannelMembership[] = [
            {
                id: 'channel_1',
                user_id: 'me',
                channel_id: 'channel_1',
                last_post_at: 1617311494451,
                last_viewed_at: 1617311494451,
                last_update_at: 1617311494451,
                mention_count: 3,
                msg_count: 10,
                roles: 'user',
                notify_props: {
                    desktop: 'default',
                    email: 'default',
                    mark_unread: 'mention',
                    push: 'mention',
                    ignore_channel_mentions: 'default',
                },
            },
            {
                id: 'channel_2',
                user_id: 'me',
                channel_id: 'channel_2',
                last_post_at: 1617311494451,
                last_viewed_at: 1617311494451,
                last_update_at: 1617311494451,
                mention_count: 3,
                msg_count: 10,
                roles: 'user',
                notify_props: {
                    desktop: 'default',
                    email: 'default',
                    mark_unread: 'mention',
                    push: 'mention',
                    ignore_channel_mentions: 'default',
                },
            },
        ];

        const channelModels = await db.operator.handleChannel({channels, prepareRecordsOnly: false});
        const myChannelModels = await db.operator.handleMyChannel({channels, myChannels, prepareRecordsOnly: false});
        const data: ChannelWithMyChannel[] = [{
            channel: channelModels[0],
            myChannel: myChannelModels[0],
            sortOrder: 0,
        }, {
            channel: channelModels[1],
            myChannel: myChannelModels[1],
            sortOrder: 1,
        }];
        let archived = filterArchivedChannels(data, '');
        expect(archived).toHaveLength(1);

        archived = filterArchivedChannels(data, channels[1].id);
        expect(archived).toHaveLength(2);
    });

    test('filterAutoclosedDMs', async () => {
        const db = DatabaseManager.getServerDatabaseAndOperator(serverUrl);

        let result = filterAutoclosedDMs('channels', 3, 'me', '', [], [], {});
        expect(result).toEqual([]);

        const now = Date.now();
        const dt_chan1 = now - (3 * 24 * 60 * 60 * 1000);
        const dt_chan2 = now - (2 * 24 * 60 * 60 * 1000);
        const autoclosePrefs = [
            TestHelper.fakePreferenceModel({
                id: 'pref1',
                userId: 'me',
                category: Preferences.CATEGORIES.CHANNEL_APPROXIMATE_VIEW_TIME,
                name: 'dm1',
                value: `${dt_chan1}`,
            }),
            TestHelper.fakePreferenceModel({
                id: 'pref2',
                userId: 'me',
                category: Preferences.CATEGORIES.CHANNEL_APPROXIMATE_VIEW_TIME,
                name: 'dm2',
                value: `${dt_chan2}`,
            }),
        ];

        const channels: Channel[] = [{
            id: 'dm1',
            name: 'me__other1',
            display_name: 'DM 1',
            type: 'D',
            create_at: 1,
            update_at: 1,
            delete_at: 0,
            team_id: '123',
            header: '',
            purpose: '',
            last_post_at: dt_chan1,
            creator_id: 'me',
            total_msg_count: 20,
            extra_update_at: 0,
            shared: false,
            scheme_id: null,
            group_constrained: false,
        }, {
            id: 'dm2',
            name: 'me__other2',
            display_name: 'DM 2',
            type: 'D',
            create_at: 1,
            update_at: 1,
            delete_at: 0,
            team_id: '123',
            header: '',
            purpose: '',
            last_post_at: dt_chan2,
            creator_id: 'me',
            total_msg_count: 20,
            extra_update_at: 0,
            shared: false,
            scheme_id: null,
            group_constrained: false,
        }];
        const myChannels: ChannelMembership[] = [
            {
                id: 'dm1',
                user_id: 'me',
                channel_id: 'dm1',
                last_post_at: dt_chan1,
                last_viewed_at: dt_chan1,
                last_update_at: dt_chan1,
                mention_count: 0,
                msg_count: 20,
                roles: 'user',
                notify_props: {
                    desktop: 'default',
                    email: 'default',
                    mark_unread: 'mention',
                    push: 'mention',
                    ignore_channel_mentions: 'default',
                },
            },
            {
                id: 'dm2',
                user_id: 'me',
                channel_id: 'dm2',
                last_post_at: dt_chan2,
                last_viewed_at: dt_chan2,
                last_update_at: dt_chan2,
                mention_count: 3,
                msg_count: 10,
                roles: 'user',
                notify_props: {
                    desktop: 'default',
                    email: 'default',
                    mark_unread: 'mention',
                    push: 'mention',
                    ignore_channel_mentions: 'default',
                },
            },
        ];

        const channelModels = await db.operator.handleChannel({channels, prepareRecordsOnly: false});
        const myChannelModels = await db.operator.handleMyChannel({channels, myChannels, prepareRecordsOnly: false});
        const data: ChannelWithMyChannel[] = [{
            channel: channelModels[0],
            myChannel: myChannelModels[0],
            sortOrder: 0,
        }, {
            channel: channelModels[1],
            myChannel: myChannelModels[1],
            sortOrder: 0,
        }];

        result = filterAutoclosedDMs('direct_messages', 3, 'me', '', data, autoclosePrefs, {});
        expect(result.length).toEqual(2);

        result = filterAutoclosedDMs('direct_messages', 3, 'me', 'dm1', data, autoclosePrefs, {});
        expect(result.length).toEqual(2);

        result = filterAutoclosedDMs('direct_messages', 3, 'me', 'dm2', data, autoclosePrefs, {});
        expect(result.length).toEqual(2);

        const lastViewedData: ChannelWithMyChannel[] = [{
            ...data[0],
            myChannel: TestHelper.fakeMyChannelModel({
                ...data[0].myChannel,
                lastViewedAt: 0,
            }),
        }, data[1]];

        const autoclosePrefsNotViewed = [autoclosePrefs[1]];
        result = filterAutoclosedDMs('direct_messages', 3, 'me', '', lastViewedData, autoclosePrefsNotViewed, {});
        expect(result.length).toEqual(1);

        const deactivated = new Map<string, UserModel>();
        deactivated.set('other1', TestHelper.fakeUserModel({
            id: 'other1',
            deleteAt: dt_chan1 + 1,
        }));

        result = filterAutoclosedDMs('direct_messages', 3, 'me', '', data, autoclosePrefs, {}, deactivated);
        expect(result.length).toEqual(1);

        result = filterAutoclosedDMs('direct_messages', 3, 'me', '', data, autoclosePrefs, {}, undefined, 'dm2');
        expect(result[0].channel.id).toEqual('dm2');

        const mockNotUnread: ChannelWithMyChannel[] = [data[0], {
            ...data[1],
            myChannel: TestHelper.fakeMyChannelModel({
                id: data[1].myChannel.id,
                lastViewedAt: 0,
                isUnread: false,
            }),
        }];
        result = filterAutoclosedDMs('direct_messages', 3, 'me', '', mockNotUnread, autoclosePrefs, {}, undefined, 'dm1');
        expect(result[0].channel.id).toEqual('dm1');

        const mockRecent1: ChannelWithMyChannel[] = [{
            ...data[0],
            myChannel: TestHelper.fakeMyChannelModel({
                id: data[0].myChannel.id,
                lastViewedAt: 2,
                isUnread: false,
            }),
        }, {
            ...data[1],
            myChannel: TestHelper.fakeMyChannelModel({
                id: data[1].myChannel.id,
                lastViewedAt: 1,
                isUnread: false,
            }),
        }];

        result = filterAutoclosedDMs('direct_messages', 3, 'me', '', mockRecent1, [], {});
        expect(result[0].channel.id).toEqual('dm1');

        const mockRecent2: ChannelWithMyChannel[] = [{
            ...data[0],
            myChannel: TestHelper.fakeMyChannelModel({
                id: data[0].myChannel.id,
                lastViewedAt: 1,
                isUnread: false,
            }),
        }, {
            ...data[1],
            myChannel: TestHelper.fakeMyChannelModel({
                id: data[1].myChannel.id,
                lastViewedAt: 2,
                isUnread: false,
            }),
        }];

        result = filterAutoclosedDMs('direct_messages', 3, 'me', '', mockRecent2, [], {});
        expect(result[0].channel.id).toEqual('dm2');

        const mockSameLastViewed: ChannelWithMyChannel[] = [{
            ...data[0],
            myChannel: TestHelper.fakeMyChannelModel({
                id: data[0].myChannel.id,
                lastViewedAt: 1,
                isUnread: false,
            }),
        }, {
            ...data[1],
            myChannel: TestHelper.fakeMyChannelModel({
                id: data[1].myChannel.id,
                lastViewedAt: 1,
                isUnread: false,
            }),
        }];

        result = filterAutoclosedDMs('direct_messages', 3, 'me', '', mockSameLastViewed, [], {});
        expect(result[0].channel.id).toEqual('dm1');
    });

    test('filterManuallyClosedDms', async () => {
        const db = DatabaseManager.getServerDatabaseAndOperator(serverUrl);

        const closedDMsPrefs = [
            TestHelper.fakePreferenceModel({
                id: 'pref1',
                userId: 'me',
                category: Preferences.CATEGORIES.DIRECT_CHANNEL_SHOW,
                name: 'dm1',
                value: 'true',
            }),
            TestHelper.fakePreferenceModel({
                id: 'pref2',
                userId: 'me',
                category: Preferences.CATEGORIES.DIRECT_CHANNEL_SHOW,
                name: 'dm2',
                value: 'true',
            }),
            TestHelper.fakePreferenceModel({
                id: 'pref3',
                userId: 'me',
                category: Preferences.CATEGORIES.GROUP_CHANNEL_SHOW,
                name: 'gm1',
                value: 'false',
            }),
        ];

        const {channels, myChannels} = buildChannelsData();
        const data = await createChannelsDbRecords(db, channels, myChannels);

        const notifyProps = myChannels.reduce<Record<string, Partial<ChannelNotifyProps>>>((obj, m) => {
            obj[m.channel_id] = m.notify_props;
            return obj;
        }, {});

        const result = filterManuallyClosedDms(data, notifyProps, closedDMsPrefs, 'me');
        expect(result.length).toEqual(3);
    });

    test('sortChannels', async () => {
        const db = DatabaseManager.getServerDatabaseAndOperator(serverUrl);

        const {channels, myChannels} = buildChannelsData();
        const data = await createChannelsDbRecords(db, channels, myChannels);

        const notifyProps = myChannels.reduce<Record<string, Partial<ChannelNotifyProps>>>((obj, m) => {
            obj[m.channel_id] = m.notify_props;
            return obj;
        }, {});

        let result = sortChannels('recent', data, notifyProps, 'en');
        const recentIds = result.map((r) => r.id);
        expect(recentIds).toEqual(['open-channel', 'dm1', 'gm1', 'dm2']);

        result = sortChannels('manual', data, notifyProps, 'en');
        const manualIds = result.map((r) => r.id);
        expect(manualIds).toEqual(['dm1', 'dm2', 'open-channel', 'gm1']);

        result = sortChannels('alpha', data, notifyProps, 'en');
        const alphaIds = result.map((r) => r.id);
        expect(alphaIds).toEqual(['open-channel', 'dm1', 'gm1', 'dm2']);
    });

    test('getUnreadIds', async () => {
        const db = DatabaseManager.getServerDatabaseAndOperator(serverUrl);

        const {channels, myChannels} = buildChannelsData();
        const data = await createChannelsDbRecords(db, channels, myChannels);

        const notifyProps = myChannels.reduce<Record<string, Partial<ChannelNotifyProps>>>((obj, m) => {
            obj[m.channel_id] = m.notify_props;
            return obj;
        }, {});

        let result = getUnreadIds(data, notifyProps);
        let ids = Array.from(result);
        expect(ids).toEqual(['dm2', 'open-channel']);

        result = getUnreadIds(data, notifyProps, 'dm1');
        ids = Array.from(result);
        expect(ids).toEqual(['dm1', 'dm2', 'open-channel']);
    });
});
