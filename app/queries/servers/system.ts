// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Database, Q} from '@nozbe/watermelondb';
import {of as of$, Observable} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {Preferences} from '@constants';
import {MM_TABLES, SYSTEM_IDENTIFIERS} from '@constants/database';
import {PUSH_PROXY_STATUS_UNKNOWN} from '@constants/push_proxy';

import type ServerDataOperator from '@database/operator/server_data_operator';
import type SystemModel from '@typings/database/models/servers/system';

export type PrepareCommonSystemValuesArgs = {
    config?: ClientConfig;
    lastUnreadChannelId?: string;
    currentChannelId?: string;
    currentTeamId?: string;
    currentUserId?: string;
    license?: ClientLicense;
    teamHistory?: string;
}

const {SERVER: {SYSTEM}} = MM_TABLES;

export const getCurrentChannelId = async (serverDatabase: Database): Promise<string> => {
    try {
        const currentChannelId = await serverDatabase.get<SystemModel>(SYSTEM).find(SYSTEM_IDENTIFIERS.CURRENT_CHANNEL_ID);
        return currentChannelId?.value || '';
    } catch {
        return '';
    }
};

export const querySystemValue = (database: Database, key: string) => {
    return database.get<SystemModel>(SYSTEM).query(Q.where('id', (key)), Q.take(1));
};

export const observeCurrentChannelId = (database: Database): Observable<string> => {
    return querySystemValue(database, SYSTEM_IDENTIFIERS.CURRENT_CHANNEL_ID).observe().pipe(
        switchMap((result) => (result.length ? result[0].observe() : of$({value: ''}))),
        switchMap((model) => of$(model.value)),
    );
};

export const getCurrentTeamId = async (serverDatabase: Database): Promise<string> => {
    try {
        const currentTeamId = await serverDatabase.get<SystemModel>(SYSTEM).find(SYSTEM_IDENTIFIERS.CURRENT_TEAM_ID);
        return currentTeamId?.value || '';
    } catch {
        return '';
    }
};

export const observeCurrentTeamId = (database: Database): Observable<string> => {
    return querySystemValue(database, SYSTEM_IDENTIFIERS.CURRENT_TEAM_ID).observe().pipe(
        switchMap((result) => (result.length ? result[0].observe() : of$({value: ''}))),
        switchMap((model) => of$(model.value)),
    );
};

export const getCurrentUserId = async (serverDatabase: Database): Promise<string> => {
    try {
        const currentUserId = await serverDatabase.get<SystemModel>(SYSTEM).find(SYSTEM_IDENTIFIERS.CURRENT_USER_ID);
        return currentUserId?.value || '';
    } catch {
        return '';
    }
};

export const observeCurrentUserId = (database: Database): Observable<string> => {
    return querySystemValue(database, SYSTEM_IDENTIFIERS.CURRENT_USER_ID).observe().pipe(
        switchMap((result) => (result.length ? result[0].observe() : of$({value: ''}))),
        switchMap((model) => of$(model.value)),
    );
};

export const getPushVerificationStatus = async (serverDatabase: Database): Promise<string> => {
    try {
        const status = await serverDatabase.get<SystemModel>(SYSTEM).find(SYSTEM_IDENTIFIERS.PUSH_VERIFICATION_STATUS);
        return status?.value || '';
    } catch {
        return '';
    }
};

export const observePushVerificationStatus = (database: Database): Observable<string> => {
    return querySystemValue(database, SYSTEM_IDENTIFIERS.PUSH_VERIFICATION_STATUS).observe().pipe(
        switchMap((result) => (result.length ? result[0].observe() : of$({value: PUSH_PROXY_STATUS_UNKNOWN}))),
        switchMap((model) => of$(model.value)),
    );
};

export const getCommonSystemValues = async (serverDatabase: Database) => {
    const systemRecords = (await serverDatabase.collections.get<SystemModel>(SYSTEM).query().fetch());
    let config: ClientConfig = {} as ClientConfig;
    let license: ClientLicense = {} as ClientLicense;
    let currentChannelId = '';
    let currentTeamId = '';
    let currentUserId = '';
    let lastUnreadChannelId = '';
    systemRecords.forEach((systemRecord) => {
        switch (systemRecord.id) {
            case SYSTEM_IDENTIFIERS.CONFIG:
                config = systemRecord.value;
                break;
            case SYSTEM_IDENTIFIERS.CURRENT_CHANNEL_ID:
                currentChannelId = systemRecord.value;
                break;
            case SYSTEM_IDENTIFIERS.CURRENT_TEAM_ID:
                currentTeamId = systemRecord.value;
                break;
            case SYSTEM_IDENTIFIERS.CURRENT_USER_ID:
                currentUserId = systemRecord.value;
                break;
            case SYSTEM_IDENTIFIERS.LICENSE:
                license = systemRecord.value;
                break;
            case SYSTEM_IDENTIFIERS.LAST_UNREAD_CHANNEL_ID:
                lastUnreadChannelId = systemRecord.value;
                break;
        }
    });

    return {
        currentChannelId,
        currentTeamId,
        currentUserId,
        lastUnreadChannelId,
        config,
        license,
    };
};

