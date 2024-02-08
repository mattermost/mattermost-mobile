// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import {Preferences, View as ViewConstants} from '@constants';
import {renderWithEverything} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

import SelectedOptions from '.';

import type Database from '@nozbe/watermelondb/Database';

describe('components/integration_selector/selected_options', () => {
    let database: Database;
    beforeAll(async () => {
        const server = await TestHelper.setupServerDatabase();
        database = server.database;
    });

    it('should match snapshot for users', () => {
        const userProfile: UserProfile = {
            id: '1',
            create_at: 1111,
            update_at: 1111,
            delete_at: 1111,
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
                highlight_keys: '',
                push: 'mention',
                push_status: 'ooo',
            },
            email: 'johndoe@me.com',
            auth_service: 'dummy',
        };
        const wrapper = renderWithEverything(
            <SelectedOptions
                theme={Preferences.THEMES.denim}
                selectedOptions={[userProfile]}
                dataSource={ViewConstants.DATA_SOURCE_USERS}
                onRemove={() => {
                    // noop
                }}
            />,
            {database},
        );

        expect(wrapper.toJSON()).toMatchSnapshot();
    });

    it('should match snapshot for channels', () => {
        const channel: Channel = {
            id: '1',
            create_at: 1111,
            update_at: 1111,
            delete_at: 0,
            team_id: 'my team',
            type: 'O',
            display_name: 'channel',
            name: 'channel',
            header: 'channel',
            purpose: '',
            last_post_at: 1,
            total_msg_count: 1,
            extra_update_at: 1,
            creator_id: '1',
            scheme_id: null,
            group_constrained: null,
            shared: true,
        };

        const wrapper = renderWithEverything(
            <SelectedOptions
                theme={Preferences.THEMES.denim}
                selectedOptions={[channel]}
                dataSource={ViewConstants.DATA_SOURCE_CHANNELS}
                onRemove={() => {
                    // noop
                }}
            />,
            {database},
        );

        expect(wrapper.toJSON()).toMatchSnapshot();
    });

    it('should match snapshot for options', () => {
        const myItem = {
            value: '1',
            text: 'my text',
        };

        const wrapper = renderWithEverything(
            <SelectedOptions
                theme={Preferences.THEMES.denim}
                selectedOptions={[myItem]}
                dataSource={ViewConstants.DATA_SOURCE_DYNAMIC}
                onRemove={() => {
                    // noop
                }}
            />,
            {database},
        );

        expect(wrapper.toJSON()).toMatchSnapshot();
    });
});
