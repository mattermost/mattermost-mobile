// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {act, render, screen, waitFor} from '@testing-library/react-native';
import {Redirect} from 'expo-router';
import React from 'react';
import {Text} from 'react-native';

import DatabaseManager from '@database/manager';
import {subscribeActiveServers} from '@database/subscription/servers';

import {withServerDatabase} from './index';

import type {Database} from '@nozbe/watermelondb';
import type {ServerDatabase} from '@typings/database/database';
import type ServersModel from '@typings/database/models/app/servers';

jest.mock('expo-router', () => ({
    Redirect: jest.fn(() => null),
}));

jest.mock('@nozbe/watermelondb/react', () => ({
    DatabaseProvider: ({children}: {children: React.ReactNode}) => children,
}));

jest.mock('@context/device', () => ({
    __esModule: true,
    default: ({children}: {children: React.ReactNode}) => children,
}));

jest.mock('@context/server', () => ({
    __esModule: true,
    default: ({children}: {children: React.ReactNode}) => children,
}));

jest.mock('@context/theme', () => ({
    __esModule: true,
    default: ({children}: {children: React.ReactNode}) => children,
}));

jest.mock('@context/user_locale', () => ({
    __esModule: true,
    default: ({children}: {children: React.ReactNode}) => children,
}));

jest.mock('@database/manager', () => ({
    serverDatabases: {},
}));

jest.mock('@database/subscription/servers', () => ({
    subscribeActiveServers: jest.fn(),
}));

const mockRedirect = Redirect as unknown as jest.Mock;
const mockSubscribeActiveServers = jest.mocked(subscribeActiveServers);
const server = {
    url: 'https://server.example',
    displayName: 'Server',
    identifier: 'server-id',
    lastActiveAt: 100,
    persistenceFlag: '',
} as ServersModel;

const Ready = () => <Text testID='server_database.ready'>{'Ready'}</Text>;

describe('withServerDatabase authenticated recovery', () => {
    let observer: (servers: ServersModel[]) => void;

    beforeEach(() => {
        jest.clearAllMocks();
        DatabaseManager.serverDatabases = {};
        mockSubscribeActiveServers.mockImplementation((callback) => {
            observer = callback;
            return {unsubscribe: jest.fn()} as unknown as ReturnType<typeof subscribeActiveServers>;
        });
    });

    it('redirects the authenticated layout instead of rendering a permanent null tree', async () => {
        const Wrapped = withServerDatabase(Ready, {redirectToServerWhenUnavailable: true});
        render(<Wrapped/>);

        expect(screen.getByTestId('server_database.loading')).toBeTruthy();
        await act(async () => observer([]));

        await waitFor(() => expect(mockRedirect).toHaveBeenCalledWith({href: '/(unauthenticated)/server'}, undefined));
        expect(screen.queryByTestId('server_database.ready')).toBeNull();
    });

    it('recovers when the active record has no initialized database', async () => {
        const Wrapped = withServerDatabase(Ready, {redirectToServerWhenUnavailable: true});
        render(<Wrapped/>);

        await act(async () => observer([server]));

        await waitFor(() => expect(mockRedirect).toHaveBeenCalled());
        expect(screen.queryByTestId('server_database.ready')).toBeNull();
    });

    it('also recovers an incomplete cold-start record with no database', async () => {
        const Wrapped = withServerDatabase(Ready, {redirectToServerWhenUnavailable: true});
        render(<Wrapped/>);

        await act(async () => observer([{...server, lastActiveAt: 0} as ServersModel]));

        await waitFor(() => expect(mockRedirect).toHaveBeenCalled());
        expect(screen.queryByTestId('server_database.ready')).toBeNull();
    });

    it('does not redirect other database consumers', async () => {
        const Wrapped = withServerDatabase(Ready);
        render(<Wrapped/>);

        await act(async () => observer([]));

        expect(mockRedirect).not.toHaveBeenCalled();
        expect(screen.queryByTestId('server_database.ready')).toBeNull();
    });

    it('renders the wrapped layout when the active database is available', async () => {
        const database = {adapter: {dbName: 'server'}} as unknown as Database;
        DatabaseManager.serverDatabases[server.url] = {database} as ServerDatabase;
        const Wrapped = withServerDatabase(Ready, {redirectToServerWhenUnavailable: true});
        render(<Wrapped/>);

        await act(async () => observer([server]));

        expect(screen.getByTestId('server_database.ready')).toBeTruthy();
        expect(mockRedirect).not.toHaveBeenCalled();
    });
});
