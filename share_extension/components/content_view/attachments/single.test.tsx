// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {fireEvent} from '@testing-library/react-native';
import React from 'react';

import DatabaseManager from '@database/manager';
import {removeShareExtensionFile} from '@share/state';
import {renderWithEverything} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

import Single from './single';

import type {SharedItem} from '@mattermost/rnshare';
import type {Database} from '@nozbe/watermelondb';

jest.mock('@share/state', () => ({
    removeShareExtensionFile: jest.fn(),
}));

describe('Share Extension - Single', () => {
    const serverUrl = 'serverUrl';
    let database: Database;

    beforeEach(async () => {
        jest.clearAllMocks();
        database = (await TestHelper.setupServerDatabase(serverUrl)).database;
    });

    afterAll(async () => {
        await DatabaseManager.destroyServerDatabase(serverUrl);
    });

    const createMockSharedItem = (overrides: Partial<SharedItem> = {}): SharedItem => ({
        filename: 'photo.jpg',
        extension: 'jpg',
        size: 2048,
        value: 'file:///photos/vacation.jpg',
        width: 800,
        height: 600,
        type: 'image/jpeg',
        isString: false,
        ...overrides,
    });

    it('renders remove button in small variant and calls removal on press', () => {
        const file = createMockSharedItem();

        const {getByTestId} = renderWithEverything(
            <Single
                file={file}
                isSmall={true}
                maxFileSize={Number.MAX_SAFE_INTEGER}
            />,
            {database},
        );

        // Ensure container exists
        expect(getByTestId('single-file-container')).toBeTruthy();

        // Remove button should be present with default testID
        const button = getByTestId('remove-button');
        fireEvent.press(button);

        expect(removeShareExtensionFile).toHaveBeenCalledTimes(1);
        expect(removeShareExtensionFile).toHaveBeenCalledWith(file);
    });

    it('does not render remove button for non-small variant', () => {
        const file = createMockSharedItem();

        const {queryByTestId} = renderWithEverything(
            <Single
                file={file}
                isSmall={false}
                maxFileSize={Number.MAX_SAFE_INTEGER}
            />,
            {database},
        );

        expect(queryByTestId('remove-button')).toBeNull();
    });
});

