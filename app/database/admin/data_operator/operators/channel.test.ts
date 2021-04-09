// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {
    operateChannelInfoRecord,
    operateChannelRecord, operateMyChannelRecord,
    operateMyChannelSettingsRecord,
} from '@database/admin/data_operator/operators/channel';
import {createConnection} from '@database/admin/data_operator/operators/utils';
import {OperationType} from '@typings/database/enums';

describe('*** CHANNEL Prepare Records Test ***', () => {
    it('=> operateChannelRecord: should return an array of type Channel', async () => {
        expect.assertions(3);

        const database = await createConnection('channel_prepare_records');
        expect(database).toBeTruthy();

        const preparedRecords = await operateChannelRecord({
            action: OperationType.CREATE,
            database: database!,
            value: {
                record: undefined,
                raw: {
                    id: 'kow9j1ttnxwig7tnqgebg7dtipno',
                    create_at: 1600185541285,
                    update_at: 1604401077256,
                    delete_at: 0,
                    team_id: '',
                    type: 'D',
                    display_name: '',
                    name: 'jui1zkzkhh357b4bejephjz5u8daw__9ciscaqbrpd6d8s68k76xb9bte',
                    header: 'https://mattermost)',
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
            },
        });

        expect(preparedRecords).toBeTruthy();
        expect(preparedRecords!.collection.modelClass.name).toBe('Channel');
    });

    it('=> operateMyChannelSettingsRecord: should return an array of type MyChannelSettings', async () => {
        expect.assertions(3);

        const database = await createConnection('channel_prepare_records');
        expect(database).toBeTruthy();

        const preparedRecords = await operateMyChannelSettingsRecord({
            action: OperationType.CREATE,
            database: database!,
            value: {
                record: undefined,
                raw: {
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
            },
        });

        expect(preparedRecords).toBeTruthy();
        expect(preparedRecords!.collection.modelClass.name).toBe('MyChannelSettings');
    });

    it('=> operateChannelInfoRecord: should return an array of type ChannelInfo', async () => {
        expect.assertions(3);

        const database = await createConnection('channel_prepare_records');
        expect(database).toBeTruthy();

        const preparedRecords = await operateChannelInfoRecord({
            action: OperationType.CREATE,
            database: database!,
            value: {
                record: undefined,
                raw: {
                    channel_id: 'c',
                    guest_count: 10,
                    header: 'channel info header',
                    member_count: 10,
                    pinned_post_count: 3,
                    purpose: 'sample channel ',
                },
            },
        });

        expect(preparedRecords).toBeTruthy();
        expect(preparedRecords!.collection.modelClass.name).toBe('ChannelInfo');
    });

    it('=> operateMyChannelRecord: should return an array of type MyChannel', async () => {
        expect.assertions(3);

        const database = await createConnection('channel_prepare_records');
        expect(database).toBeTruthy();

        const preparedRecords = await operateMyChannelRecord({
            action: OperationType.CREATE,
            database: database!,
            value: {
                record: undefined,
                raw: {
                    channel_id: 'cd',
                    last_post_at: 1617311494451,
                    last_viewed_at: 1617311494451,
                    mentions_count: 3,
                    message_count: 10,
                    roles: 'guest',
                },
            },
        });

        expect(preparedRecords).toBeTruthy();
        expect(preparedRecords!.collection.modelClass.name).toBe('MyChannel');
    });
});
