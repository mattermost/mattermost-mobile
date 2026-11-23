// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Linking} from 'react-native';
import {Notifications} from 'react-native-notifications';

import {Launch, PushNotification} from '@constants';
import DatabaseManager from '@database/manager';
import {getServerCredentials} from '@init/credentials';
import {getLastViewedTeamIdAndServer} from '@queries/app/global';
import {getActiveServer, getAllServers, getServer} from '@queries/app/servers';
import {getThemeForCurrentTeam} from '@queries/servers/preference';
import {queryMyTeams} from '@queries/servers/team';
import EphemeralStore from '@store/ephemeral_store';

import {determineInitialExpoRoute, determineRouteFromLaunchProps} from './launch';

import type ServersModel from '@typings/database/models/app/servers';
import type {LaunchProps} from '@typings/launch';

jest.mock('@init/credentials');
jest.mock('@queries/app/global');
jest.mock('@queries/app/servers');
jest.mock('@queries/servers/preference');
jest.mock('@queries/servers/team');
jest.mock('@store/ephemeral_store');

describe('determineInitialExpoRoute', () => {
    it('should mark a launch notification that has no identifier by its ack id', async () => {
        jest.spyOn(Linking, 'getInitialURL').mockResolvedValue(null);
        jest.mocked(getActiveServer).mockResolvedValue(undefined);
        jest.mocked(getAllServers).mockResolvedValue([]);
        jest.mocked(getServerCredentials).mockResolvedValue(null);
        Notifications.getInitialNotification = jest.fn().mockResolvedValue({
            identifier: undefined,
            payload: {type: PushNotification.NOTIFICATION_TYPE.MESSAGE, ack_id: 'ack1', channel_id: 'channel1', server_id: 'server1'},
        });

        await determineInitialExpoRoute();

        expect(EphemeralStore.setProcessingNotification).toHaveBeenCalledWith('ack1');
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
