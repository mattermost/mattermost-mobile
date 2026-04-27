// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {upgradeEntry} from '@actions/remote/entry';
import {Launch} from '@constants';
import DatabaseManager from '@database/manager';
import {removePreauthSecret, removeServerCredentials} from '@init/credentials';
import {relaunchApp} from '@init/launch';
import {resetToHome} from '@screens/navigation';

import {reconnectErasedServer} from './reconnect';

jest.mock('@actions/remote/entry', () => ({
    upgradeEntry: jest.fn(),
}));
jest.mock('@init/credentials', () => ({
    removeServerCredentials: jest.fn(),
    removePreauthSecret: jest.fn(),
}));
jest.mock('@init/launch', () => ({
    relaunchApp: jest.fn(),
}));
jest.mock('@screens/navigation', () => ({
    resetToHome: jest.fn(),
}));
jest.mock('@utils/log');

describe('reconnectErasedServer', () => {
    const serverUrl = 'https://server.test';
    const displayName = 'My Server';

    let createSpy: jest.SpyInstance;
    let updateWipedAtSpy: jest.SpyInstance;

    beforeEach(() => {
        jest.clearAllMocks();
        createSpy = jest.spyOn(DatabaseManager, 'createServerDatabase').mockResolvedValue(undefined);
        updateWipedAtSpy = jest.spyOn(DatabaseManager, 'updateServerWipedAt').mockResolvedValue(undefined);
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('on success: re-creates DB, runs upgradeEntry, clears wipedAt, and navigates home', async () => {
        jest.mocked(upgradeEntry).mockResolvedValue({error: undefined, time: 0});

        const result = await reconnectErasedServer(serverUrl, displayName);

        expect(createSpy).toHaveBeenCalledWith({
            config: {dbName: serverUrl, serverUrl, identifier: '', displayName},
        });
        expect(upgradeEntry).toHaveBeenCalledWith(serverUrl);
        expect(updateWipedAtSpy).toHaveBeenCalledWith(serverUrl, 0);
        expect(resetToHome).toHaveBeenCalledWith(expect.objectContaining({serverUrl}));
        expect(relaunchApp).not.toHaveBeenCalled();
        expect(result).toEqual({});
    });

    it('on 401: clears wipedAt and credentials, then relaunches into AddServer', async () => {
        jest.mocked(upgradeEntry).mockResolvedValue({error: {status_code: 401, message: 'Unauthorized'}, time: 0});

        const result = await reconnectErasedServer(serverUrl, displayName);

        expect(updateWipedAtSpy).toHaveBeenCalledWith(serverUrl, 0);
        expect(removeServerCredentials).toHaveBeenCalledWith(serverUrl);
        expect(removePreauthSecret).toHaveBeenCalledWith(serverUrl);
        expect(relaunchApp).toHaveBeenCalledWith({launchType: Launch.AddServer, serverUrl, displayName});
        expect(resetToHome).not.toHaveBeenCalled();
        expect(result).toEqual({needsReauth: true});
    });

    it('on generic error: leaves wipedAt set, no navigation, returns the error', async () => {
        const networkError = new Error('Network unavailable');
        jest.mocked(upgradeEntry).mockResolvedValue({error: networkError, time: 0});

        const result = await reconnectErasedServer(serverUrl, displayName);

        expect(updateWipedAtSpy).not.toHaveBeenCalled();
        expect(removeServerCredentials).not.toHaveBeenCalled();
        expect(removePreauthSecret).not.toHaveBeenCalled();
        expect(resetToHome).not.toHaveBeenCalled();
        expect(relaunchApp).not.toHaveBeenCalled();
        expect(result).toEqual({error: networkError});
    });
});
