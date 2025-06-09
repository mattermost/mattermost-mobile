// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Database} from '@nozbe/watermelondb';

import {renderWithEverything} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

import EditPostInput from '.';

import type PostModel from '@typings/database/models/servers/post';

const serverUrl = 'baseHandler.test.com';

describe('EditPostInput', () => {
    let database: Database;

    const baseProps: Parameters<typeof EditPostInput>[0] = {
        message: 'test',
        hasError: false,
        post: {
            id: '1',
            channelId: '1',
            message: 'test',
            messageSource: 'test',
            userId: '1',
            rootId: '1',
            metadata: {},
        } as PostModel,
        postFiles: [
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
        onTextSelectionChange: jest.fn(),
        onChangeText: jest.fn(),
    };

    beforeAll(async () => {
        const server = await TestHelper.setupServerDatabase(serverUrl);
        database = server.database;
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should render attachments in edit mode', () => {
        const {getByTestId} = renderWithEverything(<EditPostInput {...baseProps}/>, {database, serverUrl});
        expect(getByTestId('uploads')).toBeVisible();
        expect(getByTestId('file-1')).toBeVisible();
        expect(getByTestId('file-2')).toBeVisible();
    });

    it('should match the count of the attachments in edit mode', () => {
        const {getByTestId} = renderWithEverything(<EditPostInput {...baseProps}/>, {database, serverUrl});
        expect(getByTestId('uploads')).toBeVisible();
        expect(getByTestId('uploads').children).toHaveLength(2);
    });
});
