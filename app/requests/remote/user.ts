// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import compact from 'lodash.compact';
import {Q} from '@nozbe/watermelondb';

import DatabaseConnectionException from '@database/exceptions/database_connection_exception';
import DatabaseManager from '@database/manager';
import Global from '@typings/database/global';
import Role from '@typings/database/role';
import System from '@typings/database/system';
import analytics from '@init/analytics';
import {Client4Error} from '@typings/api/client4';
import {Client4} from '@client/rest';
import {Config} from '@typings/database/config';
import {DataOperator} from '@database/operator';
import {IsolatedEntities} from '@typings/database/enums';
import {MM_TABLES} from '@constants/database';
import {RawMyTeam, RawPreference, RawRole, RawTeam, RawTeamMembership, RawUser} from '@typings/database/database';
import {autoUpdateTimezone, getDeviceTimezone, isTimezoneEnabled} from '@requests/local/timezone';
import {createSessions} from '@requests/local/systems';
import {getCSRFFromCookie} from '@utils/security';
import {logError} from '@requests/remote/error';
import {setAppCredentials} from '@init/credentials';

const HTTP_UNAUTHORIZED = 401;
const {SERVER: {SYSTEM}, DEFAULT: {GLOBAL}} = MM_TABLES;

//fixme: Question : do you need to pass an auth token when retrieving the config+license the second time ?
//todo: this file needs to be finalized

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
            'DatabaseManager.getActiveServerDatabase returned undefined in @requests/remote/user/forceLogoutIfNecessary',
        );
    }

    const currentUserId = await database.collections.get(SYSTEM).query(Q.where('name', 'currentUserId')).fetch();

    if ('status_code' in err && err.status_code === HTTP_UNAUTHORIZED && err?.url?.indexOf('/login') === -1 && currentUserId) {
        logout(false);
    }
};

export const createAndSetActiveDatabase = async (config: Partial<Config>) => {
    const serverUrl = Client4.getUrl();

    //todo: confirm with team that this SiteName can't be null - extra precaution
    const displayName = config.SiteName;
    try {
        await DatabaseManager.setActiveServerDatabase({
            displayName: displayName!,
            serverUrl,
        });
    } catch (e) {
        throw new DatabaseConnectionException(
            `createAndSetActiveDatabase: Unable to create and set serverUrl ${serverUrl} as current active database with name ${displayName}`,
        );
    }
};

type LoginArgs = {
  config: any;
  ldapOnly?: boolean;
  license: any;
  loginId: string;
  mfaToken?: string;
  password: string;
  serverUrl: string;
};
export const login = async ({config, ldapOnly = false, loginId, mfaToken, password, serverUrl}: LoginArgs) => {
    const database = await DatabaseManager.getDefaultDatabase();

    if (!database) {
        throw new DatabaseConnectionException(
            'DatabaseManager.getDefaultDatabase returned undefined in @requests/remote/user/login',
        );
    }

    let deviceToken;
    let user;

    try {
        const tokens = (await database.collections.get(GLOBAL).query(Q.where('name', 'deviceToken')).fetch()) as Global[];
        deviceToken = tokens?.[0]?.value ?? '';
        user = ((await Client4.login(loginId, password, mfaToken, deviceToken, ldapOnly)) as unknown) as RawUser;

        await createAndSetActiveDatabase(config);
        await getCSRFFromCookie(Client4.getUrl());
    } catch (error) {
        return {error};
    }

    const result = await loadMe({user, deviceToken, serverUrl});

    if (!result.error) {
    //todo: completeLogin
        completeLogin(user, deviceToken);
    }

    return result;
};

