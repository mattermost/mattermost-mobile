// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import {setCurrentCall} from '@calls/state';
import {DefaultCurrentCall} from '@calls/types/calls';
import {General} from '@constants';
import DatabaseManager from '@database/manager';
import {act, renderWithEverything} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

import {CurrentCallBar} from './current_call_bar';

import CurrentCallBarIndex from './index';

import type {Database} from '@nozbe/watermelondb';

jest.mock('./current_call_bar');
jest.mocked(CurrentCallBar).mockImplementation((props) => {
    return React.createElement('CurrentCallBar', {
        testID: 'current-call-bar',
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

describe('CurrentCallBar Index', () => {
    let activeDatabase: Database;

    beforeEach(async () => {
        await DatabaseManager.init([activeServerUrl, callServerUrl]);
        const active = DatabaseManager.getServerDatabaseAndOperator(activeServerUrl);
        const call = DatabaseManager.getServerDatabaseAndOperator(callServerUrl);
        activeDatabase = active.database;

        // The same channel id, and the name display setting, exist on both servers with different values, so that
        // reading them from the active server's database (instead of the call server's) is observable in the props.
        await active.operator.handleChannel({
            channels: [TestHelper.fakeChannel({id: channelId, display_name: 'Wrong Active Channel'})],
            prepareRecordsOnly: false,
        });
        await active.operator.handleConfigs({
            configs: [{id: 'TeammateNameDisplay', value: General.TEAMMATE_NAME_DISPLAY.SHOW_NICKNAME_FULLNAME}],
            configsToDelete: [],
            prepareRecordsOnly: false,
        });

        await call.operator.handleChannel({
            channels: [TestHelper.fakeChannel({id: channelId, display_name: 'Correct Call Channel'})],
            prepareRecordsOnly: false,
        });
        await call.operator.handleConfigs({
            configs: [{id: 'TeammateNameDisplay', value: General.TEAMMATE_NAME_DISPLAY.SHOW_FULLNAME}],
            configsToDelete: [],
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

    it('should derive the props from the call server database, not the active server database', async () => {
        setCurrentCall({
            ...DefaultCurrentCall,
            id: 'call-id',
            channelId,
            serverUrl: callServerUrl,
            myUserId,
        });

        // The provider is given the active server's database on purpose: the call bar is rendered while another
        // server is active.
        const {getByTestId} = renderWithEverything(
            <CurrentCallBarIndex/>,
            {database: activeDatabase, serverUrl: activeServerUrl},
        );
        await flushObservables();

        const component = getByTestId('current-call-bar');
        expect(component.props.displayName).toBe('Correct Call Channel');
        expect(component.props.teammateNameDisplay).toBe(General.TEAMMATE_NAME_DISPLAY.SHOW_FULLNAME);
    });
});