export const getConfig = async (serverDatabase: Database) => {
    try {
        const config = await serverDatabase.get<SystemModel>(SYSTEM).find(SYSTEM_IDENTIFIERS.CONFIG);
        return (config?.value || {}) as ClientConfig;
    } catch {
        return undefined;
    }
};

export const observeConfig = (database: Database): Observable<ClientConfig | undefined> => {
    return querySystemValue(database, SYSTEM_IDENTIFIERS.CONFIG).observe().pipe(
        switchMap((result) => (result.length ? result[0].observe() : of$({value: undefined}))),
        switchMap((model) => of$(model.value)),
    );
};

export const observeConfigValue = (database: Database, key: keyof ClientConfig) => {
    return observeConfig(database).pipe(
        switchMap((cfg) => of$(cfg?.[key])),
    );
};

export const observeConfigBooleanValue = (database: Database, key: keyof ClientConfig) => {
    return observeConfig(database).pipe(
        switchMap((cfg) => of$(cfg?.[key] === 'true')),
    );
};

export const observeConfigIntValue = (database: Database, key: keyof ClientConfig, defaultValue = 0) => {
    return observeConfig(database).pipe(
        switchMap((cfg) => of$((parseInt(cfg?.[key] || '0', 10) || defaultValue))),
    );
};

export const observeLicense = (database: Database): Observable<ClientLicense | undefined> => {
    return querySystemValue(database, SYSTEM_IDENTIFIERS.LICENSE).observe().pipe(
        switchMap((result) => (result.length ? result[0].observe() : of$({value: undefined}))),
        switchMap((model) => of$(model.value)),
    );
};

export const getLicense = async (serverDatabase: Database): Promise<ClientLicense | undefined> => {
    try {
        const license = await serverDatabase.get<SystemModel>(SYSTEM).find(SYSTEM_IDENTIFIERS.LICENSE);
        return license?.value;
    } catch {
        return undefined;
    }
};

export const getRecentCustomStatuses = async (database: Database): Promise<UserCustomStatus[]> => {
    try {
        const recent = await database.get<SystemModel>(SYSTEM).find(SYSTEM_IDENTIFIERS.RECENT_CUSTOM_STATUS);
        return recent.value;
    } catch {
        return [];
    }
};

export const getExpandedLinks = async (database: Database): Promise<Record<string, string>> => {
    try {
        const expandedLinks = await database.get<SystemModel>(SYSTEM).find(SYSTEM_IDENTIFIERS.EXPANDED_LINKS);
        return expandedLinks?.value || {};
    } catch {
        return {};
    }
};

export const observeExpandedLinks = (database: Database): Observable<Record<string, string>> => {
    return querySystemValue(database, SYSTEM_IDENTIFIERS.EXPANDED_LINKS).observe().pipe(
        switchMap((result) => (result.length ? result[0].observe() : of$({value: {}}))),
        switchMap((model) => of$(model.value)),
    );
};

export const observeRecentMentions = (database: Database): Observable<string[]> => {
    return querySystemValue(database, SYSTEM_IDENTIFIERS.RECENT_MENTIONS).observe().pipe(
        switchMap((result) => (result.length ? result[0].observe() : of$({value: []}))),
        switchMap((model) => of$(model.value)),
    );
};

export const getRecentReactions = async (database: Database): Promise<string[]> => {
    try {
        const reactions = await database.get<SystemModel>(SYSTEM).find(SYSTEM_IDENTIFIERS.RECENT_REACTIONS);
        return reactions.value;
    } catch {
        return [];
    }
};

export const observeRecentReactions = (database: Database): Observable<string[]> => {
    return querySystemValue(database, SYSTEM_IDENTIFIERS.RECENT_REACTIONS).observe().pipe(
        switchMap((result) => (result.length ? result[0].observe() : of$({value: []}))),
        switchMap((model) => of$(model.value)),
    );
};

export const observeRecentCustomStatus = (database: Database): Observable<UserCustomStatus[]> => {
    return querySystemValue(database, SYSTEM_IDENTIFIERS.RECENT_CUSTOM_STATUS).observe().pipe(
        switchMap((result) => (result.length ? result[0].observe() : of$({value: []}))),
        switchMap((model) => of$(model.value)),
    );
};

export const getWebSocketLastDisconnected = async (serverDatabase: Database) => {
    try {
        const websocketLastDisconnected = await serverDatabase.get<SystemModel>(SYSTEM).find(SYSTEM_IDENTIFIERS.WEBSOCKET);
        return (parseInt(websocketLastDisconnected?.value || 0, 10) || 0);
    } catch {
        return 0;
    }
};

export const observeWebsocket = (database: Database) => {
    return querySystemValue(database, SYSTEM_IDENTIFIERS.WEBSOCKET).observe().pipe(
        switchMap((result) => (result.length ? result[0].observe() : of$({value: '0'}))),
        switchMap((model) => of$(parseInt(model.value || 0, 10) || 0)),
    );
};

