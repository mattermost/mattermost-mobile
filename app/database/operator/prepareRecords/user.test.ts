// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import {
    prepareChannelMembershipRecord,
    preparePreferenceRecord,
    prepareReactionRecord,
    prepareUserRecord,
} from '@database/operator/prepareRecords/user';

// See LICENSE.txt for license information.
import {createTestConnection} from '@database/operator/utils/create_test_connection';
import {OperationType} from '@typings/database/enums';

describe('*** USER Prepare Records Test ***', () => {
    it('=> prepareChannelMembershipRecord: should return an array of type ChannelMembership', async () => {
        expect.assertions(3);

        const database = await createTestConnection({databaseName: 'user_prepare_records', setActive: true});
        expect(database).toBeTruthy();

        const preparedRecords = await prepareChannelMembershipRecord({
            action: OperationType.CREATE,
            database: database!,
            value: {
                record: undefined,
                raw: {
                    channel_id: '17bfnb1uwb8epewp4q3x3rx9go',
                    user_id: '9ciscaqbrpd6d8s68k76xb9bte',
                    roles: 'wqyby5r5pinxxdqhoaomtacdhc',
                    last_viewed_at: 1613667352029,
                    msg_count: 3864,
                    mention_count: 0,
                    notify_props: {
                        desktop: 'default',
                        email: 'default',
                        ignore_channel_mentions: 'default',
                        mark_unread: 'mention',
                        push: 'default',
                    },
                    last_update_at: 1613667352029,
                    scheme_guest: false,
                    scheme_user: true,
                    scheme_admin: false,
                    explicit_roles: '',
                },
            },
        });

        expect(preparedRecords).toBeTruthy();
        expect(preparedRecords!.collection.modelClass.name).toBe('ChannelMembership');
    });

    it('=> preparePreferenceRecord: should return an array of type Preference', async () => {
        expect.assertions(3);

        const database = await createTestConnection({databaseName: 'user_prepare_records', setActive: true});
        expect(database).toBeTruthy();

        const preparedRecords = await preparePreferenceRecord({
            action: OperationType.CREATE,
            database: database!,
            value: {
                record: undefined,
                raw: {user_id: '9ciscaqbrpd6d8s68k76xb9bte', category: 'tutorial_step', name: '9ciscaqbrpd6d8s68k76xb9bte', value: '2'},
            },
        });

        expect(preparedRecords).toBeTruthy();
        expect(preparedRecords!.collection.modelClass.name).toBe('Preference');
    });

    it('=> prepareReactionRecord: should return an array of type Reaction', async () => {
        expect.assertions(3);

        const database = await createTestConnection({databaseName: 'user_prepare_records', setActive: true});
        expect(database).toBeTruthy();

        const preparedRecords = await prepareReactionRecord({
            action: OperationType.CREATE,
            database: database!,
            value: {
                record: undefined,
                raw: {
                    id: 'ps81iqbddesfby8jayz7owg4yypoo',
                    user_id: 'q3mzxua9zjfczqakxdkowc6u6yy',
                    post_id: 'ps81iqbddesfby8jayz7owg4yypoo',
                    emoji_name: 'thumbsup',
                    create_at: 1596032651748,
                    update_at: 1608253011321,
                    delete_at: 0,
                },
            },
        });

        expect(preparedRecords).toBeTruthy();
        expect(preparedRecords!.collection.modelClass.name).toBe('Reaction');
    });

    it('=> prepareUserRecord: should return an array of type User', async () => {
        expect.assertions(3);

        const database = await createTestConnection({databaseName: 'user_prepare_records', setActive: true});
        expect(database).toBeTruthy();

        const preparedRecords = await prepareUserRecord({
            action: OperationType.CREATE,
            database: database!,
            value: {
                record: undefined,
                raw: {
                    id: '9ciscaqbrpd6d8s68k76xb9bte',
                    is_bot: false,
                    create_at: 1599457495881,
                    update_at: 1607683720173,
                    delete_at: 0,
                    username: 'a.l',
                    auth_service: 'saml',
                    email: 'a.l@mattermost.com',
                    email_verified: true,
                    nickname: '',
                    first_name: 'A',
                    last_name: 'L',
                    position: 'Mobile Engineer',
                    roles: 'system_user',
                    props: {},
                    notify_props: {
                        desktop: 'all',
                        desktop_sound: true,
                        email: true,
                        first_name: true,
                        mention_keys: '',
                        push: 'mention',
                        channel: true,
                        auto_responder_active: false,
                        auto_responder_message: 'Hello, I am out of office and unable to respond to messages.',
                        comments: 'never',
                        desktop_notification_sound: 'Hello',
                        push_status: 'online',
                    },
                    last_password_update: 1604323112537,
                    last_picture_update: 1604686302260,
                    locale: 'en',
                    timezone: {
                        automaticTimezone: 'Indian/Mauritius',
                        manualTimezone: '',
                        useAutomaticTimezone: true,
                    },
                },
            },
        });

        expect(preparedRecords).toBeTruthy();
        expect(preparedRecords!.collection.modelClass.name).toBe('User');
    });
});
