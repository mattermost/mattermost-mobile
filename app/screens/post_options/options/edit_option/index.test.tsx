// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import {ActionType, Screens} from '@constants';
import {SYSTEM_IDENTIFIERS} from '@constants/database';
import DatabaseManager from '@database/manager';
import {renderWithEverything, waitFor} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

import EditOption from './edit_option';

import EnhancedEditOption from './index';

import type ServerDataOperator from '@database/operator/server_data_operator';
import type {Database} from '@nozbe/watermelondb';
import type PostModel from '@typings/database/models/servers/post';

jest.mock('./edit_option', () => ({
    __esModule: true,
    default: jest.fn(),
}));

jest.mocked(EditOption).mockImplementation((props) => React.createElement('EditOption', {...props, testID: 'edit-option'}));

describe('EditOption', () => {
    const serverUrl = 'server-1';
    const teamId = 'team1';
    let database: Database;
    let operator: ServerDataOperator;
    let post: PostModel;

    beforeEach(async () => {
        await DatabaseManager.init([serverUrl]);
        const serverDatabaseAndOperator = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        database = serverDatabaseAndOperator.database;
        operator = serverDatabaseAndOperator.operator;

        await operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.CURRENT_TEAM_ID, value: teamId}], prepareRecordsOnly: false});
        await operator.handleTeam({teams: [TestHelper.fakeTeam({id: teamId})], prepareRecordsOnly: false});
        await operator.handleConfigs({
            configs: [
                {id: 'Version', value: '7.6.0'},
            ],
            configsToDelete: [],
            prepareRecordsOnly: false,
        });
        post = TestHelper.fakePostModel();
        const postRaw = TestHelper.fakePost({
            id: post.id,
            message: post.message,
        });
        await operator.handlePosts({
            actionType: ActionType.POSTS.RECEIVED_NEW,
            order: [post.id],
            posts: [postRaw],
            prepareRecordsOnly: false,
        });

        const files = [
            TestHelper.fakeFileInfo(
                {
                    post_id: post.id,
                    id: 'file-1',
                    name: 'file1',
                    create_at: 1000,
                }),
            TestHelper.fakeFileInfo({
                post_id: post.id,
                id: 'file-2',
                name: 'file2',
                create_at: 1001,
            }),
        ];
        await operator.handleFiles({
            files,
            prepareRecordsOnly: false,
        });
    });

    afterEach(async () => {
        await DatabaseManager.destroyServerDatabase(serverUrl);
    });

    it('should fetch the files for the post', async () => {
        const {getByTestId} = renderWithEverything(
            <EnhancedEditOption
                post={post}
                canDelete={true}
                bottomSheetId={Screens.EDIT_POST}
            />,
            {database},
        );
        await waitFor(() => {
            const editPost = getByTestId('edit-option');
            expect(editPost).toBeDefined();
            const files = editPost.props.files;
            expect(files).toHaveLength(2);
            expect(files[0].name).toBe('file2');
            expect(files[1].name).toBe('file1');
        });
    });

    it('should not fetch the files for the post if the post has no files', async () => {
        const {getByTestId} = renderWithEverything(
            <EnhancedEditOption
                post={{id: 'post-2', message: 'test'} as PostModel}
                canDelete={true}
                bottomSheetId={Screens.EDIT_POST}
            />,
            {database},
        );
        await waitFor(() => {
            const editPost = getByTestId('edit-option');
            expect(editPost).toBeDefined();
            const files = editPost.props.files;
            expect(files).toHaveLength(0);
        });
    });
});
