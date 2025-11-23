// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {createIntl} from 'react-intl';
import {DeviceEventEmitter} from 'react-native';

import {doPing} from '@actions/remote/general';
import {fetchConfigAndLicense} from '@actions/remote/systems';
import {Events, Preferences} from '@constants';
import DatabaseManager from '@database/manager';
import {DEFAULT_LOCALE, getTranslations} from '@i18n';
import SecurityManager from '@managers/security_manager';
import WebsocketManager from '@managers/websocket_manager';
import {getServer, getServerByIdentifier} from '@queries/app/servers';
import TestHelper from '@test/test_helper';
import {logError} from '@utils/log';
import {canReceiveNotifications} from '@utils/push_proxy';
import {alertServerAlreadyConnected, alertServerError, loginToServer} from '@utils/server';

import * as Actions from './server';

import type ServersModel from '@typings/database/models/app/servers';

jest.mock('@queries/app/servers');
jest.mock('@queries/servers/system');
jest.mock('@database/manager');
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

// Tests for switchToServer
describe('switchToServer', () => {
    const emitSpy = jest.spyOn(DeviceEventEmitter, 'emit');

    beforeAll(() => {
        // Register the SecurityManager listener manually since the mocked SecurityManager doesn't run its constructor
        DeviceEventEmitter.addListener(Events.ACTIVE_SERVER_CHANGED, jest.mocked(SecurityManager).setActiveServer);
    });

    beforeEach(async () => {
        // Initialize the database for each test
        await DatabaseManager.init(['serverUrl']);
    });

    afterEach(async () => {
        // Clean up
        await DatabaseManager.destroyServerDatabase('serverUrl');
        emitSpy.mockClear();
        jest.mocked(SecurityManager).setActiveServer.mockClear();
        jest.mocked(SecurityManager).isDeviceJailbroken.mockClear();
        jest.mocked(SecurityManager).authenticateWithBiometricsIfNeeded.mockClear();
    });

    it('should log error when server is not found', async () => {
        jest.mocked(getServer).mockResolvedValueOnce(undefined);
        await Actions.switchToServer('serverUrl', theme, intl, jest.fn());
        expect(logError).toHaveBeenCalledWith('Switch to Server with url serverUrl not found');
    });

    it('should switch to server when lastActiveAt is set', async () => {
        const server = {url: 'serverUrl', lastActiveAt: 123} as ServersModel;
        const setActiveSpy = jest.spyOn(DatabaseManager, 'setActiveServerDatabase');
        jest.mocked(getServer).mockResolvedValueOnce(server);
        jest.mocked(SecurityManager).isDeviceJailbroken.mockResolvedValueOnce(false);
        jest.mocked(SecurityManager).authenticateWithBiometricsIfNeeded.mockResolvedValueOnce(true);

        await Actions.switchToServer('serverUrl', theme, intl, jest.fn());

        // Wait for the async database operation to complete (setActiveServerDatabase is called without await)
        await TestHelper.wait(10);

        expect(setActiveSpy).toHaveBeenCalledWith('serverUrl');
        expect(emitSpy).toHaveBeenCalledWith(Events.ACTIVE_SERVER_CHANGED, 'serverUrl');
        expect(SecurityManager.setActiveServer).toHaveBeenCalledWith('serverUrl');
        expect(WebsocketManager.initializeClient).toHaveBeenCalledWith('serverUrl', 'Server Switch');
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

        await Actions.switchToServerAndLogin('serverUrl', theme, intl, jest.fn());

        expect(canReceiveNotifications).toHaveBeenCalledWith('serverUrl', undefined, intl);
        expect(loginToServer).toHaveBeenCalledWith(theme, 'serverUrl', 'Server', config, license);
    });
});