export const resetWebSocketLastDisconnected = async (operator: ServerDataOperator, prepareRecordsOnly = false) => {
    const lastDisconnectedAt = await getWebSocketLastDisconnected(operator.database);

    if (lastDisconnectedAt) {
        return operator.handleSystem({systems: [{
            id: SYSTEM_IDENTIFIERS.WEBSOCKET,
            value: 0,
        }],
        prepareRecordsOnly});
    }

    return [];
};

export const getTeamHistory = async (serverDatabase: Database): Promise<string[]> => {
    try {
        const teamHistory = await serverDatabase.get<SystemModel>(SYSTEM).find(SYSTEM_IDENTIFIERS.TEAM_HISTORY);
        return teamHistory.value;
    } catch {
        return [];
    }
};

export const patchTeamHistory = (operator: ServerDataOperator, value: string[], prepareRecordsOnly = false) => {
    return operator.handleSystem({systems: [{
        id: SYSTEM_IDENTIFIERS.TEAM_HISTORY,
        value: JSON.stringify(value),
    }],
    prepareRecordsOnly});
};

export async function prepareCommonSystemValues(
    operator: ServerDataOperator, values: PrepareCommonSystemValuesArgs): Promise<SystemModel[]> {
    try {
        const {config, lastUnreadChannelId, currentChannelId, currentTeamId, currentUserId, license} = values;
        const systems: IdValue[] = [];
        if (config !== undefined) {
            systems.push({
                id: SYSTEM_IDENTIFIERS.CONFIG,
                value: JSON.stringify(config),
            });
        }

        if (license !== undefined) {
            systems.push({
                id: SYSTEM_IDENTIFIERS.LICENSE,
                value: JSON.stringify(license),
            });
        }

        if (lastUnreadChannelId !== undefined) {
            systems.push({
                id: SYSTEM_IDENTIFIERS.LAST_UNREAD_CHANNEL_ID,
                value: lastUnreadChannelId,
            });
        }

        if (currentUserId !== undefined) {
            systems.push({
                id: SYSTEM_IDENTIFIERS.CURRENT_USER_ID,
                value: currentUserId,
            });
        }

        if (currentTeamId !== undefined) {
            systems.push({
                id: SYSTEM_IDENTIFIERS.CURRENT_TEAM_ID,
                value: currentTeamId,
            });
        }

        if (currentChannelId !== undefined) {
            systems.push({
                id: SYSTEM_IDENTIFIERS.CURRENT_CHANNEL_ID,
                value: currentChannelId,
            });
        }

        return operator.handleSystem({
            systems,
            prepareRecordsOnly: true,
        });
    } catch {
        return [];
    }
}

export async function setCurrentChannelId(operator: ServerDataOperator, channelId: string) {
    try {
        const models = await prepareCommonSystemValues(operator, {currentChannelId: channelId});
        if (models) {
            await operator.batchRecords(models);
        }

        return {currentChannelId: channelId};
    } catch (error) {
        return {error};
    }
}

export async function setCurrentTeamAndChannelId(operator: ServerDataOperator, teamId?: string, channelId?: string) {
    try {
        const models = await prepareCommonSystemValues(operator, {
            currentChannelId: channelId,
            currentTeamId: teamId,
        });
        if (models) {
            await operator.batchRecords(models);
        }

        return {currentTeamId: teamId, currentChannelId: channelId};
    } catch (error) {
        return {error};
    }
}

export const observeLastUnreadChannelId = (database: Database): Observable<string> => {
    return querySystemValue(database, SYSTEM_IDENTIFIERS.LAST_UNREAD_CHANNEL_ID).observe().pipe(
        switchMap((result) => (result.length ? result[0].observe() : of$({value: ''}))),
        switchMap((model) => of$(model.value)),
    );
};

export const queryLastUnreadChannelId = (database: Database) => {
    return querySystemValue(database, SYSTEM_IDENTIFIERS.LAST_UNREAD_CHANNEL_ID);
};

export const getLastUnreadChannelId = async (serverDatabase: Database): Promise<string> => {
    try {
        const lastUnreadChannelId = (await queryLastUnreadChannelId(serverDatabase).fetch())[0];
        return lastUnreadChannelId?.value || '';
    } catch {
        return '';
    }
};

export const observeOnlyUnreads = (database: Database) => {
    return querySystemValue(database, SYSTEM_IDENTIFIERS.ONLY_UNREADS).observeWithColumns(['value']).pipe(
        switchMap((result) => (result.length ? result[0].observe() : of$({value: false}))),
        switchMap((model) => of$(model.value as boolean)),
    );
};

export const observeAllowedThemes = (database: Database) => {
    const defaultThemeKeys = Object.keys(Preferences.THEMES);
    return observeConfigValue(database, 'AllowedThemes').pipe(
        switchMap((allowedThemes) => {
            let acceptableThemes = defaultThemeKeys;

            if (allowedThemes) {
                const allowedThemeKeys = (allowedThemes || '').split(',').filter(String);
                if (allowedThemeKeys.length) {
                    acceptableThemes = defaultThemeKeys.filter((k) => allowedThemeKeys.includes(k));
                }
            }

            return acceptableThemes;
        }),
    );
};
