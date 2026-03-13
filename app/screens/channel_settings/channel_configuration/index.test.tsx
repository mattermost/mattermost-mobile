// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {View} from 'react-native';

import {General, Permissions, Screens} from '@constants';
import {SYSTEM_IDENTIFIERS} from '@constants/database';
import DatabaseManager from '@database/manager';
import {renderWithEverything, waitFor} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

import ChannelConfiguration from './channel_configuration';

import EnhancedChannelConfiguration from './index';

import type ServerDataOperator from '@database/operator/server_data_operator';
import type {Database} from '@nozbe/watermelondb';

jest.mock('./channel_configuration', () => ({
    __esModule: true,
    default: jest.fn(),
}));
jest.mocked(ChannelConfiguration).mockImplementation(
    (props) => React.createElement(View, {testID: 'channel_configuration', ...props}),
);

describe('ChannelConfiguration index (enhanced)', () => {
    const serverUrl = 'https://server.test';
    const channelId = 'channel1';
    const currentUserId = 'user1';

    let database: Database;
    let operator: ServerDataOperator;

    beforeEach(async () => {
        await DatabaseManager.init([serverUrl]);
        const serverDatabaseAndOperator = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        database = serverDatabaseAndOperator.database;
        operator = serverDatabaseAndOperator.operator;
    });

    afterEach(async () => {
        await DatabaseManager.destroyServerDatabase(serverUrl);
        jest.clearAllMocks();
    });

    it('renders ChannelConfiguration with default props when database has no data', async () => {
        const {getByTestId} = renderWithEverything(
            <EnhancedChannelConfiguration
                channelId={channelId}
                componentId={Screens.CHANNEL_CONFIGURATION as 'ChannelConfiguration'}
            />,
            {database, serverUrl},
        );

        await waitFor(() => {
            const component = getByTestId('channel_configuration');
            expect(component).toBeTruthy();
        });

        const component = getByTestId('channel_configuration');
        expect(component).toHaveProp('channelId', channelId);
        expect(component).toHaveProp('displayName', '');
        expect(component).toHaveProp('isChannelShared', false);
        expect(component).toHaveProp('canManageAutotranslations', false);
        expect(component).toHaveProp('canManageSharedChannel', false);
    });

    it('passes displayName and isChannelShared from channel when channel exists', async () => {
        await operator.handleChannel({
            channels: [TestHelper.fakeChannel({
                id: channelId,
                display_name: 'My Channel',
                type: General.OPEN_CHANNEL,
                delete_at: 0,
                shared: true,
            })],
            prepareRecordsOnly: false,
        });

        await operator.handleSystem({
            systems: [{id: SYSTEM_IDENTIFIERS.CURRENT_USER_ID, value: currentUserId}],
            prepareRecordsOnly: false,
        });
        await operator.handleUsers({
            users: [TestHelper.fakeUser({id: currentUserId, roles: 'system_user'})],
            prepareRecordsOnly: false,
        });

        const {getByTestId} = renderWithEverything(
            <EnhancedChannelConfiguration
                channelId={channelId}
                componentId={Screens.CHANNEL_CONFIGURATION as 'ChannelConfiguration'}
            />,
            {database, serverUrl},
        );

        await waitFor(() => {
            const component = getByTestId('channel_configuration');
            expect(component).toHaveProp('displayName', 'My Channel');
            expect(component).toHaveProp('isChannelShared', true);
        });
    });

    it('passes canManageAutotranslations true when feature enabled and user has permission', async () => {
        await operator.handleConfigs({
            configs: [
                {id: 'EnableAutoTranslation', value: 'true'},
                {id: 'RestrictDMAndGMAutotranslation', value: 'false'},
            ],
            configsToDelete: [],
            prepareRecordsOnly: false,
        });
        await operator.handleChannel({
            channels: [TestHelper.fakeChannel({
                id: channelId,
                display_name: 'Test',
                type: General.OPEN_CHANNEL,
                delete_at: 0,
            })],
            prepareRecordsOnly: false,
        });
        await operator.handleRole({
            roles: [{
                id: 'channel_admin',
                name: 'channel_admin',
                permissions: [Permissions.MANAGE_PUBLIC_CHANNEL_AUTO_TRANSLATION],
            }],
            prepareRecordsOnly: false,
        });
        await operator.handleSystem({
            systems: [{id: SYSTEM_IDENTIFIERS.CURRENT_USER_ID, value: currentUserId}],
            prepareRecordsOnly: false,
        });
        await operator.handleUsers({
            users: [TestHelper.fakeUser({id: currentUserId, roles: 'channel_admin'})],
            prepareRecordsOnly: false,
        });

        const {getByTestId} = renderWithEverything(
            <EnhancedChannelConfiguration
                channelId={channelId}
                componentId={Screens.CHANNEL_CONFIGURATION as 'ChannelConfiguration'}
            />,
            {database, serverUrl},
        );

        await waitFor(() => {
            const component = getByTestId('channel_configuration');
            expect(component).toHaveProp('canManageAutotranslations', true);
        });
    });

    it('passes canManageSharedChannel true when feature flag and permission are set', async () => {
        await operator.handleConfigs({
            configs: [{id: 'ExperimentalSharedChannels', value: 'true'}],
            configsToDelete: [],
            prepareRecordsOnly: false,
        });
        await operator.handleChannel({
            channels: [TestHelper.fakeChannel({
                id: channelId,
                display_name: 'Shared Channel',
                type: General.OPEN_CHANNEL,
                delete_at: 0,
            })],
            prepareRecordsOnly: false,
        });
        await operator.handleRole({
            roles: [{
                id: 'channel_admin',
                name: 'channel_admin',
                permissions: [Permissions.MANAGE_SHARED_CHANNELS],
            }],
            prepareRecordsOnly: false,
        });
        await operator.handleSystem({
            systems: [{id: SYSTEM_IDENTIFIERS.CURRENT_USER_ID, value: currentUserId}],
            prepareRecordsOnly: false,
        });
        await operator.handleUsers({
            users: [TestHelper.fakeUser({id: currentUserId, roles: 'channel_admin'})],
            prepareRecordsOnly: false,
        });

        const {getByTestId} = renderWithEverything(
            <EnhancedChannelConfiguration
                channelId={channelId}
                componentId={Screens.CHANNEL_CONFIGURATION as 'ChannelConfiguration'}
            />,
            {database, serverUrl},
        );

        await waitFor(() => {
            const component = getByTestId('channel_configuration');
            expect(component).toHaveProp('canManageSharedChannel', true);
        });
    });

    it('passes canManageSharedChannel false when ExperimentalSharedChannels is false', async () => {
        await operator.handleConfigs({
            configs: [{id: 'ExperimentalSharedChannels', value: 'false'}],
            configsToDelete: [],
            prepareRecordsOnly: false,
        });
        await operator.handleChannel({
            channels: [TestHelper.fakeChannel({
                id: channelId,
                type: General.OPEN_CHANNEL,
                delete_at: 0,
            })],
            prepareRecordsOnly: false,
        });
        await operator.handleRole({
            roles: [{
                id: 'channel_admin',
                name: 'channel_admin',
                permissions: [Permissions.MANAGE_SHARED_CHANNELS],
            }],
            prepareRecordsOnly: false,
        });
        await operator.handleSystem({
            systems: [{id: SYSTEM_IDENTIFIERS.CURRENT_USER_ID, value: currentUserId}],
            prepareRecordsOnly: false,
        });
        await operator.handleUsers({
            users: [TestHelper.fakeUser({id: currentUserId, roles: 'channel_admin'})],
            prepareRecordsOnly: false,
        });

        const {getByTestId} = renderWithEverything(
            <EnhancedChannelConfiguration
                channelId={channelId}
                componentId={Screens.CHANNEL_CONFIGURATION as 'ChannelConfiguration'}
            />,
            {database, serverUrl},
        );

        await waitFor(() => {
            const component = getByTestId('channel_configuration');
            expect(component).toHaveProp('canManageSharedChannel', false);
        });
    });
});
