// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {storeConfig} from '@actions/local/systems';
import {Preferences} from '@constants';
import DatabaseManager from '@database/manager';
import {selectDefaultTeam} from '@helpers/api/team';
import NetworkManager from '@managers/network_manager';
import {prepareCategoriesAndCategoriesChannels} from '@queries/servers/categories';
import {prepareMyChannelsForTeam} from '@queries/servers/channel';
import {prepareMyPreferences, queryDisplayNamePreferences} from '@queries/servers/preference';
import {getConfig, getLicense, prepareCommonSystemValues} from '@queries/servers/system';
import {prepareMyTeams} from '@queries/servers/team';
import {getCurrentUser} from '@queries/servers/user';
import {isDMorGM, selectDefaultChannelForTeam} from '@utils/channel';

import {fetchMyChannelsForTeam, fetchMissingDirectChannelsInfo} from './channel';
import {fetchPostsForChannel} from './post';
import {fetchMyPreferences} from './preference';
import {retryInitialTeamAndChannel, retryInitialChannel} from './retry';
import {fetchRolesIfNeeded} from './role';
import {fetchConfigAndLicense} from './systems';
import {fetchMyTeams} from './team';

jest.mock('@database/manager');
jest.mock('@managers/network_manager');
jest.mock('./channel');
jest.mock('./post');
jest.mock('./preference');
jest.mock('./role');
jest.mock('./systems');
jest.mock('./team');
jest.mock('@actions/local/systems');
jest.mock('@queries/servers/user');
jest.mock('@queries/servers/team');
jest.mock('@queries/servers/channel');
jest.mock('@queries/servers/categories');
jest.mock('@queries/servers/system');
jest.mock('@queries/servers/preference');
jest.mock('@helpers/api/team');
jest.mock('@utils/channel');

const serverUrl = 'http://example.com';
const mockDatabase = {};
const mockOperator = {database: mockDatabase, batchRecords: jest.fn()};
const mockRoles = {roles: ['role1', 'role2']};
const mockUser = {id: 'user_id', roles: 'role1 role2', locale: 'en'};
const mockChannels = {channels: [{id: 'channel_id'}], memberships: [{channel_id: 'channel_id', roles: 'role1 role2'}]};

