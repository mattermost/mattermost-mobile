// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {act, renderHook} from '@testing-library/react-native';
import {BehaviorSubject} from 'rxjs';

import {fetchRenderPermissions} from '@actions/remote/render_permissions';
import DatabaseManager from '@database/manager';
import WebsocketManager from '@managers/websocket_manager';
import {observeShouldFetchRenderPermissions} from '@queries/servers/render_permissions';

import {useFetchRenderPermissions} from './render_permissions';

const serverUrl = 'https://render-permissions-hook.test.com';

jest.mock('@context/server', () => ({
    useServerUrl: jest.fn(() => 'https://render-permissions-hook.test.com'),
}));
jest.mock('@actions/remote/render_permissions', () => ({
    fetchRenderPermissions: jest.fn(),
}));
jest.mock('@queries/servers/render_permissions', () => ({
    observeShouldFetchRenderPermissions: jest.fn(),
}));

describe('useFetchRenderPermissions', () => {
    let shouldFetch: BehaviorSubject<boolean>;
    let websocketState: BehaviorSubject<WebsocketConnectedState>;

    beforeEach(async () => {
        await DatabaseManager.init([serverUrl]);
        shouldFetch = new BehaviorSubject(true);
        websocketState = new BehaviorSubject<WebsocketConnectedState>('connected');
        jest.mocked(observeShouldFetchRenderPermissions).mockReturnValue(shouldFetch);
        jest.spyOn(WebsocketManager, 'observeWebsocketState').mockReturnValue(websocketState);
        jest.mocked(fetchRenderPermissions).mockClear();
    });

    afterEach(async () => {
        await DatabaseManager.destroyServerDatabase(serverUrl);
    });

    it('should fetch on mount and again whenever the decisions go stale', () => {
        renderHook(() => useFetchRenderPermissions('channel-id'));
        expect(fetchRenderPermissions).toHaveBeenCalledTimes(1);
        expect(fetchRenderPermissions).toHaveBeenCalledWith(serverUrl, 'channel-id');

        act(() => shouldFetch.next(false));
        act(() => shouldFetch.next(true));

        expect(fetchRenderPermissions).toHaveBeenCalledTimes(2);
    });

    it('should wait for the server to be reachable before fetching', () => {
        websocketState.next('not_connected');
        renderHook(() => useFetchRenderPermissions('channel-id'));
        expect(fetchRenderPermissions).not.toHaveBeenCalled();

        act(() => websocketState.next('connected'));

        expect(fetchRenderPermissions).toHaveBeenCalledTimes(1);
    });

    it('should stop fetching once unmounted, and do nothing without a channel', () => {
        const {unmount} = renderHook(() => useFetchRenderPermissions('channel-id'));
        unmount();
        act(() => shouldFetch.next(false));
        act(() => shouldFetch.next(true));
        expect(fetchRenderPermissions).toHaveBeenCalledTimes(1);

        renderHook(() => useFetchRenderPermissions(undefined));
        expect(fetchRenderPermissions).toHaveBeenCalledTimes(1);
    });
});
