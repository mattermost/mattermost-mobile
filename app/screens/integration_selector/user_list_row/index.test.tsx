// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import Database from '@nozbe/watermelondb/Database';
import React from 'react';

import {Preferences} from '@app/constants';
import {renderWithEverything} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

import UserListRow from '.';

describe('components/integration_selector/user_list_row', () => {
    let database: Database;
    const userProfile: UserProfile = {
        id: '1',
        create_at: 1111,
        update_at: 1111,
        delete_at: 0,
        username: 'johndoe',
        nickname: 'johndoe',
        first_name: 'johndoe',
        last_name: 'johndoe',
        position: 'hacker',
        roles: 'admin',
        locale: 'en_US',
        notify_props: {
            channel: 'true',
            comments: 'never',
            desktop: 'all',
            desktop_sound: 'true',
            email: 'true',
            first_name: 'true',
            mention_keys: 'false',
            push: 'mention',
            push_status: 'ooo',
        },
        email: 'johndoe@me.com',
        auth_service: 'dummy',
    };
    beforeAll(async () => {
        const server = await TestHelper.setupServerDatabase();
        database = server.database;
    });

    it('should render', () => {
        const wrapper = renderWithEverything(
            <UserListRow
                id='1234'
                isMyUser={false}
                theme={Preferences.THEMES.denim}
                user={userProfile}
                teammateNameDisplay='dummy'
                testID='UserListRow'
                enabled={true}
                selectable={false}
                selected={false}
                onPress={() => {
                    // noop
                }}
            >
                <br/>
            </UserListRow>,
            {database},
        );

        expect(wrapper.toJSON()).toBeTruthy();
    });

    it('match snapshot if user is not shared', () => {
        userProfile.remote_id = '1';

        const wrapper = renderWithEverything(
            <UserListRow
                id='1234'
                isMyUser={false}
                theme={Preferences.THEMES.denim}
                user={userProfile}
                teammateNameDisplay='dummy'
                testID='UserListRow'
                enabled={true}
                selectable={false}
                selected={false}
                onPress={() => {
                    // noop
                }}
            >
                <br/>
            </UserListRow>,
            {database},
        );

        expect(wrapper.toJSON()).toMatchSnapshot();
    });

    it('match snapshot if user is my user', () => {
        userProfile.remote_id = '';

        const wrapper = renderWithEverything(
            <UserListRow
                id='1234'
                isMyUser={true}
                theme={Preferences.THEMES.denim}
                user={userProfile}
                teammateNameDisplay='dummy'
                testID='UserListRow'
                enabled={true}
                selectable={false}
                selected={false}
                onPress={() => {
                    // noop
                }}
            >
                <br/>
            </UserListRow>,
            {database},
        );

        expect(wrapper.toJSON()).toMatchSnapshot();
    });
});