describe('retryInitialTeamAndChannel', () => {
    const mockConfigAndLicense = {config: {}, license: {}};
    const mockPreferences = {preferences: [{category: Preferences.CATEGORIES.TEAMS_ORDER, name: '', value: ''}]};
    const mockTeams = {teams: [{id: 'team_id'}], memberships: [{team_id: 'team_id', roles: 'role1 role2'}]};

    beforeEach(() => {
        jest.clearAllMocks();
        (DatabaseManager.serverDatabases as any) = {[serverUrl]: {operator: mockOperator}};
        (NetworkManager.getClient as jest.Mock).mockReturnValue({});
        (getCurrentUser as jest.Mock).mockResolvedValue(mockUser);
        (fetchConfigAndLicense as jest.Mock).mockResolvedValue(mockConfigAndLicense);
        (fetchMyPreferences as jest.Mock).mockResolvedValue(mockPreferences);
        (fetchMyTeams as jest.Mock).mockResolvedValue(mockTeams);
        (fetchMyChannelsForTeam as jest.Mock).mockResolvedValue(mockChannels);
        (selectDefaultTeam as jest.Mock).mockReturnValue(mockTeams.teams[0]);
        (prepareMyPreferences as jest.Mock).mockResolvedValue([]);
        (storeConfig as jest.Mock).mockResolvedValue([]);
        (prepareMyTeams as jest.Mock).mockReturnValue([]);
        (prepareMyChannelsForTeam as jest.Mock).mockResolvedValue([]);
        (prepareCategoriesAndCategoriesChannels as jest.Mock).mockResolvedValue([]);
        (prepareCommonSystemValues as jest.Mock).mockResolvedValue([]);
        (selectDefaultChannelForTeam as jest.Mock).mockReturnValue(mockChannels.channels[0]);
        (fetchRolesIfNeeded as jest.Mock).mockResolvedValue(mockRoles);
    });

    it('should return error if database is not found', async () => {
        (DatabaseManager.serverDatabases as any) = {};
        const result = await retryInitialTeamAndChannel(serverUrl);
        expect(result).toEqual({error: `${serverUrl} database not found`});
    });

    it('should return error if network client is not available', async () => {
        (NetworkManager.getClient as jest.Mock).mockImplementation(() => {
            throw new Error('Network error');
        });
        const result = await retryInitialTeamAndChannel(serverUrl);
        expect(result).toEqual({error: new Error('Network error')});
    });

    it('should return error if user is not found', async () => {
        (getCurrentUser as jest.Mock).mockResolvedValue(null);
        const result = await retryInitialTeamAndChannel(serverUrl);
        expect(result).toEqual({error: true});
    });

    it('should fetch config, preferences, and teams in parallel', async () => {
        const result = await retryInitialTeamAndChannel(serverUrl);
        expect(fetchConfigAndLicense).toHaveBeenCalledWith(serverUrl, true);
        expect(fetchMyPreferences).toHaveBeenCalledWith(serverUrl, true);
        expect(fetchMyTeams).toHaveBeenCalledWith(serverUrl, true);
        expect(result).toEqual({error: false});
    });

    it('should select initial team and fetch channels for the team', async () => {
        const result = await retryInitialTeamAndChannel(serverUrl);
        expect(selectDefaultTeam).toHaveBeenCalledWith(mockTeams.teams, mockUser.locale, '', undefined);
        expect(fetchMyChannelsForTeam).toHaveBeenCalledWith(serverUrl, 'team_id', false, 0, true);
        expect(result).toEqual({error: false});
    });

    it('should return error if fetching config, preferences, or teams fails', async () => {
        (fetchConfigAndLicense as jest.Mock).mockResolvedValue({error: 'error'});
        const result = await retryInitialTeamAndChannel(serverUrl);
        expect(result).toEqual({error: true});
    });

    it('should return error if fetching channels fails', async () => {
        (fetchMyChannelsForTeam as jest.Mock).mockResolvedValue({error: 'error'});
        const result = await retryInitialTeamAndChannel(serverUrl);
        expect(result).toEqual({error: true});
    });

    it('should return initial team and channel if successful', async () => {
        const result = await retryInitialTeamAndChannel(serverUrl);
        expect(result).toEqual({error: false});
    });

    it('should return error on failed user get', async () => {
        (getCurrentUser as jest.Mock).mockRejectedValue({error: 'error'});
        const result = await retryInitialTeamAndChannel(serverUrl);
        expect(result).toEqual({error: true});
    });

    it('should return error when no default team is selected', async () => {
        (selectDefaultTeam as jest.Mock).mockReturnValue(undefined);
        const result = await retryInitialTeamAndChannel(serverUrl);
        expect(fetchMyChannelsForTeam).not.toHaveBeenCalled();
        expect(result).toEqual({error: true});
    });

    it('should log direct channels when DM channels exist', async () => {
        (isDMorGM as jest.Mock).mockReturnValue(true);
        await retryInitialTeamAndChannel(serverUrl);
        expect(fetchMissingDirectChannelsInfo).toHaveBeenCalledWith(
            serverUrl,
            mockChannels.channels,
            mockUser.locale,
            expect.any(String),
            mockUser.id,
        );
    });
});

