// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Client4} from '@client/rest';
import DatabaseManager from '@database/manager';
import analytics from '@init/analytics';
import {setServerCredentials} from '@init/credentials';
import {getDeviceToken} from '@app/queries/app/global';
import {getCommonSystemValues, getCurrentUserId} from '@app/queries/servers/system';
import {createSessions} from '@requests/local/systems';
import {autoUpdateTimezone, getDeviceTimezone, isTimezoneEnabled} from '@requests/local/timezone';
import {logError} from '@requests/remote/error';
import {loadRolesIfNeeded} from '@requests/remote/role';
import {getDataRetentionPolicy} from '@requests/remote/systems';
import {Client4Error} from '@typings/api/client4';
import {Config} from '@typings/database/models/servers/config';
import {
    LoadMeArgs,
    LoginArgs,
    RawMyTeam,
    RawPreference,
    RawRole,
    RawTeam,
    RawTeamMembership,
    RawUser,
} from '@typings/database/database';
import {License} from '@typings/database/models/servers/license';
import Role from '@typings/database/models/servers/role';
import User from '@typings/database/models/servers/user';
import {getCSRFFromCookie} from '@utils/security';

const HTTP_UNAUTHORIZED = 401;

// TODO: Requests should know the server url
// To select the right DB & Client

export const logout = async (serverUrl: string, skipServerLogout = false) => {
    return async () => {
        if (!skipServerLogout) {
            try {
                await Client4.logout();
            } catch {
                // Do nothing
            }
        }

        //fixme: uncomment below EventEmitter.emit
        // EventEmitter.emit(NavigationTypes.NAVIGATION_RESET);

        DatabaseManager.deleteServerDatabase(serverUrl);

        return {data: true};
    };
};

export const forceLogoutIfNecessary = async (serverUrl: string, err: Client4Error) => {
    const database = DatabaseManager.serverDatabases[serverUrl].database;
    if (!database) {
        return {error: `${serverUrl} database not found`};
    }

    const currentUserId = await getCurrentUserId(database);

    if ('status_code' in err && err.status_code === HTTP_UNAUTHORIZED && err?.url?.indexOf('/login') === -1 && currentUserId) {
        await logout(serverUrl);
    }

    return {error: null};
};

export const login = async (serverUrl: string, {ldapOnly = false, loginId, mfaToken, password}: LoginArgs) => {
    let deviceToken;
    let user;

    const appDatabase = DatabaseManager.appDatabase?.database;
    if (!appDatabase) {
        return {error: 'App database not found.'};
    }

    try {
        deviceToken = await getDeviceToken(appDatabase);
        user = ((await Client4.login(
            loginId,
            password,
            mfaToken,
            deviceToken,
            ldapOnly,
        )) as unknown) as RawUser;

        await DatabaseManager.createServerDatabase({
            config: {
                dbName: serverUrl,
                serverUrl,
            },
        });
        await DatabaseManager.setActiveServerDatabase(serverUrl);
        await getCSRFFromCookie(serverUrl);
    } catch (e) {
        return {error: e};
    }

    const result = await loadMe(serverUrl, {user, deviceToken});

    if (!result?.error) {
        await completeLogin(serverUrl, user);
    }

    return {result};
};

