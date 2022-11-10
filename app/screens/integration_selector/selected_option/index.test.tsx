// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import Database from '@nozbe/watermelondb/Database';
import React from 'react';

import {Preferences} from '@app/constants';
import {View as ViewConstants} from '@constants';
import {renderWithEverything} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

import SelectedOption from '.';

describe('components/integration_selector/selected_option', () => {
    let database: Database;
    beforeAll(async () => {
        const server = await TestHelper.setupServerDatabase();
        database = server.database;
    });

    it('should render', () => {
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
                push: 'mention',
                push_status: 'ooo',
            },
            email: 'johndoe@me.com',
            auth_service: 'dummy',
        };
        const wrapper = renderWithEverything(
            <SelectedOption
                theme={Preferences.THEMES.denim}
                option={userProfile}
                dataSource={ViewConstants.DATA_SOURCE_USERS}
                onRemove={null}
            />,
            {database},
        );

        expect(wrapper.toJSON()).toBeTruthy();
    });
});
