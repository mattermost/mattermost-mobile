// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import DatabaseManager from '@database/manager';
import {renderWithEverything, waitFor} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

import PermalinkPreview from './permalink_preview';

import EnhancedPermalinkPreview from './index';

import type ServerDataOperator from '@database/operator/server_data_operator';
import type {Database} from '@nozbe/watermelondb';

jest.mock('./permalink_preview', () => ({
    __esModule: true,
    default: jest.fn(),
}));

jest.mocked(PermalinkPreview).mockImplementation((props) =>
    React.createElement('PermalinkPreview', {...props, testID: 'permalink-preview'}),
);

describe('PermalinkPreview Enhanced Component', () => {
    const serverUrl = 'server-1';
    let database: Database;
    let operator: ServerDataOperator;

    beforeEach(async () => {
        await DatabaseManager.init([serverUrl]);
        const serverDatabaseAndOperator = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        database = serverDatabaseAndOperator.database;
        operator = serverDatabaseAndOperator.operator;

        // Setup basic data
        await operator.handleConfigs({
            configs: [
                {id: 'EnablePermalinkPreviews', value: 'true'},
                {id: 'TeammateNameDisplay', value: 'username'},
            ],
            configsToDelete: [],
            prepareRecordsOnly: false,
        });

        // Add a current user
        const currentUser = TestHelper.fakeUser({id: 'current-user', locale: 'en'});
        await operator.handleUsers({users: [currentUser], prepareRecordsOnly: false});
        await operator.handleSystem({
            systems: [{id: 'currentUserId', value: currentUser.id}],
            prepareRecordsOnly: false,
        });
    });

    afterEach(async () => {
        await DatabaseManager.destroyServerDatabase(serverUrl);
    });

    it('should pass props to permalink preview component with post author', async () => {
        const authorUser = TestHelper.fakeUser({id: 'author-user', username: 'testauthor'});
        await operator.handleUsers({users: [authorUser], prepareRecordsOnly: false});

        const embedData: PermalinkEmbedData = {
            post_id: 'post-123',
            post: TestHelper.fakePost({
                id: 'post-123',
                user_id: 'author-user',
                message: 'Test message',
            }),
            team_name: 'test-team',
            channel_display_name: 'Test Channel',
            channel_type: 'O',
            channel_id: 'channel-123',
        };

        const {getByTestId} = renderWithEverything(
            <EnhancedPermalinkPreview embedData={embedData}/>,
            {database, serverUrl},
        );

        await waitFor(() => {
            const permalinkPreview = getByTestId('permalink-preview');
            expect(permalinkPreview.props.showPermalinkPreviews).toBe(true);
            expect(permalinkPreview.props.teammateNameDisplay).toBe('username');
            expect(permalinkPreview.props.author).toBeDefined();
            expect(permalinkPreview.props.locale).toBe('en');
        });
    });

    it('should pass props to permalink preview component without post author', async () => {
        const embedData: PermalinkEmbedData = {
            post_id: 'post-123',
            post: TestHelper.fakePost({
                id: 'post-123',
                user_id: '',
                message: 'Test message',
            }),
            team_name: 'test-team',
            channel_display_name: 'Test Channel',
            channel_type: 'O',
            channel_id: 'channel-123',
        };

        const {getByTestId} = renderWithEverything(
            <EnhancedPermalinkPreview embedData={embedData}/>,
            {database, serverUrl},
        );

        await waitFor(() => {
            const permalinkPreview = getByTestId('permalink-preview');
            expect(permalinkPreview.props.showPermalinkPreviews).toBe(true);
            expect(permalinkPreview.props.teammateNameDisplay).toBe('username');
            expect(permalinkPreview.props.author).toBeUndefined();
            expect(permalinkPreview.props.locale).toBe('en');
        });
    });

    it('should pass props to permalink preview component with disabled link previews', async () => {
        await operator.handleConfigs({
            configs: [
                {id: 'EnablePermalinkPreviews', value: 'false'},
            ],
            configsToDelete: [],
            prepareRecordsOnly: false,
        });

        const embedData: PermalinkEmbedData = {
            post_id: 'post-123',
            post: TestHelper.fakePost({
                id: 'post-123',
                user_id: 'author-user',
                message: 'Test message',
            }),
            team_name: 'test-team',
            channel_display_name: 'Test Channel',
            channel_type: 'O',
            channel_id: 'channel-123',
        };

        const {getByTestId} = renderWithEverything(
            <EnhancedPermalinkPreview embedData={embedData}/>,
            {database, serverUrl},
        );

        await waitFor(() => {
            const permalinkPreview = getByTestId('permalink-preview');
            expect(permalinkPreview.props.showPermalinkPreviews).toBe(false);
            expect(permalinkPreview.props.teammateNameDisplay).toBe('username');
            expect(permalinkPreview.props.locale).toBe('en');
        });
    });

    it('should pass props to permalink preview component with different locale', async () => {
        const frenchUser = TestHelper.fakeUser({id: 'french-user', locale: 'fr'});
        await operator.handleUsers({users: [frenchUser], prepareRecordsOnly: false});
        await operator.handleSystem({
            systems: [{id: 'currentUserId', value: frenchUser.id}],
            prepareRecordsOnly: false,
        });

        const embedData: PermalinkEmbedData = {
            post_id: 'post-123',
            post: TestHelper.fakePost({
                id: 'post-123',
                user_id: 'author-user',
                message: 'Test message',
            }),
            team_name: 'test-team',
            channel_display_name: 'Test Channel',
            channel_type: 'O',
            channel_id: 'channel-123',
        };

        const {getByTestId} = renderWithEverything(
            <EnhancedPermalinkPreview embedData={embedData}/>,
            {database, serverUrl},
        );

        await waitFor(() => {
            const permalinkPreview = getByTestId('permalink-preview');
            expect(permalinkPreview.props.locale).toBe('fr');
        });
    });

    it('should pass props to permalink preview component without post data', async () => {
        const embedData: PermalinkEmbedData = {
            post_id: 'post-123',
            post: TestHelper.fakePost({
                id: 'post-123',
                message: 'Test message',
            }),
            team_name: 'test-team',
            channel_display_name: 'Test Channel',
            channel_type: 'O',
            channel_id: 'channel-123',
        };

        const {getByTestId} = renderWithEverything(
            <EnhancedPermalinkPreview embedData={embedData}/>,
            {database, serverUrl},
        );

        await waitFor(() => {
            const permalinkPreview = getByTestId('permalink-preview');
            expect(permalinkPreview.props.showPermalinkPreviews).toBe(true);
            expect(permalinkPreview.props.teammateNameDisplay).toBe('username');
            expect(permalinkPreview.props.author).toBeUndefined();
            expect(permalinkPreview.props.locale).toBe('en');
        });
    });

    it('should pass props to permalink preview component with different teammate name display', async () => {
        await operator.handleConfigs({
            configs: [
                {id: 'TeammateNameDisplay', value: 'full_name'},
            ],
            configsToDelete: [],
            prepareRecordsOnly: false,
        });

        const embedData: PermalinkEmbedData = {
            post_id: 'post-123',
            post: TestHelper.fakePost({
                id: 'post-123',
                user_id: 'author-user',
                message: 'Test message',
            }),
            team_name: 'test-team',
            channel_display_name: 'Test Channel',
            channel_type: 'O',
            channel_id: 'channel-123',
        };

        const {getByTestId} = renderWithEverything(
            <EnhancedPermalinkPreview embedData={embedData}/>,
            {database, serverUrl},
        );

        await waitFor(() => {
            const permalinkPreview = getByTestId('permalink-preview');
            expect(permalinkPreview.props.teammateNameDisplay).toBe('full_name');
        });
    });
});
