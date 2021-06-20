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

import type {RawChannel} from '@typings/database/database';

describe('*** Operator: Channel Handlers tests ***', () => {
    let operator: ServerDataOperator;
    beforeAll(async () => {
        await DatabaseManager.init(['baseHandler.test.com']);
        operator = DatabaseManager.serverDatabases['baseHandler.test.com'].operator;
    });

    it('=> HandleChannel: should write to CHANNEL entity', async () => {
        expect.assertions(2);

        const spyOnHandleEntityRecords = jest.spyOn(operator, 'handleEntityRecords');
        const channels: RawChannel[] = [
            {
                id: 'kjlw9j1ttnxwig7tnqgebg7dtipno',
                create_at: 1600185541285,
                update_at: 1604401077256,
                delete_at: 0,
                team_id: '',
                type: 'D',
                display_name: '',
                name: 'gh781zkzkhh357b4bejephjz5u8daw__9ciscaqbrpd6d8s68k76xb9bte',
                header: '(https://mattermost',
                purpose: '',
                last_post_at: 1617311494451,
                total_msg_count: 585,
                extra_update_at: 0,
                creator_id: '',
                group_constrained: null,
                shared: false,
                props: null,
                scheme_id: null,
            },
        ];

        await operator.handleChannel({
            channels,
            prepareRecordsOnly: false,
        });

        expect(spyOnHandleEntityRecords).toHaveBeenCalledTimes(1);
        expect(spyOnHandleEntityRecords).toHaveBeenCalledWith({
            fieldName: 'id',
            createOrUpdateRawValues: channels,
            tableName: 'Channel',
            prepareRecordsOnly: false,
            findMatchingRecordBy: isRecordChannelEqualToRaw,
            transformer: transformChannelRecord,
        });
    });

    it('=> HandleMyChannelSettings: should write to MY_CHANNEL_SETTINGS entity', async () => {
        expect.assertions(2);

        const spyOnHandleEntityRecords = jest.spyOn(operator, 'handleEntityRecords');
        const settings = [
            {
                channel_id: 'c',
                notify_props: {
                    desktop: 'all',
                    desktop_sound: true,
                    email: true,
                    first_name: true,
                    mention_keys: '',
                    push: 'mention',
                    channel: true,
                },
            },
        ];

        await operator.handleMyChannelSettings({
            settings,
            prepareRecordsOnly: false,
        });

        expect(spyOnHandleEntityRecords).toHaveBeenCalledTimes(1);
        expect(spyOnHandleEntityRecords).toHaveBeenCalledWith({
            fieldName: 'channel_id',
            createOrUpdateRawValues: settings,
            tableName: 'MyChannelSettings',
            prepareRecordsOnly: false,
            findMatchingRecordBy: isRecordMyChannelSettingsEqualToRaw,
            transformer: transformMyChannelSettingsRecord,
        });
    });

    it('=> HandleChannelInfo: should write to CHANNEL_INFO entity', async () => {
        expect.assertions(2);

        const spyOnHandleEntityRecords = jest.spyOn(operator as any, 'handleEntityRecords');
        const channelInfos = [
            {
                channel_id: 'c',
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

        expect(spyOnHandleEntityRecords).toHaveBeenCalledTimes(1);

        expect(spyOnHandleEntityRecords).toHaveBeenCalledWith({
            fieldName: 'channel_id',
            createOrUpdateRawValues: channelInfos,
            tableName: 'ChannelInfo',
            prepareRecordsOnly: false,
            findMatchingRecordBy: isRecordChannelInfoEqualToRaw,
            transformer: transformChannelInfoRecord,
        });
    });

    it('=> HandleMyChannel: should write to MY_CHANNEL entity', async () => {
        expect.assertions(2);

        const spyOnHandleEntityRecords = jest.spyOn(operator, 'handleEntityRecords');
        const myChannels = [
            {
                channel_id: 'c',
                last_post_at: 1617311494451,
                last_viewed_at: 1617311494451,
                mentions_count: 3,
                message_count: 10,
                roles: 'guest',
            },
        ];

        await operator.handleMyChannel({
            myChannels,
            prepareRecordsOnly: false,
        });

        expect(spyOnHandleEntityRecords).toHaveBeenCalledTimes(1);
        expect(spyOnHandleEntityRecords).toHaveBeenCalledWith({
            fieldName: 'channel_id',
            createOrUpdateRawValues: myChannels,
            tableName: 'MyChannel',
            prepareRecordsOnly: false,
            findMatchingRecordBy: isRecordMyChannelEqualToRaw,
            transformer: transformMyChannelRecord,
        });
    });
});
