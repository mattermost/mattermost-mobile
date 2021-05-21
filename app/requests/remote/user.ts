// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import {Q} from '@nozbe/watermelondb';
import compact from 'lodash.compact';
import isEmpty from 'lodash.isempty';

import {Client4} from '@client/rest';
import {MM_TABLES} from '@constants/database';
import DatabaseConnectionException from '@database/exceptions/database_connection_exception';
import DatabaseManager from '@database/manager';
import {DataOperator} from '@database/operator';
import analytics from '@init/analytics';
import {setAppCredentials} from '@init/credentials';
import {createSessions} from '@requests/local/systems';
import {autoUpdateTimezone, getDeviceTimezone, isTimezoneEnabled} from '@requests/local/timezone';
import {logError} from '@requests/remote/error';
import {getDataRetentionPolicy} from '@requests/remote/systems';
import {Client4Error} from '@typings/api/client4';
import {Config} from '@typings/database/config';
import {RawMyTeam, RawPreference, RawRole, RawTeam, RawTeamMembership, RawUser} from '@typings/database/database';
import {IsolatedEntities} from '@typings/database/enums';
import Global from '@typings/database/global';
import {Licence} from '@typings/database/license';
import Role from '@typings/database/role';
import System from '@typings/database/system';
import User from '@typings/database/user';
import {getCSRFFromCookie} from '@utils/security';

const HTTP_UNAUTHORIZED = 401;
const {
    SERVER: {SYSTEM},
    DEFAULT: {GLOBAL},
} = MM_TABLES;

//fixme: Question : do you need to pass an auth token when retrieving the config+license the second time ?
//todo: There are too many requests made just on the login flow - discuss it with peers to find out which group can be staggered.

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

    const currentUserId = await database.collections.
        get(SYSTEM).
        query(Q.where('name', 'currentUserId')).
        fetch();

    if ('status_code' in err && err.status_code === HTTP_UNAUTHORIZED && err?.url?.indexOf('/login') === -1 && currentUserId) {
        await logout(false);
    }
};

export const createAndSetActiveDatabase = async (config: Partial<Config>) => {
    const serverUrl = Client4.getUrl();
    const displayName = config.SiteName;

    if (!displayName) {
        throw new DatabaseConnectionException(
            `createAndSetActiveDatabase: Unable to create and set serverUrl ${serverUrl} as current active database with name ${displayName}`,
        );
    }
    try {
        await DatabaseManager.setActiveServerDatabase({displayName, serverUrl});
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
};
export const login = async ({config, ldapOnly = false, loginId, mfaToken, password}: LoginArgs) => {
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

    const result = await loadMe({user, deviceToken});

    if (!result.error) {
        await completeLogin(user, deviceToken);
    }

    return result;
};

type LoadMeArgs = { user: RawUser; deviceToken?: string; };
const loadMe = async ({deviceToken, user}: LoadMeArgs) => {
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
            currentUser = ((await Client4.getMe()) as unknown) as RawUser; //todo:  why do we do this here ?
        }
    } catch (error) {
        await forceLogoutIfNecessary(error);
        return {error};
    }

    try {
        const analyticsClient = analytics.create(Client4.getUrl());
        analyticsClient.setUserId(currentUser.id);
        analyticsClient.setUserRoles(currentUser.roles);

        //todo: maybe you need to defer some of those requests for when we load the channels ??
        const teamsRequest = Client4.getMyTeams();
        const teamMembersRequest = Client4.getMyTeamMembers();
        const teamUnreadRequest = Client4.getMyTeamUnreads();
        const preferencesRequest = Client4.getMyPreferences();
        const configRequest = Client4.getClientConfigOld();
        const licenseRequest = Client4.getClientLicenseOld(); // todo: I have added this one

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

        const teamRecords = await DataOperator.handleTeam({
            prepareRecordsOnly: true,
            teams: teams as RawTeam[],
        });

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

        let roles: string[] = [];
        for (const role of user.roles.split(' ')) {
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
                rolesRecords = (await DataOperator.handleIsolatedEntity({
                    tableName: IsolatedEntities.ROLE,
                    prepareRecordsOnly: true,
                    values: rolesByName,
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

    let config: Partial<Config> = {};
    let license: Partial<Licence> = {};

    const systemRecords = (await database.collections.get(SYSTEM).query(Q.where('name', Q.oneOf(['config', 'license']))).fetch()) as System[];

    systemRecords.forEach((systemRecord) => {
        if (systemRecord.name === 'config') {
            config = systemRecord.value;
        }
        if (systemRecord.name === 'license') {
            license = systemRecord.value;
        }
    });

    if (isEmpty(config) || isEmpty(license)) {
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

    let dataRetentionPolicy: any;

    // Data retention
    if (config?.DataRetentionEnableMessageDeletion === 'true' && license?.IsLicensed === 'true' && license?.DataRetention === 'true') {
        dataRetentionPolicy = await getDataRetentionPolicy();
        await DataOperator.handleIsolatedEntity({
            tableName: IsolatedEntities.SYSTEM,
            values: [
                {
                    name: 'dataRetentionPolicy',
                    value: dataRetentionPolicy,
                },
            ],
            prepareRecordsOnly: false,
        });
    }
};

export const updateMe = async (user: User) => {
    const database = await DatabaseManager.getActiveServerDatabase();
    if (!database) {
        throw new DatabaseConnectionException(
            'DatabaseManager.getActiveServerDatabase returned undefined in @requests/remote/user/updateMe',
        );
    }

    let data;
    try {
        data = await Client4.patchMe(user);
    } catch (error) {
        logError(error);
        return {error};
    }

    //fixme: we are writing to systems twice - is this optimal ?
    const systemRecords = await DataOperator.handleIsolatedEntity({
        tableName: IsolatedEntities.SYSTEM,
        values: [
            {name: 'currentUser', value: JSON.stringify(user)},
            {name: 'currentUserId', value: user.id},
            {name: 'locale', value: data?.locale},
        ],
        prepareRecordsOnly: true,
    });

    //todo: Do we need to write to TOS entity ?
    // const tosRecords = await DataOperator.handleIsolatedEntity({
    //     tableName: TERMS_OF_SERVICE,
    //     values: [{}],
    // });
    const models = compact([
        ...systemRecords,

    // ...tosRecords,
    ]);

    if (models?.length) {
        await DataOperator.batchOperations({database, models});
    }

    //todo: update roles if needed
    // dispatch(loadRolesIfNeeded(data.roles.split(' ')));

    return {data};
};

export const getSessions = async (currentUserId: string) => {
    try {
        const sessions = await Client4.getSessions(currentUserId);
        await createSessions(sessions);
    } catch (e) {
        logError(e);
        await forceLogoutIfNecessary(e);
    }
};
