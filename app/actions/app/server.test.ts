// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {createIntl} from 'react-intl';
import {Navigation} from 'react-native-navigation';

import {doPing} from '@actions/remote/general';
import {fetchConfigAndLicense} from '@actions/remote/systems';
import {Preferences, Screens} from '@constants';
import DatabaseManager from '@database/manager';
import {DEFAULT_LOCALE, getTranslations} from '@i18n';
import SecurityManager from '@managers/security_manager';
import WebsocketManager from '@managers/websocket_manager';
import {getServer, getServerByIdentifier, queryAllActiveServers} from '@queries/app/servers';
import {getSecurityConfig} from '@queries/servers/system';
import TestHelper from '@test/test_helper';
import {logError} from '@utils/log';
import {canReceiveNotifications} from '@utils/push_proxy';
import {alertServerAlreadyConnected, alertServerError, loginToServer} from '@utils/server';

import * as Actions from './server';

import type {ServerDatabase} from '@typings/database/database';
import type ServersModel from '@typings/database/models/app/servers';

jest.mock('@queries/app/servers');
jest.mock('@queries/servers/system');
jest.mock('@database/manager', () => ({
    getServerDatabaseAndOperator: jest.fn(),
    setActiveServerDatabase: jest.fn(),
    getActiveServerUrl: jest.fn(),
}));
jest.mock('@managers/security_manager');
jest.mock('@managers/websocket_manager');
jest.mock('@utils/log');
jest.mock('@utils/push_proxy');
jest.mock('@utils/server');
jest.mock('@actions/remote/general');
jest.mock('@actions/remote/systems');
jest.mock('react-native-navigation');

const translations = getTranslations(DEFAULT_LOCALE);
const intl = createIntl({locale: DEFAULT_LOCALE, messages: translations});
const theme = Preferences.THEMES.denim;

describe('initializeSecurityManager', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should return when no servers are found', async () => {
        const mockQuery = TestHelper.mockQuery<ServersModel>([]);
        jest.mocked(queryAllActiveServers).mockReturnValueOnce(mockQuery);
        await Actions.initializeSecurityManager();
        expect(SecurityManager.init).not.toHaveBeenCalled();
    });

    it('should initialize SecurityManager with querying configurations', async () => {
        const servers = [{url: 'server1'}, {url: 'server2'}] as ServersModel[];
        const mockQuery = TestHelper.mockQuery<ServersModel>(servers);
        jest.mocked(queryAllActiveServers).mockReturnValueOnce(mockQuery);
        jest.mocked(DatabaseManager.getServerDatabaseAndOperator).mockImplementation((serverUrl) => ({database: `db_${serverUrl}`} as unknown as ServerDatabase));
        const config = {
            SiteName: 'Site',
            MobileEnableBiometrics: 'true',
            MobilePreventScreenCapture: 'true',
            MobileJailbreakProtection: 'true',
        } as unknown as ClientConfig;
        jest.mocked(getSecurityConfig).mockImplementation((db) => Promise.resolve({
            ...config,
            key: `config_${db}`,
        }));

        await Actions.initializeSecurityManager();

        expect(SecurityManager.init).toHaveBeenCalledWith({
            server1: {...config, key: 'config_db_server1'},
            server2: {...config, key: 'config_db_server2'},
        }, undefined);
    });

    it('should log error when querying configuration fails', async () => {
        const servers = [{url: 'server1'}] as ServersModel[];
        const mockQuery = TestHelper.mockQuery<ServersModel>(servers);
        jest.mocked(queryAllActiveServers).mockReturnValueOnce(mockQuery);
        jest.mocked(DatabaseManager.getServerDatabaseAndOperator).mockImplementation(() => {
            throw new Error('test error');
        });

        await Actions.initializeSecurityManager();

        expect(logError).toHaveBeenCalledWith('initializeSecurityManager', expect.any(Error));
    });
});

// Tests for switchToServer
describe('switchToServer', () => {
    it('should log error when server is not found', async () => {
        jest.mocked(getServer).mockResolvedValueOnce(undefined);
        await Actions.switchToServer('serverUrl', theme, intl, jest.fn());
        expect(logError).toHaveBeenCalledWith('Switch to Server with url serverUrl not found');
    });

    it('should switch to server when lastActiveAt is set', async () => {
        const server = {url: 'serverUrl', lastActiveAt: 123} as ServersModel;
        jest.mocked(getServer).mockResolvedValueOnce(server);
        jest.mocked(SecurityManager.isDeviceJailbroken).mockResolvedValueOnce(false);
        jest.mocked(SecurityManager.authenticateWithBiometricsIfNeeded).mockResolvedValueOnce(true);

        await Actions.switchToServer('serverUrl', theme, intl, jest.fn());

        expect(Navigation.updateProps).toHaveBeenCalledWith(Screens.HOME, {extra: undefined});
        expect(DatabaseManager.setActiveServerDatabase).toHaveBeenCalledWith('serverUrl');
        expect(SecurityManager.setActiveServer).toHaveBeenCalledWith('serverUrl');
        expect(WebsocketManager.initializeClient).toHaveBeenCalledWith('serverUrl', 'Server Switch');
    });

    it('should not proceed if device is jailbroken', async () => {
        const server = {url: 'serverUrl', lastActiveAt: 123} as ServersModel;
        jest.mocked(getServer).mockResolvedValueOnce(server);
        jest.mocked(SecurityManager.isDeviceJailbroken).mockResolvedValueOnce(true);
        jest.mocked(SecurityManager.authenticateWithBiometricsIfNeeded).mockResolvedValueOnce(true);

        await Actions.switchToServer('serverUrl', theme, intl, jest.fn());

        expect(Navigation.updateProps).not.toHaveBeenCalled();
        expect(DatabaseManager.setActiveServerDatabase).not.toHaveBeenCalled();
        expect(SecurityManager.setActiveServer).not.toHaveBeenCalled();
        expect(WebsocketManager.initializeClient).not.toHaveBeenCalled();
        expect(SecurityManager.isDeviceJailbroken).toHaveBeenCalledWith('serverUrl');
    });
});

