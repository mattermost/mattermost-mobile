// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Database} from '@nozbe/watermelondb';
import React, {type ComponentProps} from 'react';
import {BehaviorSubject} from 'rxjs';

import DatabaseManager from '@database/manager';
import WebsocketManager from '@managers/websocket_manager';
import {act, renderWithEverything, waitFor} from '@test/intl-test-helper';

import OutOfDateHeaderComponent from './out_of_date_header';

import OutOfDateHeader from './';

jest.mock('./out_of_date_header');
jest.mocked(OutOfDateHeaderComponent).mockImplementation(
    (props) => React.createElement('OutOfDateHeader', {testID: 'out-of-date-header', ...props}),
);

describe('OutOfDateHeader', () => {
    const serverUrl = 'server-url';

    function getBaseProps(): ComponentProps<typeof OutOfDateHeader> {
        return {
            serverUrl,
            lastSyncAt: Date.now(),
        };
    }

    let database: Database;

    beforeEach(async () => {
        await DatabaseManager.init([serverUrl]);
        const serverDatabaseAndOperator = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        database = serverDatabaseAndOperator.database;
    });

    afterEach(() => {
        DatabaseManager.destroyServerDatabase(serverUrl);
    });

    it('should render correctly', async () => {
        const websocketSubject = new BehaviorSubject<WebsocketConnectedState>('connected');
        const websocketObserverSpy = jest.spyOn(WebsocketManager, 'observeWebsocketState');
        websocketObserverSpy.mockReturnValue(websocketSubject.asObservable());

        const props = getBaseProps();
        const {getByTestId} = renderWithEverything(<OutOfDateHeader {...props}/>, {database});

        const outOfDateHeader = getByTestId('out-of-date-header');
        expect(outOfDateHeader).toBeTruthy();
        expect(outOfDateHeader.props.websocketState).toBe('connected');

        act(() => {
            websocketSubject.next('not_connected');
        });

        await waitFor(() => {
            expect(outOfDateHeader.props.websocketState).toBe('not_connected');
        });
    });
});
