// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Launch} from '@constants';
import DatabaseManager from '@database/manager';
import {getServerCredentials} from '@init/credentials';
import {getLastViewedTeamIdAndServer} from '@queries/app/global';
import {getServer} from '@queries/app/servers';
import {getThemeForCurrentTeam} from '@queries/servers/preference';
import {queryMyTeams} from '@queries/servers/team';

import {determineRouteFromLaunchProps} from './launch';

import type ServersModel from '@typings/database/models/app/servers';
import type {LaunchProps} from '@typings/launch';

jest.mock('@init/credentials');
jest.mock('@queries/app/global');
jest.mock('@queries/app/servers');
jest.mock('@queries/servers/preference');
jest.mock('@queries/servers/team');
jest.mock('@store/ephemeral_store');
jest.mock('@actions/remote/entry', () => ({
    appEntry: jest.fn(),
    pushNotificationEntry: jest.fn(),
}));
jest.mock('@managers/websocket_manager', () => ({
    __esModule: true,
    default: {
        initializeClient: jest.fn(),
    },
}));

describe('startColdStartEntry', () => {
    it('should kick off websocket and appEntry without waiting for initializeClient', async () => {
        await jest.isolateModulesAsync(async () => {
            const {startColdStartEntry: start} = require('./launch') as typeof import('./launch');
            const {appEntry: entry} = require('@actions/remote/entry') as {appEntry: jest.Mock};
            const WebsocketManager = require('@managers/websocket_manager').default as {initializeClient: jest.Mock};

            const order: string[] = [];
            WebsocketManager.initializeClient.mockImplementation(() => {
                order.push('ws');
                return Promise.resolve();
            });
            entry.mockImplementation(() => {
                order.push('entry');
            });

            start('https://hub.example.com');
            start('https://hub.example.com');

            expect(WebsocketManager.initializeClient).toHaveBeenCalledTimes(2);
            expect(WebsocketManager.initializeClient).toHaveBeenCalledWith(
                'https://hub.example.com',
                'Cold Start',
                {skipConfigWait: true},
            );
            expect(entry).toHaveBeenCalledTimes(2);
            expect(entry).toHaveBeenCalledWith('https://hub.example.com');
            expect(order).toEqual(['ws', 'entry', 'ws', 'entry']);
        });
    });
});

describe('determineRouteFromLaunchProps', () => {
    const serverUrl = 'https://server-1.com';
    const props: LaunchProps = {launchType: Launch.Normal, serverUrl, coldStart: false};

    beforeEach(() => {
        jest.mocked(getServerCredentials).mockResolvedValue({token: 'token1'} as ServerCredential);
        jest.mocked(getThemeForCurrentTeam).mockResolvedValue(undefined);
    });

    it('should route to home without querying team count when a last viewed team matches the server on a zero persistence server', async () => {
        jest.mocked(getServer).mockResolvedValue({persistenceFlag: 'zero-persistence'} as unknown as ServersModel);
        jest.mocked(getLastViewedTeamIdAndServer).mockResolvedValue({server_url: serverUrl, team_id: 'team1'});

        const result = await determineRouteFromLaunchProps(props);

        expect(result).toEqual({route: '/(authenticated)/(home)', params: props});
        expect(queryMyTeams).not.toHaveBeenCalled();
    });

    it('should query team count instead of trusting a cached last viewed team on a non-zero-persistence server', async () => {
        jest.mocked(getServer).mockResolvedValue({persistenceFlag: 'default'} as unknown as ServersModel);
        jest.mocked(getLastViewedTeamIdAndServer).mockResolvedValue({server_url: serverUrl, team_id: 'team1'});
        DatabaseManager.getServerDatabaseAndOperator = jest.fn().mockReturnValue({database: {}, operator: {}});
        jest.mocked(queryMyTeams).mockReturnValue({fetch: jest.fn().mockResolvedValue([])} as unknown as ReturnType<typeof queryMyTeams>);

        const result = await determineRouteFromLaunchProps(props);

        expect(result).toEqual({route: '/(authenticated)/select_team', params: props});
    });

    it('should route to select_team when there is no last viewed team and the user has not joined any team', async () => {
        jest.mocked(getLastViewedTeamIdAndServer).mockResolvedValue(undefined);
        DatabaseManager.getServerDatabaseAndOperator = jest.fn().mockReturnValue({database: {}, operator: {}});
        jest.mocked(queryMyTeams).mockReturnValue({fetch: jest.fn().mockResolvedValue([])} as unknown as ReturnType<typeof queryMyTeams>);

        const result = await determineRouteFromLaunchProps(props);

        expect(result).toEqual({route: '/(authenticated)/select_team', params: props});
    });

    it('should route to home when there is no last viewed team but the user has already joined a team', async () => {
        jest.mocked(getLastViewedTeamIdAndServer).mockResolvedValue(undefined);
        DatabaseManager.getServerDatabaseAndOperator = jest.fn().mockReturnValue({database: {}, operator: {}});
        jest.mocked(queryMyTeams).mockReturnValue({fetch: jest.fn().mockResolvedValue([{id: 'team1'}])} as unknown as ReturnType<typeof queryMyTeams>);

        const result = await determineRouteFromLaunchProps(props);

        expect(result).toEqual({route: '/(authenticated)/(home)', params: props});
    });
});