type LoadMeArgs = { user: RawUser; deviceToken?: string; serverUrl: string };
const loadMe = async ({deviceToken, serverUrl, user}: LoadMeArgs) => {
    let currentUser: RawUser = user;

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
            currentUser = await Client4.getMe() as unknown as RawUser; //todo:  why do we do this here ?
        }
    } catch (error) {
        forceLogoutIfNecessary(error);
        return {error};
    }

    try {
        const analyticsClient = analytics.create(serverUrl);
        analyticsClient.setUserId(currentUser.id);
        analyticsClient.setUserRoles(currentUser.roles);

        //todo: maybe you need to defer some of those requests for when we load the channels ??
        const teamsRequest = Client4.getMyTeams();
        const teamMembersRequest = Client4.getMyTeamMembers();
        const teamUnreadRequest = Client4.getMyTeamUnreads();
        const preferencesRequest = Client4.getMyPreferences();
        const configRequest = Client4.getClientConfigOld();
        const licenseRequest = Client4.getClientLicenseOld(); // todo: I have added this one

        const [teams, teamMembers, teamUnreads, preferences, config, license] = await Promise.all([teamsRequest, teamMembersRequest, teamUnreadRequest, preferencesRequest, configRequest, licenseRequest]);

        const teamRecords = await DataOperator.handleTeam({prepareRecordsOnly: true, teams: (teams as RawTeam[])});

        const teamMembershipRecords = await DataOperator.handleTeamMemberships({
            prepareRecordsOnly: true,
            teamMemberships: (teamMembers as unknown) as RawTeamMembership[],
        });

        //fixme: Ask for confirmation from Elias/Miguel as to how the unreads count are really treated.
        const myTeams = teamUnreads.map((unread) => {
            return {
                team_id: unread.team_id,
                roles: '',
                is_unread: unread.msg_count > 0,
                mentions_count: unread.mention_count,
            };
        });

        //fixme:myTeamRecords/teamUnreads contain  { "mention_count": 0, "mention_count_root": 0, "msg_count": 0, "msg_count_root":
        //       0, "team_id": "ubr1ia9uj7bu3qwqdzonigfj5o" }.  But the RawMyTeam and the schema has a 'roles' field...to confirm what should go in there
        const myTeamRecords = await DataOperator.handleMyTeam({
            prepareRecordsOnly: true,
            myTeams: (myTeams as unknown) as RawMyTeam[],
        });

        const systemRecords = await DataOperator.handleIsolatedEntity({
            tableName: IsolatedEntities.SYSTEM,
            values: [
                {
                    name: 'config',
                    value: config,
                },
                {
                    name: 'license',
                    value: license,
                },
                {
                    name: 'currentUserId',
                    value: user.id,
                },
                {
                    name: 'currentUser',
                    value: user,
                },
                {
                    name: 'url',
                    value: Client4.getUrl(),
                },
            ],
            prepareRecordsOnly: true,
        });

        const preferenceRecords = await DataOperator.handlePreferences({
            prepareRecordsOnly: true,
            preferences: (preferences as unknown) as RawPreference[],
        });

        const rolesToLoad = new Set<string>();

        for (const role of user.roles.split(' ')) {
            rolesToLoad.add(role);
        }

        for (const teamMember of teamMembers) {
            for (const role of teamMember.roles.split(' ')) {
                rolesToLoad.add(role);
            }
        }

        let rolesRecords: Role[] = [];
        if (rolesToLoad.size > 0) {
            const roles = await Client4.getRolesByNames(Array.from(rolesToLoad)) as RawRole[];

            if (roles?.length) {
                rolesRecords = (await DataOperator.handleIsolatedEntity({
                    tableName: IsolatedEntities.ROLE,
                    prepareRecordsOnly: true,
                    values: (roles as unknown) as RawRole[],
                })) as Role[];
            }
        }

        const models = compact([
            ...teamRecords,
            ...teamMembershipRecords,
            ...myTeamRecords,
            ...systemRecords,
            ...preferenceRecords,
            ...rolesRecords,
        ]);

        if (models?.length > 0) {
            await DataOperator.batchOperations({database, models});
        }
    } catch (error) {
        return {error};
    }

    return {data: currentUser};
};

export const completeLogin = async (user: RawUser, deviceToken: string) => {
    const database = await DatabaseManager.getActiveServerDatabase();

    if (!database) {
        throw new DatabaseConnectionException(
            'DatabaseManager.getActiveServerDatabase returned undefined in @requests/remote/user/completeLogin',
        );
    }

    let config = null;
    let license = null;

    const systemRecords = await database.collections.get(SYSTEM).query(Q.where('name', Q.oneOf(['config', 'license']))).fetch() as System[];
    systemRecords.forEach((systemRecord) => {
        if (systemRecord.name === 'config') {
            config = systemRecord.value;
        }
        if (systemRecord.name === 'license') {
            license = systemRecord.value;
        }
    });

    if (!config || !license) {
        return;
    }
    const token = Client4.getToken();
    const url = Client4.getUrl();

    setAppCredentials(deviceToken, user.id, token, url);

    // Set timezone
    if (isTimezoneEnabled(config)) {
        const timezone = getDeviceTimezone();
        await autoUpdateTimezone(timezone);
    }

    // Data retention
    if (config?.DataRetentionEnableMessageDeletion && config?.DataRetentionEnableMessageDeletion === 'true' &&
            license?.IsLicensed === 'true' && license?.DataRetention === 'true') {
        // dispatch(getDataRetentionPolicy());
    } else {
        // dispatch({type: GeneralTypes.RECEIVED_DATA_RETENTION_POLICY, data: {}});
    }
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
