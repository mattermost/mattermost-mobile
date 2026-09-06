// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {type ComponentProps} from 'react';

import {renderWithEverything} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

import {PUBLIC} from './browse_channels';
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

    beforeAll(async () => {
        const server = await TestHelper.setupServerDatabase(serverUrl);
        database = server.database;
    });

    beforeEach(() => {
        jest.clearAllMocks();
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
