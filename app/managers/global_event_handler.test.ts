// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Alert, DeviceEventEmitter} from 'react-native';

import {switchToChannelById} from '@actions/remote/channel';
import {batchTeamThreadSync} from '@actions/remote/thread';
import {Events, Device} from '@constants';
import DatabaseManager from '@database/manager';
import {getServerCredentials} from '@init/credentials';
import {getActiveServerUrl} from '@queries/app/servers';
import {queryTeamDefaultChannel} from '@queries/servers/channel';
import {getCommonSystemValues} from '@queries/servers/system';
import {getTeamChannelHistory} from '@queries/servers/team';

import GlobalEventHandler from './global_event_handler';

jest.mock('@actions/remote/thread', () => ({batchTeamThreadSync: jest.fn()}));
jest.mock('@actions/remote/channel', () => ({switchToChannelById: jest.fn()}));
jest.mock('@init/credentials', () => ({getServerCredentials: jest.fn()}));
jest.mock('@queries/app/servers', () => ({getActiveServerUrl: jest.fn()}));
jest.mock('@queries/servers/channel', () => ({queryTeamDefaultChannel: jest.fn()}));
jest.mock('@queries/servers/system', () => ({getCommonSystemValues: jest.fn()}));
jest.mock('@queries/servers/team', () => ({getTeamChannelHistory: jest.fn()}));
jest.mock('@database/manager', () => ({getServerDatabaseAndOperator: jest.fn()}));
jest.mock('@utils/error_handling', () => ({default: {initializeErrorHandling: jest.fn()}}), {virtual: true});

describe('GlobalEventHandler', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        jest.spyOn(Alert, 'alert').mockImplementation(jest.fn());
    });

    describe('onPostDeletedForChannel', () => {
        it('should call batchTeamThreadSync with serverUrl and teamId', async () => {
            await GlobalEventHandler.onPostDeletedForChannel({serverUrl: 'http://server.com', teamId: 'team1'});
            expect(batchTeamThreadSync).toHaveBeenCalledWith('http://server.com', 'team1');
        });
    });

    describe('onServerVersionChanged', () => {
        it('should not show alert when version meets minimum requirement', async () => {
            await GlobalEventHandler.onServerVersionChanged({serverUrl: 'http://server.com', serverVersion: '10.0.0'});
            expect(Alert.alert).not.toHaveBeenCalled();
        });

        it('should show alert when version is below minimum', async () => {
            // Use a version guaranteed to be below the minimum
            await GlobalEventHandler.onServerVersionChanged({serverUrl: 'http://server.com', serverVersion: '1.0.0'});
            expect(Alert.alert).toHaveBeenCalledTimes(1);
        });

        it('should not show alert when serverVersion is undefined', async () => {
            await GlobalEventHandler.onServerVersionChanged({serverUrl: 'http://server.com', serverVersion: undefined});
            expect(Alert.alert).not.toHaveBeenCalled();
        });

        it('should not show alert for invalid semver strings', async () => {
            await GlobalEventHandler.onServerVersionChanged({serverUrl: 'http://server.com', serverVersion: 'not-a-version'});
            expect(Alert.alert).not.toHaveBeenCalled();
        });
    });

    describe('serverUpgradeNeeded', () => {
        it('should emit SERVER_LOGOUT when credentials exist', async () => {
            (getServerCredentials as jest.Mock).mockResolvedValue({token: 'abc'});
            const emitSpy = jest.spyOn(DeviceEventEmitter, 'emit');

            await GlobalEventHandler.serverUpgradeNeeded('http://server.com');

            expect(emitSpy).toHaveBeenCalledWith(Events.SERVER_LOGOUT, {serverUrl: 'http://server.com', removeServer: false});
        });

        it('should not emit SERVER_LOGOUT when credentials are missing', async () => {
            (getServerCredentials as jest.Mock).mockResolvedValue(null);
            const emitSpy = jest.spyOn(DeviceEventEmitter, 'emit');

            await GlobalEventHandler.serverUpgradeNeeded('http://server.com');

            expect(emitSpy).not.toHaveBeenCalledWith(Events.SERVER_LOGOUT, expect.anything());
        });
    });

    describe('onSplitViewChanged', () => {
        const serverUrl = 'http://server.com';
        const teamId = 'team1';

        beforeEach(() => {
            (getActiveServerUrl as jest.Mock).mockResolvedValue(serverUrl);
            (DatabaseManager.getServerDatabaseAndOperator as jest.Mock).mockReturnValue({database: {}});
        });

        it('should not do anything when isTablet value has not changed', async () => {
            const originalTablet = Device.IS_TABLET;
            await GlobalEventHandler.onSplitViewChanged({isTablet: originalTablet} as any);
            expect(switchToChannelById).not.toHaveBeenCalled();
        });

        it('should switch to channel from team history when switching to tablet and no channel is active', async () => {
            Device.IS_TABLET = false;
            (getCommonSystemValues as jest.Mock).mockResolvedValue({currentTeamId: teamId, currentChannelId: ''});
            (getTeamChannelHistory as jest.Mock).mockResolvedValue(['channel1']);

            await GlobalEventHandler.onSplitViewChanged({isTablet: true} as any);

            expect(Device.IS_TABLET).toBe(true);
            expect(switchToChannelById).toHaveBeenCalledWith(serverUrl, 'channel1');

            Device.IS_TABLET = false;
        });

        it('should switch to default channel when team history is empty', async () => {
            Device.IS_TABLET = false;
            (getCommonSystemValues as jest.Mock).mockResolvedValue({currentTeamId: teamId, currentChannelId: ''});
            (getTeamChannelHistory as jest.Mock).mockResolvedValue([]);
            (queryTeamDefaultChannel as jest.Mock).mockReturnValue({fetch: jest.fn().mockResolvedValue([{id: 'defaultChannel'}])});

            await GlobalEventHandler.onSplitViewChanged({isTablet: true} as any);

            expect(switchToChannelById).toHaveBeenCalledWith(serverUrl, 'defaultChannel');

            Device.IS_TABLET = false;
        });

        it('should not switch channel when already on a channel in tablet mode', async () => {
            Device.IS_TABLET = false;
            (getCommonSystemValues as jest.Mock).mockResolvedValue({currentTeamId: teamId, currentChannelId: 'already-open'});

            await GlobalEventHandler.onSplitViewChanged({isTablet: true} as any);

            expect(switchToChannelById).not.toHaveBeenCalled();

            Device.IS_TABLET = false;
        });

        it('should not switch channel when switching to non-tablet mode', async () => {
            Device.IS_TABLET = true;
            await GlobalEventHandler.onSplitViewChanged({isTablet: false} as any);

            expect(switchToChannelById).not.toHaveBeenCalled();

            Device.IS_TABLET = false;
        });
    });
});