export const loadMe = async (serverUrl: string, {deviceToken, user}: LoadMeArgs) => {
    let currentUser = user;

    const database = DatabaseManager.serverDatabases[serverUrl].database;
    if (!database) {
        return {error: `${serverUrl} database not found`};
    }

    try {
        if (deviceToken) {
            await Client4.attachDevice(deviceToken);
        }

        if (!currentUser) {
            currentUser = ((await Client4.getMe()) as unknown) as RawUser;
        }
    } catch (e) {
        await forceLogoutIfNecessary(serverUrl, e);
        return {
            error: e,
            currentUser: undefined,
        };
    }

    try {
        const analyticsClient = analytics.create(Client4.getUrl());
        analyticsClient.setUserId(currentUser.id);
        analyticsClient.setUserRoles(currentUser.roles);

        //todo: Ask for a unified endpoint that will serve all those values in one go.( while ensuring backward-compatibility through fallbacks to previous code-path)
        const teamsRequest = Client4.getMyTeams();

        // Goes into myTeam table
        const teamMembersRequest = Client4.getMyTeamMembers();
        const teamUnreadRequest = Client4.getMyTeamUnreads();

        const preferencesRequest = Client4.getMyPreferences();
        const configRequest = Client4.getClientConfigOld();
        const licenseRequest = Client4.getClientLicenseOld();

        const [
            teams,
            teamMembers,
            teamUnreads,
            preferences,
            config,
            license,
        ] = await Promise.all([
            teamsRequest,
            teamMembersRequest,
            teamUnreadRequest,
            preferencesRequest,
            configRequest,
            licenseRequest,
        ]);

        const operator = DatabaseManager.serverDatabases[serverUrl].operator;
        const teamRecords = operator.handleTeam({prepareRecordsOnly: true, teams: teams as RawTeam[]});
        const teamMembershipRecords = operator.handleTeamMemberships({prepareRecordsOnly: true, teamMemberships: (teamMembers as unknown) as RawTeamMembership[]});

        const myTeams = teamUnreads.map((unread) => {
            const matchingTeam = teamMembers.find((team) => team.team_id === unread.team_id);
            return {team_id: unread.team_id, roles: matchingTeam?.roles ?? '', is_unread: unread.msg_count > 0, mentions_count: unread.mention_count};
        });

        const myTeamRecords = operator.handleMyTeam({
            prepareRecordsOnly: true,
            myTeams: (myTeams as unknown) as RawMyTeam[],
        });

        const systemRecords = operator.handleSystem({
            systems: [
                {
                    name: 'config',
                    value: JSON.stringify(config),
                },
                {
                    name: 'license',
                    value: JSON.stringify(license),
                },
                {
                    name: 'currentUserId',
                    value: currentUser.id,
                },
                {
                    name: 'url',
                    value: Client4.getUrl(),
                },
            ],
            prepareRecordsOnly: true,
        });

        const userRecords = operator.handleUsers({
            users: [currentUser],
            prepareRecordsOnly: true,
        });

        const preferenceRecords = operator.handlePreferences({
            prepareRecordsOnly: true,
            preferences: (preferences as unknown) as RawPreference[],
        });

        let roles: string[] = [];
        for (const role of currentUser.roles.split(' ')) {
            roles = roles.concat(role);
        }

        for (const teamMember of teamMembers) {
            roles = roles.concat(teamMember.roles.split(' '));
        }

        const rolesToLoad = new Set<string>(roles);

        let rolesRecords: Role[] = [];
        if (rolesToLoad.size > 0) {
            const rolesByName = ((await Client4.getRolesByNames(Array.from(rolesToLoad))) as unknown) as RawRole[];

            if (rolesByName?.length) {
                rolesRecords = await operator.handleRole({prepareRecordsOnly: true, roles: rolesByName}) as Role[];
            }
        }

        const models = await Promise.all([teamRecords, teamMembershipRecords, myTeamRecords, systemRecords, preferenceRecords, rolesRecords, userRecords]);

        const flattenedModels = models.flat();
        if (flattenedModels?.length > 0) {
            await operator.batchRecords(flattenedModels);
        }
    } catch (e) {
        return {error: e, currentUser: undefined};
    }

    return {currentUser, error: undefined};
};

