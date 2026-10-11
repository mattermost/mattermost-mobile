// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {type ComponentProps} from 'react';

import {acknowledgePost} from '@actions/remote/post';
import {Preferences, Screens} from '@constants';
import DatabaseManager from '@database/manager';
import {bottomSheet} from '@screens/navigation';
import {fireEvent, renderWithEverything} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

import Acknowledgements from './acknowledgements';

import type {Database} from '@nozbe/watermelondb';

jest.mock('@actions/remote/post', () => ({
    acknowledgePost: jest.fn(),
    unacknowledgePost: jest.fn(),
}));

jest.mock('@actions/remote/user', () => ({
    fetchMissingProfilesByIds: jest.fn(),
}));

jest.mock('@screens/navigation', () => ({
    bottomSheet: jest.fn(),
}));

const serverUrl = 'acknowledgements.test.com';

describe('Acknowledgements', () => {
    let database: Database;

    const getBaseProps = (): ComponentProps<typeof Acknowledgements> => ({
        canAcknowledge: true,
        currentUserId: 'userid1',
        currentUserTimezone: null,
        hasReactions: false,
        location: Screens.CHANNEL,
        post: TestHelper.fakePostModel({id: 'postid1', userId: 'userid2', metadata: {}}),
        theme: Preferences.THEMES.denim,
    });

    beforeEach(async () => {
        await DatabaseManager.init([serverUrl]);
        database = DatabaseManager.serverDatabases[serverUrl]!.database;
    });

    afterEach(async () => {
        await DatabaseManager.destroyServerDatabase(serverUrl);
    });

    it('should acknowledge on press', () => {
        const props = getBaseProps();
        const {getByTestId} = renderWithEverything(<Acknowledgements {...props}/>, {database, serverUrl});

        fireEvent.press(getByTestId('acknowledgements.postid1.button'));

        expect(acknowledgePost).toHaveBeenCalledWith(serverUrl, 'postid1');
    });

    it('should not acknowledge when it may not, but still list who acknowledged', () => {
        const props = getBaseProps();
        props.canAcknowledge = false;
        props.post = TestHelper.fakePostModel({
            id: 'postid1',
            userId: 'userid2',
            metadata: {acknowledgements: [{user_id: 'userid3', post_id: 'postid1', acknowledged_at: 1}]},
        });
        const {getByTestId} = renderWithEverything(<Acknowledgements {...props}/>, {database, serverUrl});

        fireEvent.press(getByTestId('acknowledgements.postid1.button'));
        expect(acknowledgePost).not.toHaveBeenCalled();

        fireEvent(getByTestId('acknowledgements.postid1.button'), 'longPress');
        expect(bottomSheet).toHaveBeenCalled();
    });
});
