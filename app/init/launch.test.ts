// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Launch} from '@constants';
import DatabaseManager from '@database/manager';
import {getActiveServerUrl, getServerCredentials} from '@init/credentials';
import {getLastViewedTeamIdAndServer} from '@queries/app/global';
import {getServer} from '@queries/app/servers';
import {getThemeForCurrentTeam} from '@queries/servers/preference';
import {queryMyTeams} from '@queries/servers/team';

import {determinePostWireGuardRoute, determineRouteFromLaunchProps} from './launch';

import type {Database} from '@nozbe/watermelondb';
import type {ServerDatabase} from '@typings/database/database';
import type ServersModel from '@typings/database/models/app/servers';
import type {LaunchProps} from '@typings/launch';

jest.mock('@init/credentials');
jest.mock('@queries/app/global');
jest.mock('@queries/app/servers');
jest.mock('@queries/servers/preference');
jest.mock('@queries/servers/team');
jest.mock('@store/ephemeral_store');

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

describe('determinePostWireGuardRoute', () => {
    const serverUrl = 'https://server-1.com';

    beforeEach(() => {
        jest.spyOn(DatabaseManager, 'getActiveServerUrl').mockResolvedValue(serverUrl);
        jest.mocked(getServerCredentials).mockResolvedValue({token: 'token1'} as ServerCredential);
        jest.mocked(getThemeForCurrentTeam).mockResolvedValue(undefined);
        jest.mocked(getServer).mockResolvedValue({persistenceFlag: 'default'} as unknown as ServersModel);
        jest.mocked(getLastViewedTeamIdAndServer).mockResolvedValue(undefined);
        DatabaseManager.serverDatabases = {};
    });

    it('uses the existing team decision without running cold-start routing', async () => {
        DatabaseManager.serverDatabases[serverUrl] = {database: {} as Database} as ServerDatabase;
        DatabaseManager.getServerDatabaseAndOperator = jest.fn().mockReturnValue({database: {}, operator: {}});
        jest.mocked(queryMyTeams).mockReturnValue({fetch: jest.fn().mockResolvedValue([{id: 'team1'}])} as unknown as ReturnType<typeof queryMyTeams>);

        const result = await determinePostWireGuardRoute();

        expect(result).toEqual({
            route: '/(authenticated)/(home)',
            params: {launchType: Launch.Normal, coldStart: false, serverUrl},
        });
    });

    it('returns to the server form when the active database is unavailable', async () => {
        const result = await determinePostWireGuardRoute();

        expect(result).toEqual({
            route: '/(unauthenticated)/server',
            params: {launchType: Launch.Normal, coldStart: false, serverUrl},
        });
        expect(getServerCredentials).not.toHaveBeenCalled();
    });

    it('returns to the server form without waiting for secure-storage discovery when there is no active server', async () => {
        jest.mocked(getActiveServerUrl).mockReturnValue(new Promise(() => undefined));
        jest.mocked(DatabaseManager.getActiveServerUrl).mockResolvedValue(undefined);

        const result = await determinePostWireGuardRoute();

        expect(result.route).toBe('/(unauthenticated)/server');
        expect(result.params.serverUrl).toBeUndefined();
        expect(getActiveServerUrl).not.toHaveBeenCalled();
        expect(getServerCredentials).not.toHaveBeenCalled();
    });
});