export const completeLogin = async (serverUrl: string, user: RawUser) => {
    const database = DatabaseManager.serverDatabases[serverUrl].database;
    if (!database) {
        return {error: `${serverUrl} database not found`};
    }

    const {config, license}: { config: Partial<Config>; license: Partial<License>; } = await getCommonSystemValues(database);

    if (!Object.keys(config)?.length || !Object.keys(license)?.length) {
        return null;
    }

    const token = Client4.getToken();

    setServerCredentials(serverUrl, user.id, token);

    // Set timezone
    if (isTimezoneEnabled(config)) {
        const timezone = getDeviceTimezone();
        await autoUpdateTimezone(serverUrl, {deviceTimezone: timezone, userId: user.id});
    }

    let dataRetentionPolicy: any;
    const operator = DatabaseManager.serverDatabases[Client4.getUrl()].operator;

    // Data retention
    if (config?.DataRetentionEnableMessageDeletion === 'true' && license?.IsLicensed === 'true' && license?.DataRetention === 'true') {
        dataRetentionPolicy = await getDataRetentionPolicy(serverUrl);
        await operator.handleSystem({systems: [{name: 'dataRetentionPolicy', value: dataRetentionPolicy}], prepareRecordsOnly: false});
    }

    return null;
};

export const updateMe = async (serverUrl: string, user: User) => {
    const database = DatabaseManager.serverDatabases[serverUrl].database;
    const operator = DatabaseManager.serverDatabases[serverUrl].operator;
    if (!database) {
        return {error: `${serverUrl} database not found`};
    }

    let data;
    try {
        data = ((await Client4.patchMe(user._raw)) as unknown) as RawUser;
    } catch (e) {
        logError(e);
        return {error: e};
    }

    const systemRecords = operator.handleSystem({
        systems: [
            {name: 'currentUserId', value: data.id},
            {name: 'locale', value: data?.locale},
        ],
        prepareRecordsOnly: true,
    });

    const userRecord = operator.handleUsers({prepareRecordsOnly: true, users: [data]});

    //todo: ?? Do we need to write to TOS table ? See app/mm-redux/reducers/entities/users.ts/profiles/line 152 const
    // tosRecords = await DataOperator.handleIsolatedEntity({ tableName: TERMS_OF_SERVICE, values: [{}], });
    const models = await Promise.all([
        systemRecords,
        userRecord,

    // ...tosRecords,
    ]);

    if (models?.length) {
        await operator.batchRecords(models.flat());
    }

    const updatedRoles: string[] = data.roles.split(' ');
    if (updatedRoles.length) {
        await loadRolesIfNeeded(serverUrl, updatedRoles);
    }

    return {data};
};
export const getSessions = async (serverUrl: string, currentUserId: string) => {
    try {
        const sessions = await Client4.getSessions(currentUserId);
        await createSessions(serverUrl, sessions);
    } catch (e) {
        logError(e);
        await forceLogoutIfNecessary(serverUrl, e);
    }
};

type LoadedUser = {
    currentUser?: RawUser,
    error?: Client4Error
}

export const ssoLogin = async (serverUrl: string) => {
    let deviceToken;

    const database = DatabaseManager.appDatabase?.database;

    if (!database) {
        return {error: 'App database not found'};
    }

    // Setting up active database for this SSO login flow
    try {
        await DatabaseManager.createServerDatabase({
            config: {
                dbName: serverUrl,
                serverUrl,
            },
        });
        await DatabaseManager.setActiveServerDatabase(serverUrl);
        deviceToken = await getDeviceToken(database);
    } catch (e) {
        return {error: e};
    }

    let result;

    try {
        result = await loadMe(serverUrl, {deviceToken}) as unknown as LoadedUser;
        if (!result?.error && result?.currentUser) {
            await completeLogin(serverUrl, result.currentUser);
        }
    } catch (e) {
        return {error: e};
    }

    return result;
};

export const sendPasswordResetEmail = async (email: string) => {
    let data;
    try {
        data = await Client4.sendPasswordResetEmail(email);
    } catch (e) {
        return {
            error: e,
        };
    }
    return {
        data,
        error: undefined,
    };
};
