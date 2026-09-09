// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import {setCurrentCall} from '@calls/state';
import {DefaultCurrentCall} from '@calls/types/calls';
import DatabaseManager from '@database/manager';
import {act, renderWithEverything} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

import CallScreen from './call_screen';

import CallScreenIndex from './index';

import type ServerDataOperator from '@database/operator/server_data_operator';
import type {Database} from '@nozbe/watermelondb';

jest.mock('./call_screen');
jest.mocked(CallScreen).mockImplementation((props) => {
    return React.createElement('CallScreen', {
        testID: 'call-screen',
        ...props,
    });
});

// withObservables emits each prop on its own database tick; give them all a chance to land inside act().
const flushObservables = async () => {
    await act(async () => {
        await new Promise(process.nextTick);
    });
};

const activeServerUrl = 'active-server';
const callServerUrl = 'call-server';
const channelId = 'channel-id';
const myUserId = 'my-user-id';
const teammateId = 'teammate-id';

describe('CallScreen Index', () => {
    let activeDatabase: Database;
    let callOperator: ServerDataOperator;

    beforeEach(async () => {
        await DatabaseManager.init([activeServerUrl, callServerUrl]);
        activeDatabase = DatabaseManager.getServerDatabaseAndOperator(activeServerUrl).database;
        callOperator = DatabaseManager.getServerDatabaseAndOperator(callServerUrl).operator;

        // The same channel id exists on both servers with different values, so that reading it from the
        // active server's database (instead of the call server's) produces observably wrong props.
        await DatabaseManager.getServerDatabaseAndOperator(activeServerUrl).operator.handleChannel({
            channels: [TestHelper.fakeChannel({
                id: channelId,
                type: 'O',
                name: 'wrong-active-channel',
                display_name: 'Wrong Active Channel',
            })],
            prepareRecordsOnly: false,
        });

        await callOperator.handleChannel({
            channels: [TestHelper.fakeChannel({
                id: channelId,
                type: 'D',
                name: `${myUserId}__${teammateId}`,
                display_name: 'Correct Call Channel',
            })],
            prepareRecordsOnly: false,
        });

        await callOperator.handleUsers({
            users: [TestHelper.fakeUser({id: teammateId})],
            prepareRecordsOnly: false,
        });
    });

    afterEach(async () => {
        await act(async () => {
            setCurrentCall(null);
        });
        await DatabaseManager.destroyServerDatabase(activeServerUrl);
        await DatabaseManager.destroyServerDatabase(callServerUrl);
    });

    it('should derive the channel props from the call server database, not the active server database', async () => {
        setCurrentCall({
            ...DefaultCurrentCall,
            id: 'call-id',
            channelId,
            serverUrl: callServerUrl,
            myUserId,
        });

        // The provider is given the active server's database on purpose: the call screen can be opened from
        // the current call bar while another server is active.
        const {getByTestId} = renderWithEverything(
            <CallScreenIndex/>,
            {database: activeDatabase, serverUrl: activeServerUrl},
        );
        await flushObservables();

        const component = getByTestId('call-screen');
        expect(component.props.isDM).toBe(true);
        expect(component.props.displayName).toBe('Correct Call Channel');
        expect(component.props.isOwnDirectMessage).toBe(false);
    });
});
