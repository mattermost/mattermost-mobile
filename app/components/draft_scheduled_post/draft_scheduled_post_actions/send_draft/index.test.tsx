// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import {General, Screens} from '@constants';
import {SYSTEM_IDENTIFIERS} from '@constants/database';
import permissions from '@constants/permissions';
import {PostPriorityType} from '@constants/post';
import DatabaseManager from '@database/manager/__mocks__';
import {renderWithEverything} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

import SendDraft from './send_draft';

import EnhancedSendDraft from './index';

import type ServerDataOperator from '@database/operator/server_data_operator';
import type Database from '@nozbe/watermelondb/Database';

jest.mock('./send_draft', () => ({
    __esModule: true,
    default: jest.fn(),
}));

jest.mocked(SendDraft).mockImplementation((props) => React.createElement('SendDraft', {...props, testID: 'send-draft'}));

describe('EnhancedSendDraft', () => {
    const serverUrl = 'server-1';
    const teamId = 'team1';
    let database: Database;
    let operator: ServerDataOperator;

    const defaultProps = {
        channelId: 'channel1',
        rootId: 'root1',
        channelType: General.DM_CHANNEL,
        currentUserId: 'user1',
        channelName: 'channel1',
        maxMessageLength: 1000,
        customEmojis: [],
        value: '',
        files: [],
        useChannelMentions: false,
        userIsOutOfOffice: false,
        persistentNotificationInterval: 0,
        persistentNotificationMaxRecipients: 0,
        postPriority: {
            priority: PostPriorityType.STANDARD,
            requested_ack: false,
            persistent_notifications: false,
        },
        bottomSheetId: Screens.SCHEDULED_POST_OPTIONS,
        channelDisplayName: 'channel1',
        draftReceiverUserName: '',
    };

    beforeEach(async () => {
        await DatabaseManager.init([serverUrl]);
        const serverDatabaseAndOperator = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        database = serverDatabaseAndOperator.database;
        operator = serverDatabaseAndOperator.operator;
        await operator.handleUsers({users: [TestHelper.fakeUser({
            id: 'user1',
        })],
        prepareRecordsOnly: false});
        await operator.handleTeam({teams: [TestHelper.fakeTeam({id: teamId})], prepareRecordsOnly: false});
        await operator.handleSystem(
            {
                systems: [
                    {
                        id: SYSTEM_IDENTIFIERS.CURRENT_TEAM_ID,
                        value: teamId,
                    },
                    {
                        id: SYSTEM_IDENTIFIERS.CURRENT_USER_ID,
                        value: 'user1',
                    },
                    {
                        id: SYSTEM_IDENTIFIERS.CURRENT_CHANNEL_ID,
                        value: 'channel1',
                    },
                ],
                prepareRecordsOnly: false,
            });
        await operator.handleConfigs({
            configs: [
                {id: 'Version', value: '7.6.0'},
            ],
            configsToDelete: [],
            prepareRecordsOnly: false,
        });
        await operator.handleMyTeam({
            myTeams: [
                {
                    id: teamId,
                    roles: 'role-name',
                },
            ],
            prepareRecordsOnly: false,
        });

        await operator.handleRole({roles: [TestHelper.fakeRole({
            id: 'role-id',
            name: 'role-name',
            permissions: [permissions.CREATE_POST],
        })],
        prepareRecordsOnly: false});
    });

    afterEach(async () => {
        await DatabaseManager.destroyServerDatabase(serverUrl);
    });

    it('should return the correct values', async () => {
        await operator.handleChannel({channels: [TestHelper.fakeChannel({id: 'channel1', team_id: teamId})], prepareRecordsOnly: false});
        const {getByTestId} = renderWithEverything(
            <EnhancedSendDraft {...defaultProps}/>,
            {database},
        );

        expect(getByTestId('send-draft')).toBeTruthy();
        expect(getByTestId('send-draft').props.canPost).toBe(true);
        expect(getByTestId('send-draft').props.channelIsArchived).toBe(false);
        expect(getByTestId('send-draft').props.channelIsReadOnly).toBe(false);
        expect(getByTestId('send-draft').props.deactivatedChannel).toBe(false);
    });

    it('should return the correct values when the channel is archived', async () => {
        await operator.handleChannel({channels: [TestHelper.fakeChannel({id: 'channel1', delete_at: 1})], prepareRecordsOnly: false});
        const {getByTestId} = renderWithEverything(
            <EnhancedSendDraft {...defaultProps}/>,
            {database},

        );

        expect(getByTestId('send-draft')).toBeTruthy();
        expect(getByTestId('send-draft').props.channelIsArchived).toBe(true);
    });

    it('should return the correct values when the channel is read only', async () => {
        await operator.handleChannel({channels: [TestHelper.fakeChannel({id: 'channel1', name: General.DEFAULT_CHANNEL, delete_at: 0})], prepareRecordsOnly: false});
        await operator.handleConfigs({
            configs: [
                {id: 'ExperimentalTownSquareIsReadOnly', value: 'true'},
            ],
            configsToDelete: [],
            prepareRecordsOnly: false,
        });
        const {getByTestId} = renderWithEverything(
            <EnhancedSendDraft {...defaultProps}/>,
            {database},
        );

        expect(getByTestId('send-draft')).toBeTruthy();
        expect(getByTestId('send-draft').props.channelIsReadOnly).toBe(true);
    });

    it('should return the correct values when the channel is deactivated', async () => {
        await operator.handleChannel({channels: [TestHelper.fakeChannel({id: 'channel1', name: 'user2__channel1', type: General.DM_CHANNEL, delete_at: 0})], prepareRecordsOnly: false});
        await operator.handleUsers({
            users: [
                TestHelper.fakeUser({
                    id: 'user2',
                    delete_at: 1,
                }),
            ],
            prepareRecordsOnly: false,
        });
        const {getByTestId} = renderWithEverything(
            <EnhancedSendDraft {...defaultProps}/>,
            {database},
        );

        expect(getByTestId('send-draft')).toBeTruthy();
        expect(getByTestId('send-draft').props.deactivatedChannel).toBe(true);
    });

});
