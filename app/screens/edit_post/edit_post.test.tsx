// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import {renderWithEverything} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

import EditPost from './edit_post';

import type {Database} from '@nozbe/watermelondb';
import type PostModel from '@typings/database/models/servers/post';

const serverUrl = 'baseHandler.test.com';

describe('Edit Post', () => {

    let database: Database;

    const baseProps: Parameters<typeof EditPost>[0] = {
        componentId: 'EditPost',
        closeButtonId: 'edit-post',
        post: {
            id: '1',
            channelId: '1',
            message: 'test',
            messageSource: 'test',
            userId: '1',
            rootId: '1',
            metadata: {},
        } as PostModel,
        maxPostSize: 1000,
        hasFilesAttached: true,
        canDelete: true,
        files: [
            {
                id: 'file-1',
                name: 'test-1',
                extension: 'png',
                has_preview_image: true,
                height: 100,
                mime_type: 'test',
                size: 100,
                user_id: '1',
                width: 100,
            },
            {
                id: 'file-2',
                name: 'test-2',
                extension: 'pdf',
                has_preview_image: false,
                height: 100,
                mime_type: 'test',
                size: 100,
                user_id: '1',
                width: 100,
            },
        ],
    };

    beforeAll(async () => {
        const server = await TestHelper.setupServerDatabase(serverUrl);
        database = server.database;
        const operator = server.operator;
        operator.handleConfigs({
            configs: [
                {id: 'Version', value: '10.5.0'},
            ],
            configsToDelete: [],
            prepareRecordsOnly: false,
        });
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should render the attachments in edit mode', () => {
        const {getByTestId} = renderWithEverything(<EditPost {...baseProps}/>, {database, serverUrl});
        expect(getByTestId('uploads')).toBeVisible();
        expect(getByTestId('file-1')).toBeVisible();
        expect(getByTestId('file-2')).toBeVisible();
    });
});
