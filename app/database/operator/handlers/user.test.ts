// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {DataOperator} from '@database/operator';
import {
    isRecordChannelMembershipEqualToRaw,
    isRecordPreferenceEqualToRaw,
    isRecordUserEqualToRaw,
} from '@database/operator/comparators';
import {
    prepareChannelMembershipRecord,
    preparePreferenceRecord,
    prepareUserRecord,
} from '@database/operator/prepareRecords/user';
import {createTestConnection} from '@database/operator/utils/create_test_connection';

jest.mock('@database/manager');

/* eslint-disable  @typescript-eslint/no-explicit-any */

describe('*** Operator: User Handlers tests ***', () => {
    it('=> HandleReactions: should write to both Reactions and CustomEmoji entities', async () => {
        expect.assertions(2);

        await createTestConnection({databaseName: 'user_handler', setActive: true});

        const spyOnPrepareRecords = jest.spyOn(DataOperator as any, 'prepareRecords');
        const spyOnBatchOperation = jest.spyOn(DataOperator as any, 'batchOperations');

        await DataOperator.handleReactions({
            reactions: [
                {
                    create_at: 1608263728086,
                    delete_at: 0,
                    emoji_name: 'p4p1',
                    post_id: '4r9jmr7eqt8dxq3f9woypzurry',
                    update_at: 1608263728077,
                    user_id: 'ooumoqgq3bfiijzwbn8badznwc',
                },
            ],
            prepareRecordsOnly: false,
        });

        // Called twice:  Once for Reaction record and once for CustomEmoji record
        expect(spyOnPrepareRecords).toHaveBeenCalledTimes(2);

        // Only one batch operation for both entities
        expect(spyOnBatchOperation).toHaveBeenCalledTimes(1);
    });

    it('=> HandleUsers: should write to User entity', async () => {
        expect.assertions(2);

        const users = [
            {
                id: '9ciscaqbrpd6d8s68k76xb9bte',
                create_at: 1599457495881,
                update_at: 1607683720173,
                delete_at: 0,
                username: 'a.l',
                auth_service: 'saml',
                email: 'a.l@mattermost.com',
                email_verified: true,
                is_bot: false,
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
        ];

        const spyOnHandleEntityRecords = jest.spyOn(DataOperator as any, 'handleEntityRecords');

        await createTestConnection({databaseName: 'user_handler', setActive: true});

        await DataOperator.handleUsers({users, prepareRecordsOnly: false});

        expect(spyOnHandleEntityRecords).toHaveBeenCalledTimes(1);
        expect(spyOnHandleEntityRecords).toHaveBeenCalledWith({
            fieldName: 'id',
            rawValues: [
                {
                    id: '9ciscaqbrpd6d8s68k76xb9bte',
                    create_at: 1599457495881,
                    update_at: 1607683720173,
                    delete_at: 0,
                    username: 'a.l',
                    auth_service: 'saml',
                    email: 'a.l@mattermost.com',
                    email_verified: true,
                    is_bot: false,
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
            ],
            tableName: 'User',
            prepareRecordsOnly: false,
            findMatchingRecordBy: isRecordUserEqualToRaw,
            operator: prepareUserRecord,
        });
    });

    it('=> HandlePreferences: should write to PREFERENCE entity', async () => {
        expect.assertions(2);

        const spyOnHandleEntityRecords = jest.spyOn(DataOperator as any, 'handleEntityRecords');

        await createTestConnection({databaseName: 'user_handler', setActive: true});

        await DataOperator.handlePreferences({
            preferences: [
                {
                    user_id: '9ciscaqbrpd6d8s68k76xb9bte',
                    category: 'group_channel_show',
                    name: 'qj91hepgjfn6xr4acm5xzd8zoc',
                    value: 'true',
                },
                {
                    user_id: '9ciscaqbrpd6d8s68k76xb9bte',
                    category: 'notifications',
                    name: 'email_interval',
                    value: '30',
                },
                {
                    user_id: '9ciscaqbrpd6d8s68k76xb9bte',
                    category: 'theme',
                    name: '',
                    value:
                        '{"awayIndicator":"#c1b966","buttonBg":"#4cbba4","buttonColor":"#ffffff","centerChannelBg":"#2f3e4e","centerChannelColor":"#dddddd","codeTheme":"solarized-dark","dndIndicator":"#e81023","errorTextColor":"#ff6461","image":"/static/files/0b8d56c39baf992e5e4c58d74fde0fd6.png","linkColor":"#a4ffeb","mentionBg":"#b74a4a","mentionColor":"#ffffff","mentionHighlightBg":"#984063","mentionHighlightLink":"#a4ffeb","newMessageSeparator":"#5de5da","onlineIndicator":"#65dcc8","sidebarBg":"#1b2c3e","sidebarHeaderBg":"#1b2c3e","sidebarHeaderTextColor":"#ffffff","sidebarText":"#ffffff","sidebarTextActiveBorder":"#66b9a7","sidebarTextActiveColor":"#ffffff","sidebarTextHoverBg":"#4a5664","sidebarUnreadText":"#ffffff","type":"Mattermost Dark"}',
                },
                {
                    user_id: '9ciscaqbrpd6d8s68k76xb9bte',
                    category: 'tutorial_step',
                    name: '9ciscaqbrpd6d8s68k76xb9bte',
                    value: '2',
                },
            ],
            prepareRecordsOnly: false,
        });

        expect(spyOnHandleEntityRecords).toHaveBeenCalledTimes(1);
        expect(spyOnHandleEntityRecords).toHaveBeenCalledWith({
            fieldName: 'user_id',
            rawValues: [
                {
                    user_id: '9ciscaqbrpd6d8s68k76xb9bte',
                    category: 'group_channel_show',
                    name: 'qj91hepgjfn6xr4acm5xzd8zoc',
                    value: 'true',
                },
                {
                    user_id: '9ciscaqbrpd6d8s68k76xb9bte',
                    category: 'notifications',
                    name: 'email_interval',
                    value: '30',
                },
                {
                    user_id: '9ciscaqbrpd6d8s68k76xb9bte',
                    category: 'theme',
                    name: '',
                    value: '{"awayIndicator":"#c1b966","buttonBg":"#4cbba4","buttonColor":"#ffffff","centerChannelBg":"#2f3e4e","centerChannelColor":"#dddddd","codeTheme":"solarized-dark","dndIndicator":"#e81023","errorTextColor":"#ff6461","image":"/static/files/0b8d56c39baf992e5e4c58d74fde0fd6.png","linkColor":"#a4ffeb","mentionBg":"#b74a4a","mentionColor":"#ffffff","mentionHighlightBg":"#984063","mentionHighlightLink":"#a4ffeb","newMessageSeparator":"#5de5da","onlineIndicator":"#65dcc8","sidebarBg":"#1b2c3e","sidebarHeaderBg":"#1b2c3e","sidebarHeaderTextColor":"#ffffff","sidebarText":"#ffffff","sidebarTextActiveBorder":"#66b9a7","sidebarTextActiveColor":"#ffffff","sidebarTextHoverBg":"#4a5664","sidebarUnreadText":"#ffffff","type":"Mattermost Dark"}',
                },
                {
                    user_id: '9ciscaqbrpd6d8s68k76xb9bte',
                    category: 'tutorial_step',
                    name: '9ciscaqbrpd6d8s68k76xb9bte',
                    value: '2',
                },
            ],
            tableName: 'Preference',
            prepareRecordsOnly: false,
            findMatchingRecordBy: isRecordPreferenceEqualToRaw,
            operator: preparePreferenceRecord,
        });
    });

    it('=> HandleChannelMembership: should write to CHANNEL_MEMBERSHIP entity', async () => {
        expect.assertions(2);
        const channelMemberships = [
            {
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
            {
                channel_id: '1yw6gxfr4bn1jbyp9nr7d53yew',
                user_id: '9ciscaqbrpd6d8s68k76xb9bte',
                roles: 'channel_user',
                last_viewed_at: 1615300540549,
                msg_count: 16,
                mention_count: 0,
                notify_props: {
                    desktop: 'default',
                    email: 'default',
                    ignore_channel_mentions: 'default',
                    mark_unread: 'all',
                    push: 'default',
                },
                last_update_at: 1615300540549,
                scheme_guest: false,
                scheme_user: true,
                scheme_admin: false,
                explicit_roles: '',
            },
        ];

        const spyOnHandleEntityRecords = jest.spyOn(DataOperator as any, 'handleEntityRecords');

        await createTestConnection({databaseName: 'user_handler', setActive: true});

        await DataOperator.handleChannelMembership({
            channelMemberships,
            prepareRecordsOnly: false,
        });

        expect(spyOnHandleEntityRecords).toHaveBeenCalledTimes(1);
        expect(spyOnHandleEntityRecords).toHaveBeenCalledWith({
            fieldName: 'user_id',
            rawValues: [
                {
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
                {
                    channel_id: '1yw6gxfr4bn1jbyp9nr7d53yew',
                    user_id: '9ciscaqbrpd6d8s68k76xb9bte',
                    roles: 'channel_user',
                    last_viewed_at: 1615300540549,
                    msg_count: 16,
                    mention_count: 0,
                    notify_props: {
                        desktop: 'default',
                        email: 'default',
                        ignore_channel_mentions: 'default',
                        mark_unread: 'all',
                        push: 'default',
                    },
                    last_update_at: 1615300540549,
                    scheme_guest: false,
                    scheme_user: true,
                    scheme_admin: false,
                    explicit_roles: '',
                },
            ],
            tableName: 'ChannelMembership',
            prepareRecordsOnly: false,
            findMatchingRecordBy: isRecordChannelMembershipEqualToRaw,
            operator: prepareChannelMembershipRecord,
        });
    });
});
