// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import DatabaseManager from '@database/manager';
import Operator from '@database/operator';
import {
    isRecordChannelEqualToRaw,
    isRecordChannelInfoEqualToRaw,
    isRecordMyChannelEqualToRaw,
    isRecordMyChannelSettingsEqualToRaw,
} from '@database/operator/comparators';
import {
    prepareChannelInfoRecord,
    prepareChannelRecord,
    prepareMyChannelRecord,
    prepareMyChannelSettingsRecord,
} from '@database/operator/prepareRecords/channel';
import {createTestConnection} from '@database/operator/utils/create_test_connection';
import {DatabaseType} from '@typings/database/enums';

jest.mock('@database/manager');

/* eslint-disable  @typescript-eslint/no-explicit-any */

describe('*** Operator: Channel Handlers tests ***', () => {
    let databaseManagerClient: DatabaseManager;
    let operatorClient: Operator;

    beforeAll(async () => {
        databaseManagerClient = new DatabaseManager();
        const database = await databaseManagerClient.createDatabaseConnection({
            shouldAddToDefaultDatabase: true,
            configs: {
                actionsEnabled: true,
                dbName: 'base_handler',
                dbType: DatabaseType.SERVER,
                serverUrl: 'baseHandler.test.com',
            },
        });

        operatorClient = new Operator(database!);
    });

    it('=> HandleChannel: should write to CHANNEL entity', async () => {
        expect.assertions(2);

        const spyOnHandleEntityRecords = jest.spyOn(operatorClient as any, 'handleEntityRecords');

        await createTestConnection({databaseName: 'channel_handler', setActive: true});

        await operatorClient.handleChannel({
            channels: [
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
                    scheme_id: null,
                    props: null,
                    group_constrained: null,
                    shared: null,
                },
            ],
            prepareRecordsOnly: false,
        });

        expect(spyOnHandleEntityRecords).toHaveBeenCalledTimes(1);
        expect(spyOnHandleEntityRecords).toHaveBeenCalledWith({
            fieldName: 'id',
            rawValues: [
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
                    scheme_id: null,
                    props: null,
                    group_constrained: null,
                    shared: null,
                },
            ],
            tableName: 'Channel',
            prepareRecordsOnly: false,
            findMatchingRecordBy: isRecordChannelEqualToRaw,
            operator: prepareChannelRecord,
        });
    });

    it('=> HandleMyChannelSettings: should write to MY_CHANNEL_SETTINGS entity', async () => {
        expect.assertions(2);

        const spyOnHandleEntityRecords = jest.spyOn(operatorClient as any, 'handleEntityRecords');

        await createTestConnection({databaseName: 'channel_handler', setActive: true});

        await operatorClient.handleMyChannelSettings({
            settings: [
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
            ],
            prepareRecordsOnly: false,
        });

        expect(spyOnHandleEntityRecords).toHaveBeenCalledTimes(1);
        expect(spyOnHandleEntityRecords).toHaveBeenCalledWith({
            fieldName: 'channel_id',
            rawValues: [
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
            ],
            tableName: 'MyChannelSettings',
            prepareRecordsOnly: false,
            findMatchingRecordBy: isRecordMyChannelSettingsEqualToRaw,
            operator: prepareMyChannelSettingsRecord,
        });
    });

    it('=> HandleChannelInfo: should write to CHANNEL_INFO entity', async () => {
        expect.assertions(2);

        const spyOnHandleEntityRecords = jest.spyOn(operatorClient as any, 'handleEntityRecords');

        await createTestConnection({databaseName: 'channel_handler', setActive: true});

        await operatorClient.handleChannelInfo({
            channelInfos: [
                {
                    channel_id: 'c',
                    guest_count: 10,
                    header: 'channel info header',
                    member_count: 10,
                    pinned_post_count: 3,
                    purpose: 'sample channel ',
                },
            ],
            prepareRecordsOnly: false,
        });

        expect(spyOnHandleEntityRecords).toHaveBeenCalledTimes(1);

        expect(spyOnHandleEntityRecords).toHaveBeenCalledWith({
            fieldName: 'channel_id',
            rawValues: [
                {
                    channel_id: 'c',
                    guest_count: 10,
                    header: 'channel info header',
                    member_count: 10,
                    pinned_post_count: 3,
                    purpose: 'sample channel ',
                },
            ],
            tableName: 'ChannelInfo',
            prepareRecordsOnly: false,
            findMatchingRecordBy: isRecordChannelInfoEqualToRaw,
            operator: prepareChannelInfoRecord,
        });
    });

    it('=> HandleMyChannel: should write to MY_CHANNEL entity', async () => {
        expect.assertions(2);

        const spyOnHandleEntityRecords = jest.spyOn(operatorClient as any, 'handleEntityRecords');

        await createTestConnection({databaseName: 'channel_handler', setActive: true});

        await operatorClient.handleMyChannel({
            myChannels: [
                {
                    channel_id: 'c',
                    last_post_at: 1617311494451,
                    last_viewed_at: 1617311494451,
                    mentions_count: 3,
                    message_count: 10,
                    roles: 'guest',
                },
            ],
            prepareRecordsOnly: false,
        });

        expect(spyOnHandleEntityRecords).toHaveBeenCalledTimes(1);
        expect(spyOnHandleEntityRecords).toHaveBeenCalledWith({
            fieldName: 'channel_id',
            rawValues: [
                {
                    channel_id: 'c',
                    last_post_at: 1617311494451,
                    last_viewed_at: 1617311494451,
                    mentions_count: 3,
                    message_count: 10,
                    roles: 'guest',
                },
            ],
            tableName: 'MyChannel',
            prepareRecordsOnly: false,
            findMatchingRecordBy: isRecordMyChannelEqualToRaw,
            operator: prepareMyChannelRecord,
        });
    });
});
