// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import {Screens} from '@constants';
import {SYSTEM_IDENTIFIERS} from '@constants/database';
import DatabaseManager from '@database/manager';
import {renderWithEverything, waitFor} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

import EditPost from './edit_post';

import EnhancedEditPost from './index';

import type ServerDataOperator from '@database/operator/server_data_operator';
import type {Database} from '@nozbe/watermelondb';

jest.mock('./edit_post', () => ({
    __esModule: true,
    default: jest.fn(),
}));

jest.mocked(EditPost).mockImplementation((props) => React.createElement('EditPost', {...props, testID: 'edit-post'}));

describe('EditPost', () => {
    const serverUrl = 'server-1';
    const teamId = 'team1';
    let database: Database;
    let operator: ServerDataOperator;

    const baseProps: Parameters<typeof EnhancedEditPost>[0] = {
        componentId: Screens.EDIT_POST,
        closeButtonId: 'close-button',
        post: TestHelper.fakePostModel({id: 'post-1'}),
        canDelete: true,
        files: [],
    };

    beforeEach(async () => {
        await DatabaseManager.init([serverUrl]);
        const serverDatabaseAndOperator = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        database = serverDatabaseAndOperator.database;
        operator = serverDatabaseAndOperator.operator;

        await operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.CURRENT_TEAM_ID, value: teamId}], prepareRecordsOnly: false});
        await operator.handleTeam({teams: [TestHelper.fakeTeam({id: teamId})], prepareRecordsOnly: false});
        await operator.handleConfigs({
            configs: [
                {id: 'Version', value: '10.6.0'},
                {id: 'MaxFileCount', value: '10'},
                {id: 'MaxFileSize', value: '1000'},
                {id: 'CanUploadFiles', value: 'true'},
            ],
            configsToDelete: [],
            prepareRecordsOnly: false,
        });
    });

    afterEach(async () => {
        await DatabaseManager.destroyServerDatabase(serverUrl);
    });

    it('should pass props to the edit post component', async () => {
        const {getByTestId} = renderWithEverything(<EnhancedEditPost {...baseProps}/>, {database, serverUrl});

        await waitFor(() => {
            const editPost = getByTestId('edit-post');
            expect(editPost).toBeDefined();
            expect(editPost.props.maxFileCount).toBe(10);
            expect(editPost.props.maxFileSize).toBe(1000);
            expect(editPost.props.canUploadFiles).toBe(true);
        });
    });
});
