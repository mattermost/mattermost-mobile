// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {type ComponentProps} from 'react';
import {Image} from 'react-native';

import {Screens} from '@constants';
import {Ringtone} from '@constants/calls';
import {renderWithEverything} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

import UserList from '.';

import type Database from '@nozbe/watermelondb/Database';

const mockClient = TestHelper.createClient();

jest.mock('@managers/network_manager', () => {
    const original = jest.requireActual('@managers/network_manager');
    return {
        ...original,
        getClient: () => {
            return mockClient;
        },
    };
});

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
        last_picture_update: 123456,
        notify_props: {
            channel: 'true',
            comments: 'never',
            desktop: 'mention',
            desktop_sound: 'true',
            email: 'true',
            first_name: 'true',
            mention_keys: '',
            highlight_keys: '',
            push: 'mention',
            push_status: 'away',
            calls_desktop_sound: 'true',
            calls_mobile_sound: '',
            calls_notification_sound: Ringtone.Calm,
            calls_mobile_notification_sound: '',
        },
    };

    const user2: UserProfile = {
        id: '2',
        create_at: 1111,
        update_at: 1111,
        delete_at: 0,
        username: 'rocky',
        auth_service: '',
        email: 'rocky@doe.com',
        nickname: '',
        first_name: '',
        last_name: '',
        position: '',
        roles: '',
        locale: '',
        last_picture_update: 123456,
        notify_props: {
            channel: 'true',
            comments: 'never',
            desktop: 'mention',
            desktop_sound: 'true',
            email: 'true',
            first_name: 'true',
            mention_keys: '',
            highlight_keys: '',
            push: 'mention',
            push_status: 'away',
            calls_desktop_sound: 'true',
            calls_mobile_sound: '',
            calls_notification_sound: Ringtone.Calm,
            calls_mobile_notification_sound: '',
        },
    };

    const originalResolveAssetSource = Image.resolveAssetSource;

    beforeAll(async () => {
        const server = await TestHelper.setupServerDatabase();
        database = server.database;

        // This is needed to properly populate the URLs until
        // https://github.com/facebook/react-native/pull/43497
        // gets into React Native Jest code.
        Image.resolveAssetSource = jest.fn().mockImplementation((source) => source);
    });

    afterAll(() => {
        Image.resolveAssetSource = originalResolveAssetSource;
    });

    function getBaseProps(): ComponentProps<typeof UserList> {
        return {
            profiles: [],
            testID: 'UserListRow',
            currentUserId: '1',
            handleSelectProfile: jest.fn(),
            fetchMore: jest.fn(),
            loading: true,
            selectedIds: new Set(),
            showNoResults: true,
            tutorialWatched: true,
            term: 'some term',
            location: Screens.CHANNEL,
        };
    }

    it('should show no results', () => {
        const props = getBaseProps();
        const wrapper = renderWithEverything(
            <UserList {...props}/>,
            {database},
        );

        expect(wrapper.toJSON()).toMatchSnapshot();
    });

    it('should show results no tutorial', () => {
        const props = getBaseProps();
        props.profiles = [user];
        props.term = '';

        const wrapper = renderWithEverything(
            <UserList {...props}/>,
            {database},
        );

        expect(wrapper.toJSON()).toMatchSnapshot();
    });

    it('should show results no tutorial 2 users', () => {
        const props = getBaseProps();
        props.profiles = [user, user2];
        props.term = '';
        const wrapper = renderWithEverything(
            <UserList {...props}/>,
            {database},
        );

        expect(wrapper.toJSON()).toMatchSnapshot();
    });

    it('should show results and tutorial', () => {
        const props = getBaseProps();
        props.profiles = [user];
        props.showNoResults = false;
        props.tutorialWatched = false;
        props.term = '';
        const wrapper = renderWithEverything(
            <UserList {...props}/>,
            {database},
        );

        expect(wrapper.toJSON()).toMatchSnapshot();
    });
});
