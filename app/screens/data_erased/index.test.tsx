// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {act, fireEvent, waitFor} from '@testing-library/react-native';
import React from 'react';
import {AppState, type AppStateStatus} from 'react-native';
import {of as of$} from 'rxjs';

import {reconnectErasedServer} from '@actions/remote/ephemeral_mode/reconnect';
import ServerUrlProvider from '@context/server';
import {subscribeAllServers} from '@database/subscription/servers';
import {observeUnreadsByServer} from '@database/subscription/unreads';
import {bottomSheet} from '@screens/navigation';
import {renderWithIntlAndTheme} from '@test/intl-test-helper';

import DataErased from './index';

import type ServersModel from '@typings/database/models/app/servers';

jest.mock('@actions/remote/ephemeral_mode/reconnect', () => ({
    reconnectErasedServer: jest.fn(),
}));
jest.mock('@screens/navigation', () => ({
    bottomSheet: jest.fn(),
}));
jest.mock('@database/subscription/servers', () => ({
    subscribeAllServers: jest.fn(),
}));
jest.mock('@database/subscription/unreads', () => ({
    observeUnreadsByServer: jest.fn(),
}));

describe('DataErased', () => {
    const serverUrl = 'https://server.test';
    const displayName = 'My Server';

    const renderScreen = () => renderWithIntlAndTheme(
        <ServerUrlProvider server={{url: serverUrl, displayName}}>
            <DataErased
                serverUrl={serverUrl}
                displayName={displayName}
            />
        </ServerUrlProvider>,
    );

    beforeEach(() => {
        jest.clearAllMocks();

        // Calling mockRestore() on a jest.fn (rather than a real function spy) wipes
        // the implementation, leaving subsequent tests with undefined. Re-establish it
        // here so every test gets a valid subscription object.
        (AppState.addEventListener as jest.Mock).mockReturnValue({remove: jest.fn()});
        (subscribeAllServers as jest.Mock).mockReturnValue({unsubscribe: jest.fn()});
        (observeUnreadsByServer as jest.Mock).mockReturnValue(of$({mentions: 0, unread: false}));
    });

    it('renders title, body, and reconnect button', () => {
        const {getByText, getByTestId} = renderScreen();

        expect(getByText('Cached data cleared')).toBeTruthy();
        expect(getByText(/My Server/)).toBeTruthy(); // body interpolates {displayName}
        expect(getByTestId('data_erased.reconnect.button')).toBeTruthy();
    });

    it('reconnect button: invokes the handler and disables / shows loading while in flight', async () => {
        let resolveReconnect: (value: {error?: unknown}) => void = () => {};
        jest.mocked(reconnectErasedServer).mockReturnValue(new Promise((r) => {
            resolveReconnect = r;
        }));

        const {getByTestId} = renderScreen();

        fireEvent.press(getByTestId('data_erased.reconnect.button'));

        expect(reconnectErasedServer).toHaveBeenCalledTimes(1);
        expect(reconnectErasedServer).toHaveBeenCalledWith(serverUrl);

        // Disabled / loading state surfaces while the promise is pending.
        await waitFor(() => {
            expect(getByTestId('data_erased.reconnect.button.disabled')).toBeTruthy();
        });

        await act(async () => {
            resolveReconnect({});
        });
    });

    it('clears the inline error when the app comes back from background', async () => {
        jest.mocked(reconnectErasedServer).mockResolvedValue({error: new Error('Network unreachable')});

        const handlers: Array<(state: AppStateStatus) => void> = [];
        const removeSpy = jest.fn();
        const addListenerSpy = jest.spyOn(AppState, 'addEventListener').mockImplementation((event, handler) => {
            if (event === 'change') {
                handlers.push(handler as (state: AppStateStatus) => void);
            }
            return {remove: removeSpy};
        });

        const {getByTestId, findByText, queryByText} = renderScreen();

        fireEvent.press(getByTestId('data_erased.reconnect.button'));

        expect(await findByText(/Couldn't reach the server/)).toBeTruthy();

        await act(async () => {
            handlers.forEach((h) => h('background'));
            handlers.forEach((h) => h('active'));
        });

        expect(queryByText(/Couldn't reach the server/)).toBeNull();

        addListenerSpy.mockRestore();

        // Re-establish the default implementation that mockRestore() wipes when
        // used on an existing jest.fn (as opposed to a real function).
        (AppState.addEventListener as jest.Mock).mockReturnValue({remove: jest.fn()});
    });

    it('shows inline error text when reconnectErasedServer returns {error}', async () => {
        jest.mocked(reconnectErasedServer).mockResolvedValue({error: new Error('Network unreachable')});

        const {getByTestId, findByText} = renderScreen();

        fireEvent.press(getByTestId('data_erased.reconnect.button'));

        expect(await findByText(/Couldn't reach the server/)).toBeTruthy();
    });

    it('opens the servers bottom sheet when the icon is pressed after servers load', async () => {
        let observer: ((servers: ServersModel[]) => void) | undefined;
        (subscribeAllServers as jest.Mock).mockImplementation((cb) => {
            observer = cb;
            return {unsubscribe: jest.fn()};
        });

        const {getByTestId} = renderScreen();

        await act(async () => {
            observer?.([
                {url: serverUrl, displayName, lastActiveAt: 0} as ServersModel,
                {url: 'https://other.test', displayName: 'Other', lastActiveAt: 1} as ServersModel,
            ]);
        });

        fireEvent.press(getByTestId('data_erased.servers.server_icon'));

        expect(bottomSheet).toHaveBeenCalledTimes(1);
    });

    it('does not open the bottom sheet when no servers have been observed yet', () => {
        const {getByTestId} = renderScreen();

        fireEvent.press(getByTestId('data_erased.servers.server_icon'));

        expect(bottomSheet).not.toHaveBeenCalled();
    });

    it('subscribes to unreads only for other active servers, never the wiped one', async () => {
        let observer: ((servers: ServersModel[]) => void) | undefined;
        (subscribeAllServers as jest.Mock).mockImplementation((cb) => {
            observer = cb;
            return {unsubscribe: jest.fn()};
        });

        renderScreen();

        await act(async () => {
            observer?.([
                {url: serverUrl, displayName, lastActiveAt: 1, persistenceFlag: 'wiped'} as ServersModel,
                {url: 'https://other.test', displayName: 'Other', lastActiveAt: 1} as ServersModel,
                {url: 'https://signed-out.test', displayName: 'Signed-out', lastActiveAt: 0} as ServersModel,
            ]);
        });

        expect(observeUnreadsByServer).toHaveBeenCalledTimes(1);
        expect(observeUnreadsByServer).toHaveBeenCalledWith('https://other.test');
    });
});
