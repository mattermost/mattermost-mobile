// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import Database from '@nozbe/watermelondb/Database';
import React from 'react';

import {renderWithEverything} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

import UserList from '.';

describe('components/channel_list_row', () => {
    let database: Database;
    const user: UserProfile = {
        id: '1',
        create_at: 1111,
        update_at: 1111,
        delete_at: 0,
        username: 'johndoe',
        auth_service: '',
        email: 'john@doe.com',
        nickname: '',
        first_name: '',
        last_name: '',
        position: '',
        roles: '',
        locale: '',
        notify_props: {
            channel: 'true',
            comments: 'never',
            desktop: 'mention',
            desktop_sound: 'true',
            email: 'true',
            first_name: 'true',
            mention_keys: '',
            push: 'mention',
            push_status: 'away',
        },
    };
    beforeAll(async () => {
        const server = await TestHelper.setupServerDatabase();
        database = server.database;
    });

    it('should show no results', () => {
        const wrapper = renderWithEverything(
            <UserList
                profiles={[user]}
                testID='UserListRow'
                currentUserId={'1'}
                teammateNameDisplay={'johndoe'}
                handleSelectProfile={() => {
                    // noop
                }}
                fetchMore={() => {
                    // noop
                }}
                loading={true}
                selectedIds={{}}
                showNoResults={true}
                tutorialWatched={true}
            />,
            {database},
        );

        expect(wrapper.toJSON()).toMatchSnapshot();
    });

    it('should show results no tutorial', () => {
        const wrapper = renderWithEverything(
            <UserList
                profiles={[user]}
                testID='UserListRow'
                currentUserId={'1'}
                teammateNameDisplay={'johndoe'}
                handleSelectProfile={() => {
                    // noop
                }}
                fetchMore={() => {
                    // noop
                }}
                loading={true}
                selectedIds={{}}
                showNoResults={true}
                tutorialWatched={true}
            />,
            {database},
        );

        expect(wrapper.toJSON()).toMatchSnapshot();
    });

    it('should show results and tutorial', () => {
        const wrapper = renderWithEverything(
            <UserList
                profiles={[user]}
                testID='UserListRow'
                currentUserId={'1'}
                teammateNameDisplay={'johndoe'}
                handleSelectProfile={() => {
                    // noop
                }}
                fetchMore={() => {
                    // noop
                }}
                loading={true}
                selectedIds={{}}
                showNoResults={false}
                tutorialWatched={false}
            />,
            {database},
        );

        expect(wrapper.toJSON()).toMatchSnapshot();
    });
});
