// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {type ComponentProps} from 'react';

import {fetchUsersByIds} from '@actions/remote/user';
import CompassIcon from '@components/compass_icon';
import {Preferences} from '@constants';
import {useServerUrl} from '@context/server';
import DatabaseManager from '@database/manager';
import {renderWithEverything} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

import Participants from './participants';

import StatusUpdatePost from './index';

import type {Database} from '@nozbe/watermelondb';

jest.mock('@actions/remote/user', () => ({
    fetchUserOrGroupsByMentionsInBatch: jest.fn(),
    fetchUsersByIds: jest.fn(),
}));

jest.mock('@components/compass_icon', () => ({
    __esModule: true,
    default: jest.fn(),
}));
jest.mocked(CompassIcon).mockImplementation(
    (props) => React.createElement('CompassIcon', {testID: 'compass-icon', ...props}) as any, // override the type since it is expecting a class component
);

jest.mock('@context/server', () => ({
    useServerUrl: jest.fn(() => 'server-url'),
}));

jest.mock('./participants', () => ({
    __esModule: true,
    default: jest.fn(),
}));
jest.mocked(Participants).mockImplementation(
    (props) => React.createElement('Participants', {testID: 'participants', ...props}),
);

describe('StatusUpdatePost', () => {
    function getBaseProps(): ComponentProps<typeof StatusUpdatePost> {
        const post = TestHelper.fakePostModel({
            id: 'post-id',
            channelId: 'channel-id',
            message: 'This is a status update message',
            props: {
                authorUsername: 'john.doe',
                numTasks: 10,
                numTasksChecked: 7,
                participantIds: ['user-1', 'user-2', 'user-3'],
                playbookRunId: 'run-id',
                runName: 'Test Run',
            },
        });

        return {
            location: 'Channel',
            post,
            theme: Preferences.THEMES.denim,
        };
    }

    let database: Database;
    const serverUrl = 'server-url';
    beforeEach(async () => {
        jest.clearAllMocks();
        jest.mocked(useServerUrl).mockReturnValue('https://server-url.com');
        jest.mocked(fetchUsersByIds).mockResolvedValue({users: [], existingUsers: []});
        await DatabaseManager.init([serverUrl]);
        database = DatabaseManager.getServerDatabaseAndOperator(serverUrl).database;
    });

    afterEach(async () => {
        await DatabaseManager.destroyServerDatabase(serverUrl);
    });

    it('should render correctly with default props', () => {
        const props = getBaseProps();
        const {getByTestId, getByText} = renderWithEverything(<StatusUpdatePost {...props}/>, {database});

        expect(getByText(/posted an update for/)).toBeTruthy();
        expect(getByTestId('participants')).toBeTruthy();
    });

    it('should fetch users by ids on mount', () => {
        const props = getBaseProps();
        renderWithEverything(<StatusUpdatePost {...props}/>, {database});

        expect(fetchUsersByIds).toHaveBeenCalledWith(
            'https://server-url.com',
            ['user-1', 'user-2', 'user-3'],
        );
    });

    it('should render markdown with update posted message', () => {
        const props = getBaseProps();
        const {getByText} = renderWithEverything(<StatusUpdatePost {...props}/>, {database});

        expect(getByText('@john.doe posted an update for Test Run')).toBeTruthy();
    });

    it('should render markdown with post message', () => {
        const props = getBaseProps();
        const {getByText} = renderWithEverything(<StatusUpdatePost {...props}/>, {database});

        expect(getByText('This is a status update message')).toBeTruthy();
    });

    it('should render tasks information with correct icon', () => {
        const props = getBaseProps();
        const {getByTestId} = renderWithEverything(<StatusUpdatePost {...props}/>, {database});

        const icon = getByTestId('compass-icon');
        expect(icon).toHaveProp('name', 'check-all');
    });

    it('should render tasks information with correct counts', () => {
        const props = getBaseProps();
        const {getByText} = renderWithEverything(<StatusUpdatePost {...props}/>, {database});

        expect(getByText('7 of 10 tasks checked')).toBeTruthy();
    });

    it('should render participants component with correct participant ids', () => {
        const props = getBaseProps();
        const {getByTestId} = renderWithEverything(<StatusUpdatePost {...props}/>, {database});

        const participants = getByTestId('participants');
        expect(participants).toBeTruthy();
        expect(participants).toHaveProp('participantIds', ['user-1', 'user-2', 'user-3']);
    });

    it('should handle single task', () => {
        const props = getBaseProps();
        const post = TestHelper.fakePostModel({
            ...props.post,
            props: {
                ...props.post.props,
                numTasks: 1,
                numTasksChecked: 1,
            },
        });
        props.post = post;
        const {getByText} = renderWithEverything(<StatusUpdatePost {...props}/>, {database});

        expect(getByText('1 of 1 task checked')).toBeTruthy();
    });

    it('should handle invalid status update props', () => {
        const props = getBaseProps();
        props.post = TestHelper.fakePostModel({
            ...props.post,
            props: {},
        });
        const {getByText} = renderWithEverything(<StatusUpdatePost {...props}/>, {database});

        expect(getByText('Playbooks status update post with invalid properties')).toBeTruthy();
    });
});
