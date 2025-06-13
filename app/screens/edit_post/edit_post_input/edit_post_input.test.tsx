// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Database} from '@nozbe/watermelondb';

import {renderWithEverything} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

import EditPostInput from './edit_post_input';

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
        version: '10.5.0',
        inputRef: {current: undefined},
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

    it('should not render attachments if the server version is less than 10.5.0', () => {
        const props = {...baseProps, version: '10.4.0'};
        const {queryByTestId} = renderWithEverything(<EditPostInput {...props}/>, {database, serverUrl});
        expect(queryByTestId('uploads')).toBeNull();
    });
});
