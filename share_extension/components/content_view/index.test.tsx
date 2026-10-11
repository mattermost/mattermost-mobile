// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {render, waitFor} from '@testing-library/react-native';
import React from 'react';

import {General, License} from '@constants';
import {SYSTEM_IDENTIFIERS} from '@constants/database';
import DatabaseManager from '@database/manager';
import TestHelper from '@test/test_helper';

import ContentView from './content_view';

import EnhancedContentView from './index';

import type ServerDataOperator from '@database/operator/server_data_operator';
import type {Database} from '@nozbe/watermelondb';

jest.mock('./content_view', () => ({
    __esModule: true,
    default: jest.fn(),
}));

jest.mocked(ContentView).mockImplementation((props) => React.createElement('ContentView', {...props, testID: 'content-view'}));

describe('share_extension/content_view enhancer', () => {
    const serverUrl = 'share-content-view.test.com';
    let database: Database;
    let operator: ServerDataOperator;

    const setDmGmWrite = (write: boolean) => operator.handleSystem({
        systems: [{id: SYSTEM_IDENTIFIERS.DM_GM_ACCESS, value: {start: true, read: true, write}}],
        prepareRecordsOnly: false,
    });

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
        const channels = [
            TestHelper.fakeChannel({id: 'dm1', type: General.DM_CHANNEL, team_id: ''}),
            TestHelper.fakeChannel({id: 'open1', type: General.OPEN_CHANNEL, team_id: 'team1'}),
        ];
        const myChannels = [
            TestHelper.fakeMyChannel({id: 'dm1', channel_id: 'dm1', last_viewed_at: 2}),
            TestHelper.fakeMyChannel({id: 'open1', channel_id: 'open1', last_viewed_at: 1}),
        ];
        await operator.handleChannel({channels, prepareRecordsOnly: false});
        await operator.handleMyChannel({channels, myChannels, prepareRecordsOnly: false});
        await operator.handleSystem({
            systems: [
                {id: SYSTEM_IDENTIFIERS.CURRENT_USER_ID, value: 'userid1'},
                {id: SYSTEM_IDENTIFIERS.CURRENT_CHANNEL_ID, value: 'dm1'},
                {id: SYSTEM_IDENTIFIERS.LICENSE, value: {IsLicensed: 'true', SkuShortName: License.SKU_SHORT_NAME.EnterpriseAdvanced}},
            ],
            prepareRecordsOnly: false,
        });
    });

    afterEach(async () => {
        await DatabaseManager.destroyServerDatabase(serverUrl);
    });

    it('should preselect the current conversation while it can be shared to', async () => {
        await setDmGmWrite(true);
        const {getByTestId} = render(<EnhancedContentView database={database}/>);

        await waitFor(() => {
            expect(getByTestId('content-view').props.currentChannelId).toBe('dm1');
        });
    });

    it('should preselect the most recent channel instead while conversations are hidden', async () => {
        await setDmGmWrite(false);
        const {getByTestId} = render(<EnhancedContentView database={database}/>);

        await waitFor(() => {
            expect(getByTestId('content-view').props.currentChannelId).toBe('open1');
        });
    });
});
