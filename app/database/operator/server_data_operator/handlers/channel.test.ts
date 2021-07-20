// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import DatabaseManager from '@database/manager';
import {
    isRecordChannelEqualToRaw,
    isRecordChannelInfoEqualToRaw,
    isRecordMyChannelEqualToRaw,
    isRecordMyChannelSettingsEqualToRaw,
} from '@database/operator/server_data_operator/comparators';
import {
    transformChannelInfoRecord,
    transformChannelRecord,
    transformMyChannelRecord,
    transformMyChannelSettingsRecord,
} from '@database/operator/server_data_operator/transformers/channel';

import ServerDataOperator from '..';

describe('*** Operator: Channel Handlers tests ***', () => {
    let operator: ServerDataOperator;
    beforeAll(async () => {
        await DatabaseManager.init(['baseHandler.test.com']);
        operator = DatabaseManager.serverDatabases['baseHandler.test.com'].operator;
    });

    it('=> HandleChannel: should write to the CHANNEL table', async () => {
        expect.assertions(2);

        const spyOnHandleRecords = jest.spyOn(operator, 'handleRecords');
        const channels: Channel[] = [
            {
                create_at: 1600185541285,
                creator_id: '',
                delete_at: 0,
                display_name: '',
                extra_update_at: 0,
                group_constrained: null,
                header: '(https://mattermost',
                id: 'kjlw9j1ttnxwig7tnqgebg7dtipno',
                last_post_at: 1617311494451,
                name: 'gh781zkzkhh357b4bejephjz5u8daw__9ciscaqbrpd6d8s68k76xb9bte',
                purpose: '',
                scheme_id: null,
                shared: false,
                team_id: '',
                total_msg_count: 585,
                type: 'D',
                update_at: 1604401077256,
            },
        ];

        await operator.handleChannel({
            channels,
            prepareRecordsOnly: false,
        });

        expect(spyOnHandleRecords).toHaveBeenCalledTimes(1);
        expect(spyOnHandleRecords).toHaveBeenCalledWith({
            fieldName: 'id',
            createOrUpdateRawValues: channels,
            tableName: 'Channel',
            prepareRecordsOnly: false,
            findMatchingRecordBy: isRecordChannelEqualToRaw,
            transformer: transformChannelRecord,
        });
    });

    it('=> HandleMyChannelSettings: should write to the MY_CHANNEL_SETTINGS table', async () => {
        expect.assertions(2);

        const spyOnHandleRecords = jest.spyOn(operator, 'handleRecords');
        const settings: ChannelMembership[] = [
            {
                id: 'c',
                user_id: 'me',
                channel_id: 'c',
                roles: '',
                msg_count: 0,
                mention_count: 0,
                last_viewed_at: 0,
                last_update_at: 0,
                notify_props: {
                    desktop: 'default',
                    email: 'default',
                    mark_unread: 'mention',
                    push: 'mention',
                    ignore_channel_mentions: 'default',
                },
            },
        ];

        await operator.handleMyChannelSettings({
            settings,
            prepareRecordsOnly: false,
        });

        expect(spyOnHandleRecords).toHaveBeenCalledTimes(1);
        expect(spyOnHandleRecords).toHaveBeenCalledWith({
            fieldName: 'id',
            createOrUpdateRawValues: settings,
            tableName: 'MyChannelSettings',
            prepareRecordsOnly: false,
            findMatchingRecordBy: isRecordMyChannelSettingsEqualToRaw,
            transformer: transformMyChannelSettingsRecord,
        });
    });

    it('=> HandleChannelInfo: should write to the CHANNEL_INFO table', async () => {
        expect.assertions(2);

        const spyOnHandleRecords = jest.spyOn(operator, 'handleRecords');
        const channelInfos = [
            {
                id: 'c',
                guest_count: 10,
                header: 'channel info header',
                member_count: 10,
                pinned_post_count: 3,
                purpose: 'sample channel ',
            },
        ];

        await operator.handleChannelInfo({
            channelInfos,
            prepareRecordsOnly: false,
        });

        expect(spyOnHandleRecords).toHaveBeenCalledTimes(1);

        expect(spyOnHandleRecords).toHaveBeenCalledWith({
            fieldName: 'id',
            createOrUpdateRawValues: channelInfos,
            tableName: 'ChannelInfo',
            prepareRecordsOnly: false,
            findMatchingRecordBy: isRecordChannelInfoEqualToRaw,
            transformer: transformChannelInfoRecord,
        });
    });

    it('=> HandleMyChannel: should write to the MY_CHANNEL table', async () => {
        expect.assertions(2);

        const spyOnHandleRecords = jest.spyOn(operator, 'handleRecords');
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

        await operator.handleMyChannel({
            myChannels,
            prepareRecordsOnly: false,
        });

        expect(spyOnHandleRecords).toHaveBeenCalledTimes(1);
        expect(spyOnHandleRecords).toHaveBeenCalledWith({
            fieldName: 'id',
            createOrUpdateRawValues: myChannels,
            tableName: 'MyChannel',
            prepareRecordsOnly: false,
            findMatchingRecordBy: isRecordMyChannelEqualToRaw,
            transformer: transformMyChannelRecord,
        });
    });
});
