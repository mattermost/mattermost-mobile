// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {act, fireEvent, waitFor} from '@testing-library/react-native';
import React from 'react';
import {AppState, type AppStateStatus} from 'react-native';

import {reconnectErasedServer} from '@actions/local/ephemeral_mode/reconnect';
import {renderWithIntlAndTheme} from '@test/intl-test-helper';

import DataErased from './index';

jest.mock('@actions/local/ephemeral_mode/reconnect', () => ({
    reconnectErasedServer: jest.fn(),
}));

describe('DataErased', () => {
    const serverUrl = 'https://server.test';
    const displayName = 'My Server';

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders title, body, and reconnect button', () => {
        const {getByText, getByTestId} = renderWithIntlAndTheme(
            <DataErased
                serverUrl={serverUrl}
                displayName={displayName}
            />,
        );

        expect(getByText('Data has been erased')).toBeTruthy();
        expect(getByText(/My Server/)).toBeTruthy(); // body interpolates {displayName}
        expect(getByTestId('data_erased.reconnect.button')).toBeTruthy();
    });

    it('reconnect button: invokes the handler and disables / shows loading while in flight', async () => {
        let resolveReconnect: (value: {error?: unknown; needsReauth?: boolean}) => void = () => {};
        jest.mocked(reconnectErasedServer).mockReturnValue(new Promise((r) => {
            resolveReconnect = r;
        }));

        const {getByTestId} = renderWithIntlAndTheme(
            <DataErased
                serverUrl={serverUrl}
                displayName={displayName}
            />,
        );

        fireEvent.press(getByTestId('data_erased.reconnect.button'));

        expect(reconnectErasedServer).toHaveBeenCalledTimes(1);
        expect(reconnectErasedServer).toHaveBeenCalledWith(serverUrl, displayName);

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

        const {getByTestId, findByText, queryByText} = renderWithIntlAndTheme(
            <DataErased
                serverUrl={serverUrl}
                displayName={displayName}
            />,
        );

        fireEvent.press(getByTestId('data_erased.reconnect.button'));

        expect(await findByText(/Couldn't reach the server/)).toBeTruthy();

        await act(async () => {
            handlers.forEach((h) => h('background'));
            handlers.forEach((h) => h('active'));
        });

        expect(queryByText(/Couldn't reach the server/)).toBeNull();

        addListenerSpy.mockRestore();
    });

    it('shows inline error text when reconnectErasedServer returns {error}', async () => {
        jest.mocked(reconnectErasedServer).mockResolvedValue({error: new Error('Network unreachable')});

        const {getByTestId, findByText} = renderWithIntlAndTheme(
            <DataErased
                serverUrl={serverUrl}
                displayName={displayName}
            />,
        );

        fireEvent.press(getByTestId('data_erased.reconnect.button'));

        expect(await findByText(/Couldn't reach the server/)).toBeTruthy();
    });
});
