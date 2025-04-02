// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React from 'react';

import {Preferences} from '@constants';
import {BOTTOM_TAB_PROFILE_PHOTO_SIZE, BOTTOM_TAB_STATUS_SIZE} from '@constants/view';
import {renderWithEverything, renderWithIntl} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';
import {changeOpacity} from '@utils/theme';

import {Account, default as AccountWithDatabaseObservable} from './account';

import type Database from '@nozbe/watermelondb/Database';

jest.mock('@components/profile_picture', () => 'ProfilePicture');

const currentUser = TestHelper.fakeUserModel({
    id: 'user1',
    username: 'testuser',
});

const theme = {
    ...Preferences.THEMES.denim,
    buttonBg: '#000',
    centerChannelColor: '#fff',
};

describe('Account', () => {
    const centerChannelColorWithOpacity = changeOpacity(theme.centerChannelColor, 0.48);

    it('should render correctly when focused', () => {
        const wrapper = renderWithIntl(
            <Account
                currentUser={currentUser}
                isFocused={true}
                theme={theme}
            />,
        );

        const container = wrapper.getByTestId('account-container');
        expect(container.props.style).toContainEqual({borderColor: theme.buttonBg});
    });

    it('should render correctly when unfocused', () => {
        const {getByTestId} = renderWithIntl(
            <Account
                currentUser={currentUser}
                isFocused={false}
                theme={theme}
            />,
        );

        const container = getByTestId('account-container');
        expect(container.props.style).toContainEqual({borderColor: centerChannelColorWithOpacity});
    });

    it('should render ProfilePicture with correct props', () => {
        const {getByTestId} = renderWithIntl(
            <Account
                currentUser={currentUser}
                isFocused={true}
                theme={theme}
            />,
        );

        const profilePicture = getByTestId('account-profile-picture');

        expect(profilePicture.props.author).toEqual(expect.objectContaining({id: 'user1', username: 'testuser'}));
        expect(profilePicture.props.showStatus).toBe(true);
        expect(profilePicture.props.size).toBe(BOTTOM_TAB_PROFILE_PHOTO_SIZE);
        expect(profilePicture.props.statusSize).toBe(BOTTOM_TAB_STATUS_SIZE);
    });
});

describe('Account with database observable', () => {
    let database: Database;

    beforeAll(async () => {
        const server = await TestHelper.setupServerDatabase();
        database = server.database;
    });

    it('should render with the correct fake user when observing data from the database', () => {
        const wrapper = renderWithEverything(
            <AccountWithDatabaseObservable
                theme={theme}
                isFocused={true}
            />, {database});

        const profilePicture = wrapper.getByTestId('account-profile-picture');

        expect(profilePicture.props.author.email).toContain('@simulator.amazonses.com');
    });
});
