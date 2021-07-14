// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import DatabaseManager from '@database/manager';
import ServerDataOperator from '@database/operator/server_data_operator';
import NetworkManager from '@init/network_manager';

import {renderWithDatabase} from '@test/intl-test-helper';

import ProfilePicture from './index';

import type {Database} from '@nozbe/watermelondb';

describe('@components/profile_picture', () => {
    let database: Database;
    let operator: ServerDataOperator;

    beforeAll(async () => {
        const serverUrl = 'baseHandler.test.com';
        await DatabaseManager.init([serverUrl]);
        database = DatabaseManager.serverDatabases[serverUrl].database;
        operator = DatabaseManager.serverDatabases[serverUrl].operator;

        await NetworkManager.init([
            {serverUrl, userId: '1234567', token: '432424788^^83434'},
        ]);

        await operator.handleUsers({
            users: [{
                id: '1234567',
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
                props: {
                    customStatus: {
                        emoji: 'calendar',
                        text: 'In a meeting',
                    },
                },
                notify_props: {
                    desktop: 'all',
                    desktop_sound: true,
                    email: true,
                    first_name: true,
                    mention_keys: '',
                    push: 'mention',
                    channel: true,
                    auto_responder_active: false,
                    auto_responder_message:
                            'Hello, I am out of office and unable to respond to messages.',
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
                    useAutomaticTimezone: '',
                },
            },
            ],
            prepareRecordsOnly: false,
        });
    });

    it('should match snapshot', () => {
        const wrapper = renderWithDatabase(
            <ProfilePicture
                size={20}
                statusSize={20}
                userId={'1234567'}
            />,
            database,
        );
        console.log('>>>>>>>>>>>>>>> ', wrapper.toJSON());
        expect(wrapper.toJSON()).toMatchSnapshot();
    });
});
