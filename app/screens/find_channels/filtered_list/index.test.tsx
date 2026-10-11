// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {of as of$} from 'rxjs';

import {License} from '@constants';
import {SYSTEM_IDENTIFIERS} from '@constants/database';
import DatabaseManager from '@database/manager';
import {observeArchiveChannelsByTerm, observeDirectChannelsByTerm, observeJoinedChannelsByTerm, observeNotDirectChannelsByTerm} from '@queries/servers/channel';
import {renderWithEverything, waitFor} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

import FilteredList from './filtered_list';

import EnhancedFilteredList from './index';

import type ServerDataOperator from '@database/operator/server_data_operator';
import type {Database} from '@nozbe/watermelondb';

jest.mock('./filtered_list', () => ({
    __esModule: true,
    MAX_RESULTS: 20,
    default: jest.fn(),
}));

// The term searches run raw SQL, which the in-memory test database cannot run.
jest.mock('@queries/servers/channel', () => ({
    ...jest.requireActual('@queries/servers/channel'),
    observeArchiveChannelsByTerm: jest.fn(),
    observeDirectChannelsByTerm: jest.fn(),
    observeJoinedChannelsByTerm: jest.fn(),
    observeNotDirectChannelsByTerm: jest.fn(),
}));

jest.mocked(FilteredList).mockImplementation((props) => React.createElement('FilteredList', {...props, testID: 'filtered-list'}));

describe('find_channels/filtered_list enhancer', () => {
    const serverUrl = 'filtered-list.test.com';
    let database: Database;
    let operator: ServerDataOperator;

    const baseProps = {
        close: jest.fn(),
        keyboardHeight: {value: 0},
        loading: false,
        onLoading: jest.fn(),
        term: 'jo',
    } as unknown as Parameters<typeof EnhancedFilteredList>[0];

    beforeEach(async () => {
        await DatabaseManager.init([serverUrl]);
        ({database, operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl));
        await operator.handleConfigs({
            configs: [
                {id: 'FeatureFlagPermissionPolicies', value: 'true'},
                {id: 'EnableAttributeBasedAccessControl', value: 'true'},
            ],
            configsToDelete: [],
            prepareRecordsOnly: false,
        });
        await operator.handleSystem({
            systems: [{id: SYSTEM_IDENTIFIERS.LICENSE, value: {IsLicensed: 'true', SkuShortName: License.SKU_SHORT_NAME.EnterpriseAdvanced}}],
            prepareRecordsOnly: false,
        });
        jest.mocked(observeArchiveChannelsByTerm).mockReturnValue(of$([]));
        jest.mocked(observeDirectChannelsByTerm).mockReturnValue(of$([]));
        jest.mocked(observeJoinedChannelsByTerm).mockReturnValue(of$([]));
        jest.mocked(observeNotDirectChannelsByTerm).mockReturnValue(of$([TestHelper.fakeUserModel({id: 'userid2', username: 'john'})]));
    });

    afterEach(async () => {
        await DatabaseManager.destroyServerDatabase(serverUrl);
    });

    it('should list users to message while starting a direct message is allowed', async () => {
        const {getByTestId} = renderWithEverything(<EnhancedFilteredList {...baseProps}/>, {database, serverUrl});

        await waitFor(() => {
            expect(getByTestId('filtered-list').props.usersMatchStart).toHaveLength(1);
        });
        expect(getByTestId('filtered-list').props.canStartDirectMessage).toBe(true);
    });

    it('should list no users while starting a direct message is not allowed', async () => {
        await operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.DM_GM_ACCESS, value: {start: false, read: true, write: true}}], prepareRecordsOnly: false});

        const {getByTestId} = renderWithEverything(<EnhancedFilteredList {...baseProps}/>, {database, serverUrl});

        await waitFor(() => {
            expect(getByTestId('filtered-list').props.canStartDirectMessage).toBe(false);
        });
        expect(getByTestId('filtered-list').props.usersMatchStart).toEqual([]);
        expect(getByTestId('filtered-list').props.usersMatch).toEqual([]);
    });
});
