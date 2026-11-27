// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Linking} from 'react-native';

import {appEntry} from '@actions/remote/entry';
import {DeepLink, Launch} from '@constants';
import DatabaseManager from '@database/manager';
import {getActiveServerUrl, getServerCredentials} from '@init/credentials';
import {getLastViewedTeamIdAndServer} from '@queries/app/global';
import {getActiveServer, getServer} from '@queries/app/servers';
import {getThemeForCurrentTeam} from '@queries/servers/preference';
import {queryMyTeams} from '@queries/servers/team';
import {handleDeepLink} from '@utils/deep_link';

import {determineInitialExpoRoute, determineRouteFromLaunchProps} from './launch';

import type ServersModel from '@typings/database/models/app/servers';
import type {LaunchProps} from '@typings/launch';

jest.mock('@init/credentials');
jest.mock('@queries/app/global');
jest.mock('@queries/app/servers');
jest.mock('@queries/servers/preference');
jest.mock('@queries/servers/team');
jest.mock('@store/ephemeral_store');
jest.mock('@actions/remote/entry');
jest.mock('@utils/deep_link', () => ({
    ...jest.requireActual('@utils/deep_link'),
    handleDeepLink: jest.fn(),
}));

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

describe('determineInitialExpoRoute with a mobile QR login deep link', () => {
    const token = 'a'.repeat(64);
    const qrUrl = `mattermost://qr.example.com/login/mobile_qr?t=${token}`;
    let searchUrlSpy: jest.SpyInstance;

    beforeEach(() => {
        jest.clearAllMocks();
        jest.mocked(Linking.getInitialURL).mockResolvedValue(qrUrl);
        jest.mocked(getActiveServer).mockResolvedValue(undefined);
        jest.mocked(getServer).mockResolvedValue(undefined);
        jest.mocked(getLastViewedTeamIdAndServer).mockResolvedValue(undefined);
        jest.mocked(getThemeForCurrentTeam).mockResolvedValue(undefined);
        searchUrlSpy = jest.spyOn(DatabaseManager, 'searchUrl').mockReturnValue(undefined);
        DatabaseManager.getServerDatabaseAndOperator = jest.fn().mockReturnValue({database: {}, operator: {}});
        jest.mocked(queryMyTeams).mockReturnValue({fetch: jest.fn().mockResolvedValue([{id: 'team1'}])} as unknown as ReturnType<typeof queryMyTeams>);
    });

    it('should go to the app of the new server without handling the link again after a successful login', async () => {
        jest.mocked(handleDeepLink).mockResolvedValue({error: false});
        jest.mocked(getActiveServerUrl).mockResolvedValue('https://qr.example.com');
        jest.mocked(getServerCredentials).mockResolvedValue({token: 'session-token'} as ServerCredential);

        const result = await determineInitialExpoRoute();

        expect(handleDeepLink).toHaveBeenCalledWith(expect.objectContaining({type: DeepLink.MobileQrLogin, data: {serverUrl: 'qr.example.com', token}}));
        expect(result.route).toBe('/(authenticated)/(home)');
        expect(result.params).toEqual(expect.objectContaining({launchType: Launch.Normal, serverUrl: 'https://qr.example.com', coldStart: false}));
        expect(result.params.extra).toBeUndefined();
        expect(result.params.launchError).toBeFalsy();
        expect(appEntry).not.toHaveBeenCalled();
    });

    it('should show the server screen without an invalid link error when the code was rejected', async () => {
        jest.mocked(handleDeepLink).mockResolvedValue({error: true, alertShown: true});
        jest.mocked(getActiveServerUrl).mockResolvedValue(undefined);
        jest.mocked(getServerCredentials).mockResolvedValue(null);

        const result = await determineInitialExpoRoute();

        expect(result.route).toBe('/(unauthenticated)/server');
        expect(result.params.launchType).toBe(Launch.Normal);
        expect(result.params.extra).toBeUndefined();
        expect(result.params.launchError).toBeFalsy();
    });

    it('should keep the existing session and the normal launch when already signed in to the server', async () => {
        searchUrlSpy.mockReturnValue('https://qr.example.com');
        jest.mocked(handleDeepLink).mockResolvedValue({error: false});
        jest.mocked(getActiveServerUrl).mockResolvedValue('https://other.example.com');
        jest.mocked(getServerCredentials).mockResolvedValue({token: 'token'} as ServerCredential);

        const result = await determineInitialExpoRoute();

        expect(result.params).toEqual(expect.objectContaining({launchType: Launch.Normal, serverUrl: 'https://other.example.com'}));
        expect(result.params.extra).toBeUndefined();
        expect(appEntry).toHaveBeenCalledWith('https://other.example.com');
    });
});
