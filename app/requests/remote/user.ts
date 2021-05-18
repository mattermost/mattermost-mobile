// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Q} from '@nozbe/watermelondb';

import {Client4} from '@client/rest';
import {MM_TABLES} from '@constants/database';
import DatabaseConnectionException from '@database/exceptions/database_connection_exception';
import DatabaseManager from '@database/manager';
import analytics from '@init/analytics';
import {setAppCredentials} from '@init/credentials';
import {createSessions} from '@requests/local/systems';
import {logError} from '@requests/remote/error';
import {Client4Error} from '@typings/api/client4';
import {RawUser} from '@typings/database/database';
import Global from '@typings/database/global';
import System from '@typings/database/system';
import {getCSRFFromCookie} from '@utils/security';

const HTTP_UNAUTHORIZED = 401;

//fixme: this file needs to be finalized
//todo: retrieve deviceToken from default database - Global entity

export const logout = async (skipServerLogout = false) => {
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

        return {data: true};
    };
};

export const forceLogoutIfNecessary = async (err: Client4Error) => {
    const database = DatabaseManager.getActiveServerDatabase();

    if (!database) {
        throw new DatabaseConnectionException(
            'DatabaseManager.getActiveServerDatabase returned undefined',
        );
    }

    const currentUserId = await database.collections.
        get(MM_TABLES.SERVER.SYSTEM).
        query(Q.where('name', 'currentUserId')).
        fetch();

    if (
        'status_code' in err &&
    err.status_code === HTTP_UNAUTHORIZED &&
    err?.url?.indexOf('/login') === -1 &&
    currentUserId
    ) {
        logout(false);
    }
};

export const createAndSetActiveDatabase = async (config: any) => {
    const serverUrl = Client4.getUrl();
    const displayName = config?.SiteName;
    try {
        await DatabaseManager.setActiveServerDatabase({displayName, serverUrl});
    } catch (e) {
        throw new DatabaseConnectionException(`createAndSetActiveDatabase: Unable to create and set serverUrl ${serverUrl} as current active database with name ${displayName}`);
    }
};

type LoginArgs = { config: any; ldapOnly?: boolean; license: any; loginId: string; mfaToken?: string; password: string; serverUrl: string; };
export const login = async ({
    config,
    ldapOnly = false,
    loginId,
    mfaToken,
    password,
    serverUrl,
}: LoginArgs) => {
    const database = await DatabaseManager.getDefaultDatabase();

    if (!database) {
        throw new DatabaseConnectionException(
            'DatabaseManager.getDefaultDatabase returned undefined in @requests/remote/user/login',
        );
    }

    let deviceToken;
    let user;

    try {
        const tokens = (await database.collections.
            get(MM_TABLES.DEFAULT.GLOBAL).
            query(Q.where('name', 'deviceToken')).
            fetch()) as Global[];

        deviceToken = tokens?.[0]?.value ?? '';

        user = await Client4.login(
            loginId,
            password,
            mfaToken,
            deviceToken,
            ldapOnly,
        ) as unknown as RawUser;

        await createAndSetActiveDatabase(config);

        //fixme: Question : do you need to pass an auth token when retrieving the config+license the second time ?
        await getCSRFFromCookie(Client4.getUrl());
    } catch (error) {
        return {error};
    }

    //todo : loadMe
    const result = await loadMe({user, deviceToken, serverUrl});

    if (!result.error) {
        //todo: completeLogin
        // completeLogin(user, deviceToken);
    }

    return result;
};