// Tests for switchToServerAndLogin
describe('switchToServerAndLogin', () => {
    it('should log error when server is not found', async () => {
        jest.mocked(getServer).mockResolvedValueOnce(undefined);
        await Actions.switchToServerAndLogin('serverUrl', theme, intl, jest.fn());
        expect(logError).toHaveBeenCalledWith('Switch to Server with url serverUrl not found');
    });

    it('should alert server error when ping fails', async () => {
        const server = {url: 'serverUrl'} as ServersModel;
        jest.mocked(getServer).mockResolvedValueOnce(server);
        jest.mocked(doPing).mockResolvedValueOnce({error: 'ping error'});

        await Actions.switchToServerAndLogin('serverUrl', theme, intl, jest.fn());

        expect(alertServerError).toHaveBeenCalledWith(intl, 'ping error');
    });

    it('should alert server error when fetching config and license fails', async () => {
        const server = {url: 'serverUrl'} as ServersModel;
        jest.mocked(getServer).mockResolvedValueOnce(server);
        jest.mocked(doPing).mockResolvedValueOnce({});
        jest.mocked(fetchConfigAndLicense).mockResolvedValueOnce({error: 'config error'});

        await Actions.switchToServerAndLogin('serverUrl', theme, intl, jest.fn());

        expect(alertServerError).toHaveBeenCalledWith(intl, 'config error');
    });

    it('should alert server already connected when server is already connected', async () => {
        const server = {url: 'serverUrl'} as ServersModel;
        const config = {DiagnosticId: 'diagId', MobileEnableBiometrics: 'true', SiteName: 'Site'} as ClientConfig;
        jest.mocked(getServer).mockResolvedValueOnce(server);
        jest.mocked(doPing).mockResolvedValueOnce({});
        jest.mocked(fetchConfigAndLicense).mockResolvedValueOnce({config});
        jest.mocked(getServerByIdentifier).mockResolvedValueOnce({lastActiveAt: 123} as ServersModel);

        await Actions.switchToServerAndLogin('serverUrl', theme, intl, jest.fn());

        expect(alertServerAlreadyConnected).toHaveBeenCalledWith(intl);
    });

    it('should authenticate with biometrics and login to server', async () => {
        const server = {url: 'serverUrl', displayName: 'Server'} as ServersModel;
        const config = {DiagnosticId: 'diagId', MobileEnableBiometrics: 'true', SiteName: 'Site'} as ClientConfig;
        const license = {} as ClientLicense;
        jest.mocked(getServer).mockResolvedValueOnce(server);
        jest.mocked(doPing).mockResolvedValueOnce({});
        jest.mocked(fetchConfigAndLicense).mockResolvedValueOnce({config, license});
        jest.mocked(getServerByIdentifier).mockResolvedValueOnce(undefined);
        jest.mocked(SecurityManager.authenticateWithBiometrics).mockResolvedValueOnce(true);

        await Actions.switchToServerAndLogin('serverUrl', theme, intl, jest.fn());

        expect(canReceiveNotifications).toHaveBeenCalledWith('serverUrl', undefined, intl);
        expect(loginToServer).toHaveBeenCalledWith(theme, 'serverUrl', 'Server', config, license);
    });

    it('should not proceed if device is jailbroken', async () => {
        const server = {url: 'serverUrl'} as ServersModel;
        const config = {DiagnosticId: 'diagId', MobileJailbreakProtection: 'true'} as ClientConfig;
        jest.mocked(getServer).mockResolvedValueOnce(server);
        jest.mocked(doPing).mockResolvedValueOnce({});
        jest.mocked(fetchConfigAndLicense).mockResolvedValueOnce({config});
        jest.mocked(getServerByIdentifier).mockResolvedValueOnce(undefined);
        jest.mocked(SecurityManager.isDeviceJailbroken).mockResolvedValueOnce(true);

        const callback = jest.fn();
        await Actions.switchToServerAndLogin('serverUrl', theme, intl, callback);

        expect(SecurityManager.isDeviceJailbroken).toHaveBeenCalledWith('serverUrl');
        expect(callback).toHaveBeenCalled();
    });
});