describe('retryInitialChannel', () => {
    const teamId = 'team_id';
    const mockPreferences = [{category: Preferences.NAME_NAME_FORMAT, name: 'name', userId: 'user_id', value: 'value'}];
    const mockLicense = {};
    const mockConfig = {};
    const mockInitialChannel = {id: 'channel_id'};

    beforeEach(() => {
        jest.clearAllMocks();
        (DatabaseManager.serverDatabases as any) = {[serverUrl]: {operator: mockOperator}};
        (NetworkManager.getClient as jest.Mock).mockReturnValue({});
        (getCurrentUser as jest.Mock).mockResolvedValue(mockUser);
        (queryDisplayNamePreferences as jest.Mock).mockReturnValue({fetch: jest.fn().mockResolvedValue(mockPreferences)});
        (getLicense as jest.Mock).mockResolvedValue(mockLicense);
        (getConfig as jest.Mock).mockResolvedValue(mockConfig);
        (fetchMyChannelsForTeam as jest.Mock).mockResolvedValue(mockChannels);
        (fetchRolesIfNeeded as jest.Mock).mockResolvedValue(mockRoles);
        (selectDefaultChannelForTeam as jest.Mock).mockReturnValue(mockInitialChannel);
        (prepareMyChannelsForTeam as jest.Mock).mockResolvedValue([]);
        (prepareCategoriesAndCategoriesChannels as jest.Mock).mockResolvedValue([]);
        (prepareCommonSystemValues as jest.Mock).mockResolvedValue([]);
    });

    it('should return error if database is not found', async () => {
        (DatabaseManager.serverDatabases as any) = {};
        const result = await retryInitialChannel(serverUrl, teamId);
        expect(result).toEqual({error: `${serverUrl} database not found`});
    });

    it('should return error if network client is not available', async () => {
        (NetworkManager.getClient as jest.Mock).mockImplementation(() => {
            throw new Error('Network error');
        });
        const result = await retryInitialChannel(serverUrl, teamId);
        expect(result).toEqual({error: new Error('Network error')});
    });

    it('should return error if user is not found', async () => {
        (getCurrentUser as jest.Mock).mockResolvedValue(null);
        const result = await retryInitialChannel(serverUrl, teamId);
        expect(result).toEqual({error: true});
    });

    it('should fetch channels and memberships for the team', async () => {
        const result = await retryInitialChannel(serverUrl, teamId);
        expect(result).toEqual({error: false});
        expect(fetchMyChannelsForTeam).toHaveBeenCalledWith(serverUrl, teamId, false, 0, true);
        expect(fetchRolesIfNeeded).toHaveBeenCalledWith(serverUrl, ['role1', 'role2']);
        expect(selectDefaultChannelForTeam).toHaveBeenCalledWith(mockChannels.channels, mockChannels.memberships, teamId, mockRoles.roles, mockUser.locale);
    });

    it('should return error if initial channel is not found', async () => {
        (selectDefaultChannelForTeam as jest.Mock).mockReturnValue(undefined);
        const result = await retryInitialChannel(serverUrl, teamId);
        expect(result).toEqual({error: true});
    });

    it('should prepare models and batch records', async () => {
        await retryInitialChannel(serverUrl, teamId);
        expect(prepareMyChannelsForTeam).toHaveBeenCalledWith(mockOperator, teamId, mockChannels.channels, mockChannels.memberships);
        expect(prepareCategoriesAndCategoriesChannels).toHaveBeenCalledWith(mockOperator, undefined, true);
        expect(prepareCommonSystemValues).toHaveBeenCalledWith(mockOperator, {currentChannelId: mockInitialChannel.id});
        expect(mockOperator.batchRecords).toHaveBeenCalled();
    });

    it('should fetch missing direct channels info if needed', async () => {
        (isDMorGM as jest.Mock).mockReturnValue(true);
        await retryInitialChannel(serverUrl, teamId);
        expect(fetchMissingDirectChannelsInfo).toHaveBeenCalledWith(
            serverUrl,
            mockChannels.channels,
            mockUser.locale,
            expect.any(String),
            mockUser.id,
        );
    });

    it('should not fetch direct channels info when no DM channels exist', async () => {
        (isDMorGM as jest.Mock).mockReturnValue(false);
        await retryInitialChannel(serverUrl, teamId);
        expect(fetchMissingDirectChannelsInfo).not.toHaveBeenCalled();
    });

    it('should fetch posts for the initial channel', async () => {
        await retryInitialChannel(serverUrl, teamId);
        expect(fetchPostsForChannel).toHaveBeenCalledWith(serverUrl, mockInitialChannel.id);
    });

    it('should return error if an exception occurs', async () => {
        (fetchMyChannelsForTeam as jest.Mock).mockImplementation(() => {
            throw new Error('Network error');
        });
        const result = await retryInitialChannel(serverUrl, teamId);
        expect(result).toEqual({error: true});
    });

    it('should return success if no errors occur', async () => {
        const result = await retryInitialChannel(serverUrl, teamId);
        expect(result).toEqual({error: false});
    });
});