type LoadMeArgs = { user: RawUser; deviceToken?: string; serverUrl: string };
const loadMe = async ({
    deviceToken,
    serverUrl,
    user,
}: LoadMeArgs) => {
    const data: any = {user};

    const database = await DatabaseManager.getActiveServerDatabase();

    if (!database) {
        throw new DatabaseConnectionException(
            'DatabaseManager.getActiveServerDatabase returned undefined in @requests/remote/user/loadMe',
        );
    }

    try {
        if (deviceToken) {
            //todo: confirm with Elias if we can just pass the deviceToken wrt to v1 code
            await Client4.attachDevice(deviceToken);
        }

        if (!user) {
            data.user = await Client4.getMe(); //todo:  why do we do this here ?
        }
    } catch (error) {
        forceLogoutIfNecessary(error);
        return {error};
    }

    try {
        const analyticsClient = analytics.create(serverUrl);
        analyticsClient.setUserId(data.user.id);
        analyticsClient.setUserRoles(data.user.roles);

        //todo: maybe you need to defer some of those requests for when we load the channels ??
        // Execute all other requests in parallel
        const teamsRequest = Client4.getMyTeams();
        const teamMembersRequest = Client4.getMyTeamMembers();
        const teamUnreadRequest = Client4.getMyTeamUnreads();
        const preferencesRequest = Client4.getMyPreferences();
        const configRequest = Client4.getClientConfigOld();
        const actions = [];

        const [
            teams,
            teamMembers,
            teamUnreads,
            preferences,
            config,
        ] = await Promise.all([
            teamsRequest,
            teamMembersRequest,
            teamUnreadRequest,
            preferencesRequest,
            configRequest,
        ]);

        data.teams = teams;
        data.teamMembers = teamMembers;
        data.teamUnreads = teamUnreads;
        data.preferences = preferences;
        data.config = config;
        data.url = Client4.getUrl();

        // Saves currentUserId to server database under system entity
        //todo: batch operations
        await database.action(async () => {
            const systemCollection = database.collections.get(MM_TABLES.SERVER.SYSTEM);
            const currentUserIdRecord = await systemCollection.create((system: System) => {
                system.name = 'currentUserId';
                system.value = user.id;
            });
        });

        //todo: writes to all table
        // actions.push({
        //     type: UserTypes.LOGIN,
        //     data,
        // });

        const rolesToLoad = new Set<string>();
        for (const role of data.user.roles.split(' ')) {
            rolesToLoad.add(role);
        }

        for (const teamMember of teamMembers) {
            for (const role of teamMember.roles.split(' ')) {
                rolesToLoad.add(role);
            }
        }
        if (rolesToLoad.size > 0) {
            data.roles = await Client4.getRolesByNames(Array.from(rolesToLoad));
            if (data.roles.length) {
                //todo: update roles
                // actions.push({
                //     type: RoleTypes.RECEIVED_ROLES,
                //     data: data.roles,
                // });
            }
        }

    // if (!skipDispatch) {
    //     dispatch(batchActions(actions, 'BATCH_LOAD_ME'));
    // }
    } catch (error) {
    // console.log('login error', error.stack); // eslint-disable-line no-console
        return {error};
    }

    return {data};
};

export const completeLogin = async (user, deviceToken) => {
    // const state = getState();
    // const config = getConfig(state);
    // const license = getLicense(state);

    //todo:
    const token = Client4.getToken();
    const url = Client4.getUrl();

    setAppCredentials(deviceToken, user.id, token, url);

    // Set timezone
    // const enableTimezone = isTimezoneEnabled(state);
    // if (enableTimezone) {
    //     const timezone = getDeviceTimezone();
    //     // dispatch(autoUpdateTimezone(timezone));
    // }

    // Data retention
    // if (config?.DataRetentionEnableMessageDeletion && config?.DataRetentionEnableMessageDeletion === 'true' && license?.IsLicensed === 'true' && license?.DataRetention === 'true') {
    //     await getDataRetentionPolicy();
    // } else {
    //     // dispatch({type: GeneralTypes.RECEIVED_DATA_RETENTION_POLICY, data: {}});
    // }
};

export const getSessions = async (currentUserId: string) => {
    try {
        const sessions = await Client4.getSessions(currentUserId);
        await createSessions(sessions);
    } catch (e) {
        logError(e);
        forceLogoutIfNecessary(e);
    }
};
