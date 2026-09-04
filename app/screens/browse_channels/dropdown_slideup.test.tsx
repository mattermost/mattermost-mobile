// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {fireEvent, waitFor} from '@testing-library/react-native';
import React, {type ComponentProps} from 'react';

import DatabaseManager from '@database/manager';
import {dismissBottomSheet} from '@screens/navigation';
import {renderWithEverything} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

import {ARCHIVED, PUBLIC, SHARED} from './browse_channels';
import DropdownSlideup from './dropdown_slideup';

import type {Database} from '@nozbe/watermelondb';

jest.mock('@screens/navigation', () => ({
    dismissBottomSheet: jest.fn().mockResolvedValue(undefined),
}));

const serverUrl = 'http://www.someserverurl.com';

function getBaseProps(overrides: Partial<ComponentProps<typeof DropdownSlideup>> = {}): ComponentProps<typeof DropdownSlideup> {
    return {
        onPress: jest.fn(),
        canShowArchivedChannels: true,
        sharedChannelsEnabled: true,
        selected: PUBLIC,
        ...overrides,
    };
}

describe('DropdownSlideup', () => {
    let database: Database;

    beforeEach(async () => {
        const server = await TestHelper.setupServerDatabase(serverUrl);
        database = server.database;
        jest.clearAllMocks();
    });

    afterEach(async () => {
        await DatabaseManager.destroyServerDatabase(serverUrl);
    });

    // Switching the list while the sheet is still mounted makes Fabric re-parent a view
    // mid-commit, a host exception that tears down the React instance. Pin the ordering.
    it.each([
        ['browse_channels.dropdown_slideup_item.public_channels', PUBLIC],
        ['browse_channels.dropdown_slideup_item.archived_channels', ARCHIVED],
        ['browse_channels.dropdown_slideup_item.shared_channels', SHARED],
    ])('should await the sheet dismissal before switching to %s', async (testID, expectedType) => {
        let resolveDismiss = () => {/* set below */};
        const dismissPending = new Promise<void>((resolve) => {
            resolveDismiss = resolve;
        });
        const calls: string[] = [];
        jest.mocked(dismissBottomSheet).mockImplementation(() => {
            calls.push('dismiss');
            return dismissPending;
        });
        const onPress = jest.fn(() => {
            calls.push('press');
        });

        const {getByTestId} = renderWithEverything(
            <DropdownSlideup {...getBaseProps({onPress})}/>,
            {database, serverUrl},
        );

        fireEvent.press(getByTestId(testID));

        expect(onPress).not.toHaveBeenCalled();
        expect(calls).toEqual(['dismiss']);

        resolveDismiss();

        await waitFor(() => expect(onPress).toHaveBeenCalledWith(expectedType));
        expect(calls).toEqual(['dismiss', 'press']);
    });

    it('should not render the archived or shared rows when the server disables them', () => {
        const {queryByTestId} = renderWithEverything(
            <DropdownSlideup {...getBaseProps({canShowArchivedChannels: false, sharedChannelsEnabled: false})}/>,
            {database, serverUrl},
        );

        expect(queryByTestId('browse_channels.dropdown_slideup_item.archived_channels')).toBeNull();
        expect(queryByTestId('browse_channels.dropdown_slideup_item.shared_channels')).toBeNull();
    });
});
