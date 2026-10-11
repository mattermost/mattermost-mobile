// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {render, waitFor} from '@testing-library/react-native';
import React from 'react';
import {of as of$} from 'rxjs';

import {General, License} from '@constants';
import {SYSTEM_IDENTIFIERS} from '@constants/database';
import DatabaseManager from '@database/manager';
import {retrieveChannels} from '@screens/find_channels/utils';
import TestHelper from '@test/test_helper';

import Recent from './recent';

import EnhancedRecent from './index';

import type ServerDataOperator from '@database/operator/server_data_operator';
import type {Database} from '@nozbe/watermelondb';
import type ChannelModel from '@typings/database/models/servers/channel';
import type {ReactTestInstance} from 'react-test-renderer';

jest.mock('./recent', () => ({
    __esModule: true,
    default: jest.fn(),
}));

// It runs raw SQL, which the in-memory test database cannot run; the memberships it is given are
// what this enhancer decides.
jest.mock('@screens/find_channels/utils', () => ({
    retrieveChannels: jest.fn(),
}));

jest.mocked(Recent).mockImplementation((props) => React.createElement('Recent', {...props, testID: 'recent'}));

describe('share_extension/recent_channels enhancer', () => {
    const serverUrl = 'share-recent-channels.test.com';
    let database: Database;
    let operator: ServerDataOperator;

    beforeEach(async () => {
        jest.mocked(retrieveChannels).mockImplementation((_db, myChannels) => of$(myChannels as unknown as ChannelModel[]));
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
            TestHelper.fakeChannel({id: 'gm1', type: General.GM_CHANNEL, team_id: ''}),
            TestHelper.fakeChannel({id: 'open1', type: General.OPEN_CHANNEL, team_id: 'team1'}),
        ];
        const myChannels = [
            TestHelper.fakeMyChannel({id: 'gm1', channel_id: 'gm1', last_viewed_at: 2}),
            TestHelper.fakeMyChannel({id: 'open1', channel_id: 'open1', last_viewed_at: 1}),
        ];
        await operator.handleChannel({channels, prepareRecordsOnly: false});
        await operator.handleMyChannel({channels, myChannels, prepareRecordsOnly: false});
        await operator.handleSystem({
            systems: [{id: SYSTEM_IDENTIFIERS.LICENSE, value: {IsLicensed: 'true', SkuShortName: License.SKU_SHORT_NAME.EnterpriseAdvanced}}],
            prepareRecordsOnly: false,
        });
    });

    afterEach(async () => {
        await DatabaseManager.destroyServerDatabase(serverUrl);
    });

    const recentIds = (element: ReactTestInstance) => (element.props.recentChannels as ChannelModel[]).map((c) => c.id);

    it('should list conversations while they can be shared to', async () => {
        const {getByTestId} = render(<EnhancedRecent database={database}/>);

        await waitFor(() => {
            expect(recentIds(getByTestId('recent'))).toEqual(['gm1', 'open1']);
        });
    });

    it('should leave conversations out while a DM/GM policy denies reading or writing them', async () => {
        await operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.DM_GM_ACCESS, value: {start: true, read: true, write: false}}], prepareRecordsOnly: false});
        const {getByTestId} = render(<EnhancedRecent database={database}/>);

        await waitFor(() => {
            expect(recentIds(getByTestId('recent'))).toEqual(['open1']);
        });
    });
});
