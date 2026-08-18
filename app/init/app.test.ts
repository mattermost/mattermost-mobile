// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {CallsManager} from '@calls/calls_manager';
import DatabaseManager from '@database/manager';
import CallsNative from '@init/calls_native';
import {getAllServerCredentials} from '@init/credentials';
import ManagedApp from '@init/managed_app';
import PushNotifications from '@init/push_notifications';
import EphemeralModeManager from '@managers/ephemeral_mode_manager';
import GlobalEventHandler from '@managers/global_event_handler';
import NetworkManager from '@managers/network_manager';
import SecurityManager from '@managers/security_manager';
import SessionManager from '@managers/session_manager';
import WebsocketManager from '@managers/websocket_manager';
import {getActiveServer, queryAllActiveServers} from '@queries/app/servers';
import EphemeralStore from '@store/ephemeral_store';
import {NavigationStore} from '@store/navigation_store';

import {initialize} from './app';

jest.mock('@calls/calls_manager', () => ({
    CallsManager: {
        initialize: jest.fn(),
        cleanup: jest.fn(),
    },
}));
jest.mock('@database/manager', () => ({
    __esModule: true,
    default: {
        initAppDatabase: jest.fn(),
        initServerDatabases: jest.fn(),
    },
}));
jest.mock('@init/calls_native', () => ({
    __esModule: true,
    default: {
        init: jest.fn(),
        cleanup: jest.fn(),
    },
}));
jest.mock('@init/credentials', () => ({
    getAllServerCredentials: jest.fn(),
}));
jest.mock('@init/launch_profiler', () => ({
    launchMark: jest.fn(),
}));
jest.mock('@init/managed_app', () => ({
    __esModule: true,
    default: {
        init: jest.fn(),
        cleanup: jest.fn(),
    },
}));
jest.mock('@init/push_notifications', () => ({
    __esModule: true,
    default: {
        init: jest.fn(),
        cleanup: jest.fn(),
    },
}));
jest.mock('@init/session_cache', () => ({
    setCachedActiveServer: jest.fn(),
}));
jest.mock('@managers/ephemeral_mode_manager', () => ({
    __esModule: true,
    default: {
        init: jest.fn(),
        cleanup: jest.fn(),
    },
}));
jest.mock('@managers/global_event_handler', () => ({
    __esModule: true,
    default: {
        init: jest.fn(),
        cleanup: jest.fn(),
    },
}));
jest.mock('@managers/network_manager', () => ({
    __esModule: true,
    default: {
        init: jest.fn(),
    },
}));
jest.mock('@managers/security_manager', () => ({
    __esModule: true,
    default: {
        init: jest.fn(),
        cleanup: jest.fn(),
    },
}));
jest.mock('@managers/session_manager', () => ({
    __esModule: true,
    default: {
        init: jest.fn(),
        cleanup: jest.fn(),
    },
}));
jest.mock('@managers/websocket_manager', () => ({
    __esModule: true,
    default: {
        init: jest.fn(),
    },
}));
jest.mock('@queries/app/servers', () => ({
    getActiveServer: jest.fn(),
    queryAllActiveServers: jest.fn(),
}));
jest.mock('@store/ephemeral_store', () => ({
    __esModule: true,
    default: {
        setCurrentThreadId: jest.fn(),
        setProcessingNotification: jest.fn(),
    },
}));
jest.mock('@store/navigation_store', () => ({
    NavigationStore: {
        reset: jest.fn(),
    },
}));

describe('initialize', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        jest.mocked(DatabaseManager.initAppDatabase).mockResolvedValue(undefined);
        jest.mocked(DatabaseManager.initServerDatabases).mockResolvedValue(undefined);
        jest.mocked(getAllServerCredentials).mockResolvedValue([]);
        jest.mocked(getActiveServer).mockResolvedValue(undefined);
        jest.mocked(queryAllActiveServers).mockReturnValue({
            fetch: jest.fn().mockResolvedValue([]),
        } as unknown as ReturnType<typeof queryAllActiveServers>);
        jest.mocked(NetworkManager.init).mockResolvedValue(undefined as never);
        jest.mocked(EphemeralModeManager.init).mockResolvedValue(undefined as never);
        jest.mocked(WebsocketManager.init).mockResolvedValue(undefined as never);
        jest.mocked(SecurityManager.init).mockResolvedValue(undefined as never);
    });

    it('should retry base initialization after a rejected startup', async () => {
        const error = new Error('db init failed');
        jest.mocked(DatabaseManager.initAppDatabase).
            mockRejectedValueOnce(error).
            mockResolvedValueOnce(undefined);

        await expect(initialize()).rejects.toThrow('db init failed');
        expect(DatabaseManager.initAppDatabase).toHaveBeenCalledTimes(1);
        expect(NavigationStore.reset).not.toHaveBeenCalled();

        await initialize();

        expect(DatabaseManager.initAppDatabase).toHaveBeenCalledTimes(2);
        expect(DatabaseManager.initServerDatabases).toHaveBeenCalledTimes(1);
        expect(NetworkManager.init).toHaveBeenCalledTimes(1);
        expect(WebsocketManager.init).toHaveBeenCalledTimes(1);
        expect(SecurityManager.init).toHaveBeenCalledTimes(1);
        expect(GlobalEventHandler.init).toHaveBeenCalledTimes(1);
        expect(ManagedApp.init).toHaveBeenCalledTimes(1);
        expect(SessionManager.init).toHaveBeenCalledTimes(1);
        expect(CallsManager.initialize).toHaveBeenCalledTimes(1);
        expect(CallsNative.init).toHaveBeenCalledTimes(1);
        expect(PushNotifications.init).toHaveBeenCalledWith(false);
        expect(EphemeralStore.setCurrentThreadId).toHaveBeenCalledWith('');
        expect(NavigationStore.reset).toHaveBeenCalledTimes(1);
    });
});
