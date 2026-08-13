// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {type ComponentProps} from 'react';

import {Screens} from '@constants';
import DatabaseManager from '@database/manager';
import {renderWithEverything} from '@test/intl-test-helper';

import AutoCompleteSelector from './index';

import type {Database} from '@nozbe/watermelondb';

jest.mock('@screens/navigation', () => ({
    navigateToScreen: jest.fn(),
    navigateToSettingsScreen: jest.fn(),
}));

jest.mock('@store/settings_store', () => ({
    setIntegrationsSelectCallback: jest.fn(),
    setIntegrationsDynamicOptionsCallback: jest.fn(),
}));

describe('AutoCompleteSelector', () => {
    let database: Database;
    const serverUrl = 'https://server-url.com';

    beforeEach(async () => {
        await DatabaseManager.init([serverUrl]);
        database = DatabaseManager.getServerDatabaseAndOperator(serverUrl).database;
    });

    afterEach(async () => {
        await DatabaseManager.destroyServerDatabase(serverUrl);
        jest.clearAllMocks();
    });

    function getBaseProps(): Omit<ComponentProps<typeof AutoCompleteSelector>, 'teammateNameDisplay'> {
        return {
            testID: 'autocomplete.selector',
            location: Screens.CHANNEL,
            options: [
                {value: 'a', text: 'Option A'},
                {value: 'b', text: 'Option B'},
            ],
        };
    }

    describe('omitMargins', () => {
        it('should apply default container margins when omitMargins is false', () => {
            const {root} = renderWithEverything(
                <AutoCompleteSelector {...getBaseProps()}/>,
                {database, serverUrl},
            );

            expect(root).toHaveStyle({
                marginTop: 10,
                marginBottom: 2,
                marginRight: 8,
            });
        });

        it('should zero out container margins when omitMargins is true', () => {
            const {root} = renderWithEverything(
                <AutoCompleteSelector
                    {...getBaseProps()}
                    omitMargins={true}
                />,
                {database, serverUrl},
            );

            expect(root).toHaveStyle({
                marginTop: 0,
                marginBottom: 0,
                marginRight: 0,
            });
        });
    });
});
