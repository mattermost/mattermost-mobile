// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/* eslint-disable max-lines */

import {Database, Q} from '@nozbe/watermelondb';
import {nativeApplicationVersion, nativeBuildVersion} from 'expo-application';
import {modelName} from 'expo-device';
import {Platform} from 'react-native';
import {of as of$, Observable, combineLatest} from 'rxjs';
import {switchMap, distinctUntilChanged} from 'rxjs/operators';

import {Preferences, License} from '@constants';
import {MM_TABLES, SYSTEM_IDENTIFIERS} from '@constants/database';
import {PUSH_PROXY_STATUS_UNKNOWN} from '@constants/push_proxy';
import {getFullErrorMessage} from '@utils/errors';
import {isMinimumLicenseTier, isMinimumServerVersion, type LicenseTierSku} from '@utils/helpers';
import {logError} from '@utils/log';

import type ServerDataOperator from '@database/operator/server_data_operator';
import type ConfigModel from '@typings/database/models/servers/config';
import type SystemModel from '@typings/database/models/servers/system';

export type PrepareCommonSystemValuesArgs = {
    lastUnreadChannelId?: string;
    currentChannelId?: string;
    currentTeamId?: string;
    currentUserId?: string;
    license?: ClientLicense;
    teamHistory?: string;
}

const {SERVER: {SYSTEM, CONFIG}} = MM_TABLES;

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

export const observeGlobalThreadsTab = (database: Database): Observable<string> => {
    return querySystemValue(database, SYSTEM_IDENTIFIERS.GLOBAL_THREADS_TAB).observe().pipe(
        switchMap((result) => (result.length ? result[0].observe() : of$({value: 'all'}))),
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
    let license: ClientLicense = {} as ClientLicense;
    let currentChannelId = '';
    let currentTeamId = '';
    let currentUserId = '';
    let lastUnreadChannelId = '';
    systemRecords.forEach((systemRecord) => {
        switch (systemRecord.id) {
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
        license,
    };
};

const fromModelToClientConfig = <T = ClientConfig>(list: ConfigModel[]) => {
    const config: {[key: string]: any} = {};
    list.forEach((v) => {
        config[v.id] = v.value;
    });
    return config as T;
};

export const getConfig = async (database: Database) => {
    const configList = await database.get<ConfigModel>(CONFIG).query().fetch();
    return fromModelToClientConfig(configList);
};

export const getSecurityConfig = async (database: Database) => {
    const configList = await database.get<ConfigModel>(CONFIG).query(
        Q.where('id', Q.oneOf(['MobileEnableBiometrics', 'MobileJailbreakProtection', 'MobilePreventScreenCapture', 'SiteName']))).fetch();
    return fromModelToClientConfig<SecurityClientConfig>(configList);
};

export const queryConfigValue = (database: Database, key: keyof ClientConfig) => {
    return database.get<ConfigModel>(CONFIG).query(Q.where('id', Q.eq(key)));
};

export const getConfigValue = async (database: Database, key: keyof ClientConfig) => {
    const list = await queryConfigValue(database, key).fetch();
    return list.length ? list[0].value : undefined;
};

export const getConfigBooleanValue = async (database: Database, key: keyof ClientConfig, defaultValue = false) => {
    const v = await getConfigValue(database, key);
    return v ? v === 'true' : defaultValue;
};

export const getLastGlobalDataRetentionRun = async (database: Database) => {
    try {
        const data = await database.get<SystemModel>(SYSTEM).find(SYSTEM_IDENTIFIERS.LAST_DATA_RETENTION_RUN);
        return data?.value || 0;
    } catch {
        return undefined;
    }
};

export const getDisconnectedSince = async (database: Database): Promise<number | undefined> => {
    try {
        const data = await database.get<SystemModel>(SYSTEM).find(SYSTEM_IDENTIFIERS.DISCONNECTED_SINCE);
        return data?.value as number | undefined;
    } catch {
        return undefined;
    }
};

export const getOfflineSince = async (database: Database): Promise<number | undefined> => {
    try {
        const data = await database.get<SystemModel>(SYSTEM).find(SYSTEM_IDENTIFIERS.OFFLINE_SINCE);
        return data?.value as number | undefined;
    } catch {
        return undefined;
    }
};

export const getLastSeenTime = async (database: Database): Promise<number | undefined> => {
    try {
        const data = await database.get<SystemModel>(SYSTEM).find(SYSTEM_IDENTIFIERS.LAST_SEEN_TIME);
        return data?.value as number | undefined;
    } catch {
        return undefined;
    }
};

export const getLastBoRPostCleanupRun = async (database: Database) => {
    try {
        const data = await database.get<SystemModel>(SYSTEM).find(SYSTEM_IDENTIFIERS.LAST_BOR_POST_CLEANUP_RUN);
        return data?.value || 0;
    } catch {
        return 0;
    }
};

export const getGlobalDataRetentionPolicy = async (database: Database) => {
    try {
        const data = await database.get<SystemModel>(SYSTEM).find(SYSTEM_IDENTIFIERS.DATA_RETENTION_POLICIES);
        return (data?.value || {}) as GlobalDataRetentionPolicy;
    } catch {
        return undefined;
    }
};

export const getGranularDataRetentionPolicies = async (database: Database) => {
    try {
        const data = await database.get<SystemModel>(SYSTEM).find(SYSTEM_IDENTIFIERS.GRANULAR_DATA_RETENTION_POLICIES);
        return (data?.value || {
            team: [],
            channel: [],
        }) as {
            team: TeamDataRetentionPolicy[];
            channel: ChannelDataRetentionPolicy[];
        };
    } catch {
        return undefined;
    }
};

export const getIsDataRetentionEnabled = async (database: Database) => {
    const license = await getLicense(database);
    if (!license || !Object.keys(license)?.length) {
        return null;
    }

    const dataRetentionEnableMessageDeletion = await getConfigValue(database, 'DataRetentionEnableMessageDeletion');

    return dataRetentionEnableMessageDeletion === 'true' && license?.IsLicensed === 'true' && license?.DataRetention === 'true';
};

export const observeConfig = (database: Database): Observable<ClientConfig | undefined> => {
    return database.get<ConfigModel>(CONFIG).query().observeWithColumns(['value']).pipe(
        switchMap((result) => of$(fromModelToClientConfig<ClientConfig>(result))),
    );
};

export const observeConfigValue = (database: Database, key: keyof ClientConfig) => {
    return queryConfigValue(database, key).observeWithColumns(['value']).pipe(
        switchMap((result) => of$(result.length ? result[0].value : undefined)),
    );
};

export const observeMaxFileCount = (database: Database) => {
    return observeConfigValue(database, 'Version').pipe(
        switchMap((v) => of$(isMinimumServerVersion(v || '', 6, 0) ? 10 : 5)),
    );
};

export const observeIsCustomStatusExpirySupported = (database: Database) => {
    return observeConfigValue(database, 'Version').pipe(
        switchMap((v) => of$(isMinimumServerVersion(v || '', 5, 37))),
    );
};

export const observeConfigBooleanValue = (database: Database, key: keyof ClientConfig, defaultValue = false) => {
    return observeConfigValue(database, key).pipe(
        switchMap((v) => of$(v ? v === 'true' : defaultValue)),
        distinctUntilChanged(),
    );
};

export const observeConfigIntValue = (database: Database, key: keyof ClientConfig, defaultValue = 0) => {
    return observeConfigValue(database, key).pipe(
        switchMap((v) => of$((parseInt(v || '0', 10) || defaultValue))),
    );
};

// The deprecated ExperimentalViewArchivedChannels setting was the last gate on viewing archived
// channels. It is always enabled on servers newer than v10.11, which stopped sending it in the client
// config, so an absent value means the feature is on. Supported older servers (down to v5.26.2) still
// send it and may have explicitly disabled it, so only an explicit 'false' turns archived channels off.
//
// TODO: once we drop support for servers <= v10.11 the field is never sent, so these helpers and all of
// their callers can be removed and archived channels treated as always viewable.
const archivedChannelsViewable = (value?: string) => value !== 'false';

export const canViewArchivedChannels = async (database: Database) => {
    return archivedChannelsViewable(await getConfigValue(database, 'ExperimentalViewArchivedChannels'));
};

export const observeCanViewArchivedChannels = (database: Database) => {
    return observeConfigValue(database, 'ExperimentalViewArchivedChannels').pipe(
        switchMap((value) => of$(archivedChannelsViewable(value))),
        distinctUntilChanged(),
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

export const getLastFullSync = async (serverDatabase: Database) => {
    try {
        const websocketLastDisconnected = await serverDatabase.get<SystemModel>(SYSTEM).find(SYSTEM_IDENTIFIERS.WEBSOCKET);
        return (parseInt(websocketLastDisconnected?.value || 0, 10) || 0);
    } catch {
        return 0;
    }
};

export const setLastFullSync = async (operator: ServerDataOperator, value: number, prepareRecordsOnly = false) => {
    return operator.handleSystem({systems: [{
        id: SYSTEM_IDENTIFIERS.WEBSOCKET,
        value,
    }],
    prepareRecordsOnly});
};

export const resetLastFullSync = async (operator: ServerDataOperator, prepareRecordsOnly = false) => {
    const {database} = operator;
    const lastDisconnectedAt = await getLastFullSync(database);

    if (lastDisconnectedAt) {
        return operator.handleSystem({systems: [{
            id: SYSTEM_IDENTIFIERS.WEBSOCKET,
            value: 0,
        }],
        prepareRecordsOnly});
    }

    return [];
};

// Value is the timestamp returned by the initial_load response, used as ?since= cursor
// for subsequent initial_load calls.
export const getLastInitialLoad = async (serverDatabase: Database): Promise<number> => {
    try {
        const record = await serverDatabase.get<SystemModel>(SYSTEM).find(SYSTEM_IDENTIFIERS.LAST_INITIAL_LOAD);
        return parseInt(record?.value || '0', 10) || 0;
    } catch {
        return 0;
    }
};

export const setLastInitialLoad = (operator: ServerDataOperator, value: number, prepareRecordsOnly = false) => {
    return operator.handleSystem({systems: [{
        id: SYSTEM_IDENTIFIERS.LAST_INITIAL_LOAD,
        value,
    }],
    prepareRecordsOnly});
};

// Per-team load cursor — stored as `lastTeamLoad_{teamId}` so each team has its own value.
export const getLastTeamLoad = async (serverDatabase: Database, teamId: string): Promise<number> => {
    try {
        const record = await serverDatabase.get<SystemModel>(SYSTEM).find(`${SYSTEM_IDENTIFIERS.LAST_TEAM_LOAD}_${teamId}`);
        return parseInt(record?.value || '0', 10) || 0;
    } catch {
        return 0;
    }
};

export const setLastTeamLoad = (operator: ServerDataOperator, teamId: string, value: number, prepareRecordsOnly = false) => {
    return operator.handleSystem({systems: [{
        id: `${SYSTEM_IDENTIFIERS.LAST_TEAM_LOAD}_${teamId}`,
        value,
    }],
    prepareRecordsOnly});
};

export const prepareDeleteTeamLoadCursor = async (database: Database, teamId: string): Promise<SystemModel | undefined> => {
    try {
        const record = await database.get<SystemModel>(SYSTEM).find(`${SYSTEM_IDENTIFIERS.LAST_TEAM_LOAD}_${teamId}`);
        return record.prepareDestroyPermanently();
    } catch {
        return undefined;
    }
};

export const observeTeamBadgeCounts = (database: Database): Observable<TeamBadgeCounts | undefined> => {
    return querySystemValue(database, SYSTEM_IDENTIFIERS.TEAM_BADGE_COUNTS).observe().pipe(
        switchMap((result) => (result.length ? result[0].observe() : of$(undefined))),
        switchMap((model) => {
            if (!model) {
                return of$(undefined);
            }
            try {
                const parsed = typeof model.value === 'string' ? JSON.parse(model.value) : model.value;
                return of$(parsed as TeamBadgeCounts);
            } catch {
                return of$(undefined);
            }
        }),
        distinctUntilChanged(),
    );
};

const getTeamBadgeCountsRaw = async (database: Database): Promise<TeamBadgeCounts | undefined> => {
    try {
        const record = await database.get<SystemModel>(SYSTEM).find(SYSTEM_IDENTIFIERS.TEAM_BADGE_COUNTS);
        return typeof record.value === 'string' ? JSON.parse(record.value) : record.value;
    } catch {
        return undefined;
    }
};

// Removes mentions from a team slot. hasUnreads is left as-is for team slots
// (can't tell if other channels still have unreads); for the direct slot it
// follows mentionCount (DM unreads are mention-driven).
export const decrementTeamBlob = async (
    operator: ServerDataOperator,
    teamId: string,
    clearedMentions: number,
    clearedThreadMentions = 0,
): Promise<void> => {
    const blob = await getTeamBadgeCountsRaw(operator.database);
    if (!blob) {
        return;
    }

    const isDirect = teamId === '';
    const slot: TeamBadge | undefined = isDirect ? blob.direct : blob.teams[teamId];
    if (!slot) {
        return;
    }

    const newMentionCount = Math.max(0, slot.mentionCount - clearedMentions);
    const newHasUnreads = isDirect ? newMentionCount > 0 : slot.hasUnreads;
    const newThreadMentionCount = Math.max(0, slot.threadMentionCount - clearedThreadMentions);
    const newThreadHasUnreads = isDirect ? newThreadMentionCount > 0 : slot.threadHasUnreads;

    if (
        newMentionCount === slot.mentionCount &&
        newHasUnreads === slot.hasUnreads &&
        newThreadMentionCount === slot.threadMentionCount &&
        newThreadHasUnreads === slot.threadHasUnreads
    ) {
        return;
    }

    const updatedSlot: TeamBadge = {
        ...slot,
        mentionCount: newMentionCount,
        hasUnreads: newHasUnreads,
        threadMentionCount: newThreadMentionCount,
        threadHasUnreads: newThreadHasUnreads,
    };

    const updated: TeamBadgeCounts = isDirect ? {...blob, direct: updatedSlot} : {...blob, teams: {...blob.teams, [teamId]: updatedSlot}};

    await operator.handleSystem({
        systems: [{id: SYSTEM_IDENTIFIERS.TEAM_BADGE_COUNTS, value: JSON.stringify(updated)}],
        prepareRecordsOnly: false,
    });
};

// Adds mentions to a team slot and flips hasUnreads to true.
export const incrementTeamBlob = async (
    operator: ServerDataOperator,
    teamId: string,
    mentionDelta: number,
    threadMentionDelta = 0,
): Promise<void> => {
    const blob = await getTeamBadgeCountsRaw(operator.database);
    if (!blob) {
        return;
    }

    const slot: TeamBadge | undefined = blob.teams[teamId];
    if (!slot) {
        return;
    }

    const newMentionCount = slot.mentionCount + mentionDelta;
    const newThreadMentionCount = slot.threadMentionCount + threadMentionDelta;
    const newHasUnreads = true;
    const newThreadHasUnreads = newThreadMentionCount > 0 ? true : slot.threadHasUnreads;

    if (
        newMentionCount === slot.mentionCount &&
        newHasUnreads === slot.hasUnreads &&
        newThreadMentionCount === slot.threadMentionCount &&
        newThreadHasUnreads === slot.threadHasUnreads
    ) {
        return;
    }

    const updatedSlot: TeamBadge = {
        ...slot,
        mentionCount: newMentionCount,
        hasUnreads: newHasUnreads,
        threadMentionCount: newThreadMentionCount,
        threadHasUnreads: newThreadHasUnreads,
    };

    const updated: TeamBadgeCounts = {...blob, teams: {...blob.teams, [teamId]: updatedSlot}};

    await operator.handleSystem({
        systems: [{id: SYSTEM_IDENTIFIERS.TEAM_BADGE_COUNTS, value: JSON.stringify(updated)}],
        prepareRecordsOnly: false,
    });
};

// Zeroes thread fields for a team slot and the direct slot. Mirrors
// server-side MarkAllAsReadByTeam which clears both in one SQL update.
export const clearTeamThreadsInBlob = async (
    operator: ServerDataOperator,
    teamId: string,
): Promise<void> => {
    const blob = await getTeamBadgeCountsRaw(operator.database);
    if (!blob) {
        return;
    }

    const teamSlot = blob.teams[teamId];
    const directSlot = blob.direct;

    const teamNeedsUpdate = teamSlot && (teamSlot.threadMentionCount !== 0 || teamSlot.threadHasUnreads);
    const directNeedsUpdate = directSlot && (directSlot.threadMentionCount !== 0 || directSlot.threadHasUnreads);

    if (!teamNeedsUpdate && !directNeedsUpdate) {
        return;
    }

    const updated: TeamBadgeCounts = {
        teams: teamNeedsUpdate ? {...blob.teams, [teamId]: {...teamSlot, threadMentionCount: 0, threadHasUnreads: false}} : blob.teams,
        direct: directNeedsUpdate ? {...directSlot, threadMentionCount: 0, threadHasUnreads: false} : directSlot,
    };

    await operator.handleSystem({
        systems: [{id: SYSTEM_IDENTIFIERS.TEAM_BADGE_COUNTS, value: JSON.stringify(updated)}],
        prepareRecordsOnly: false,
    });
};

// Applies a thread mention delta. Positive delta = mentions removed (read/deleted);
// negative = added. '' targets the direct slot. Team slots are conservative on
// threadHasUnreads (only flip to true); the direct slot trusts hasUnreadsAfter directly.
export const adjustThreadInBlob = async (
    operator: ServerDataOperator,
    threadTeamId: string,
    mentionDelta: number,
    hasUnreadsAfter: boolean,
): Promise<void> => {
    const blob = await getTeamBadgeCountsRaw(operator.database);
    if (!blob) {
        return;
    }

    const isDirect = threadTeamId === '';
    const slot: TeamBadge | undefined = isDirect ? blob.direct : blob.teams[threadTeamId];
    if (!slot) {
        return;
    }

    const newMentionCount = Math.max(0, slot.threadMentionCount - mentionDelta);
    const newHasUnreads = isDirect ? hasUnreadsAfter : (slot.threadHasUnreads || hasUnreadsAfter);

    if (newMentionCount === slot.threadMentionCount && newHasUnreads === slot.threadHasUnreads) {
        return;
    }

    const updatedSlot: TeamBadge = {
        ...slot,
        threadMentionCount: newMentionCount,
        threadHasUnreads: newHasUnreads,
    };

    const updated: TeamBadgeCounts = isDirect ? {...blob, direct: updatedSlot} : {...blob, teams: {...blob.teams, [threadTeamId]: updatedSlot}};

    await operator.handleSystem({
        systems: [{id: SYSTEM_IDENTIFIERS.TEAM_BADGE_COUNTS, value: JSON.stringify(updated)}],
        prepareRecordsOnly: false,
    });
};

export const removeTeamFromBlob = async (
    operator: ServerDataOperator,
    teamId: string,
): Promise<void> => {
    const blob = await getTeamBadgeCountsRaw(operator.database);
    if (!blob || !(teamId in blob.teams)) {
        return;
    }

    const {[teamId]: _, ...remainingTeams} = blob.teams;
    const updated: TeamBadgeCounts = {...blob, teams: remainingTeams};

    await operator.handleSystem({
        systems: [{id: SYSTEM_IDENTIFIERS.TEAM_BADGE_COUNTS, value: JSON.stringify(updated)}],
        prepareRecordsOnly: false,
    });
};

// Moves a channel's mentions from the direct slot to a team slot.
// Used when a GM is converted to a private channel.
export const migrateChannelFromDirectToTeamBlob = async (
    operator: ServerDataOperator,
    teamId: string,
    mentionCount: number,
    hasUnreads: boolean,
): Promise<void> => {
    const blob = await getTeamBadgeCountsRaw(operator.database);
    if (!blob) {
        return;
    }

    const directSlot = blob.direct;
    const teamSlot = blob.teams[teamId];

    const newDirectMentionCount = directSlot ? Math.max(0, directSlot.mentionCount - mentionCount) : 0;
    const newDirectHasUnreads = newDirectMentionCount > 0;

    const updatedDirect: TeamBadge | undefined = directSlot ? {
        ...directSlot,
        mentionCount: newDirectMentionCount,
        hasUnreads: newDirectHasUnreads,
    } : directSlot;

    const updatedTeam: TeamBadge | undefined = teamSlot ? {
        ...teamSlot,
        mentionCount: teamSlot.mentionCount + mentionCount,
        hasUnreads: teamSlot.hasUnreads || hasUnreads,
    } : teamSlot;

    const updated: TeamBadgeCounts = {
        ...blob,
        ...(updatedDirect === undefined ? {} : {direct: updatedDirect}),
        teams: updatedTeam === undefined ? blob.teams : {...blob.teams, [teamId]: updatedTeam},
    };

    await operator.handleSystem({
        systems: [{id: SYSTEM_IDENTIFIERS.TEAM_BADGE_COUNTS, value: JSON.stringify(updated)}],
        prepareRecordsOnly: false,
    });
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
        const {lastUnreadChannelId, currentChannelId, currentTeamId, currentUserId, license} = values;
        const systems: IdValue[] = [];

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

export async function setCurrentUserId(operator: ServerDataOperator, userId: string) {
    try {
        const models = await prepareCommonSystemValues(operator, {currentUserId: userId});
        if (models) {
            await operator.batchRecords(models, 'setCurrentChannelId');
        }

        return {currentUserId: userId};
    } catch (error) {
        return {error};
    }
}

export async function setCurrentChannelId(operator: ServerDataOperator, channelId: string) {
    try {
        const models = await prepareCommonSystemValues(operator, {currentChannelId: channelId});
        if (models) {
            await operator.batchRecords(models, 'setCurrentChannelId');
        }

        return {currentChannelId: channelId};
    } catch (error) {
        return {error};
    }
}

export async function setCurrentTeamId(operator: ServerDataOperator, teamId: string) {
    try {
        const models = await prepareCommonSystemValues(operator, {
            currentTeamId: teamId,
        });
        if (models) {
            await operator.batchRecords(models, 'setCurrentTeamId');
        }

        return {currentTeamId: teamId};
    } catch (error) {
        logError('Failed setCurrentTeamId', getFullErrorMessage(error));
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
            await operator.batchRecords(models, 'setCurrentTeamAndChannelId');
        }

        return {currentTeamId: teamId, currentChannelId: channelId};
    } catch (error) {
        return {error};
    }
}

export const observeLastUnreadChannelId = (database: Database): Observable<string> => {
    return querySystemValue(database, SYSTEM_IDENTIFIERS.LAST_UNREAD_CHANNEL_ID).observe().pipe(
        switchMap((result) => (result.length ? result[0].observe() : of$({value: ''}))),
        switchMap((model) => {
            if (model.value) {
                return of$(model.value);
            }

            return observeCurrentChannelId(database);
        }),
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

export const observeAllowedThemesKeys = (database: Database) => {
    const defaultThemeKeys = Object.keys(Preferences.THEMES);
    return observeConfigValue(database, 'AllowedThemes').pipe(
        switchMap((allowedThemes) => {
            let acceptableThemes = defaultThemeKeys;
            if (allowedThemes) {
                const allowedThemeKeys = (allowedThemes ?? '').split(',').filter(String);
                if (allowedThemeKeys.length) {
                    acceptableThemes = defaultThemeKeys.filter((k) => allowedThemeKeys.includes(k));
                }
            }

            return of$(acceptableThemes);
        }),
    );
};

export const getExpiredSession = async (database: Database) => {
    try {
        const session = await database.get<SystemModel>(SYSTEM).find(SYSTEM_IDENTIFIERS.SESSION_EXPIRATION);
        return (session?.value || {}) as SessionExpiration;
    } catch {
        return undefined;
    }
};

export const observeLastDismissedAnnouncement = (database: Database) => {
    return querySystemValue(database, SYSTEM_IDENTIFIERS.LAST_DISMISSED_BANNER).observeWithColumns(['value']).pipe(
        switchMap((list) => of$(list[0]?.value)),
    );
};

export const observeLastServerVersionCheck = (database: Database) => {
    return querySystemValue(database, SYSTEM_IDENTIFIERS.LAST_SERVER_VERSION_CHECK).observeWithColumns(['value']).pipe(
        switchMap((result) => (result.length ? result[0].observe() : of$({value: 0}))),
        switchMap((model) => of$(parseInt(model.value, 10))),
    );
};

export const observeIfHighlightWithoutNotificationHasLicense = (database: Database) => {
    const license = observeLicense(database);

    const isCloudStarterFree = checkIsCloudStarterFree(license);
    const isStarterSKULicense = checkIsStarterSKULicense(license);
    const isSelfHostedStarter = observeIsSelfHosterStarter(database);
    const isEnterpriseReady = observeConfigBooleanValue(database, 'BuildEnterpriseReady', false);

    return combineLatest([isCloudStarterFree, isStarterSKULicense, isSelfHostedStarter, isEnterpriseReady]).pipe(
        switchMap(([isCSF, isSSL, isSHS, isEnt]) => {
            // It should have enterprise build AND not have a starter license of any kind
            const highlightWithoutNotificationHasLicense = isEnt && !(isCSF || isSSL || isSHS);

            return of$(highlightWithoutNotificationHasLicense);
        }),
    );
};

function checkIsCloudStarterFree(license: Observable<ClientLicense | undefined>) {
    return license.pipe(
        switchMap((l) => {
            const isCloud = l?.Cloud === 'true';
            const isStarterSKU = l?.SkuShortName === License.SKU_SHORT_NAME.Starter;

            return of$(isCloud && isStarterSKU);
        }),
        distinctUntilChanged(),
    );
}

function checkIsStarterSKULicense(license: Observable<ClientLicense | undefined>) {
    return license.pipe(
        switchMap((l) => {
            const isLicensed = l?.IsLicensed === 'true';
            const isSelfHostedStarterProduct = l?.SelfHostedProducts === License.SelfHostedProducts.STARTER;

            return of$(isLicensed && isSelfHostedStarterProduct);
        }),
        distinctUntilChanged(),
    );
}

const observeIsSelfHosterStarter = (database: Database) => {
    const license = observeLicense(database);
    const isEnterpriseReady = observeConfigBooleanValue(database, 'BuildEnterpriseReady', false);

    return combineLatest([license, isEnterpriseReady]).pipe(
        switchMap(([lic, isEnt]) => {
            const isLicensed = lic?.IsLicensed === 'true';
            const isSelfHostedStarter = isEnt && !isLicensed;

            return of$(isSelfHostedStarter);
        }),
    );
};

export const observeIsFreeEdition = (database: Database) => {
    return observeLicense(database).pipe(
        switchMap((license) => {
            const isLicensed = license?.IsLicensed === 'true';
            const isEntry = license?.SkuShortName === License.SKU_SHORT_NAME.Entry;
            return of$(!isLicensed || isEntry);
        }),
        distinctUntilChanged(),
    );
};

export const observeReportAProblemMetadata = (database: Database) => {
    const currentUserId = observeCurrentUserId(database);
    const currentTeamId = observeCurrentTeamId(database);
    const serverVersion = observeConfigValue(database, 'Version');
    const buildNumber = observeConfigValue(database, 'BuildNumber');

    return combineLatest([
        currentUserId,
        currentTeamId,
        serverVersion,
        buildNumber,
    ]).pipe(
        switchMap(([userId, teamId, version = 'Unknown', build = 'Unknown']) => of$({
            currentUserId: userId,
            currentTeamId: teamId,
            serverVersion: `${version} (Build ${build})`,
            appVersion: `${nativeApplicationVersion} (Build ${nativeBuildVersion})`,
            appPlatform: Platform.OS,
            deviceModel: modelName ?? 'Unknown',
        })),
    );
};

export const observeIsMinimumLicenseTier = (database: Database, shortSku: LicenseTierSku) => {
    const license = observeLicense(database);
    const isEnterpriseReady = observeConfigBooleanValue(database, 'BuildEnterpriseReady', false);

    return combineLatest([license, isEnterpriseReady]).pipe(
        switchMap(([lic, isEnt]) => {
            if (!shortSku || !isEnt) {
                return of$(false);
            }

            const meetsMinimumTier = isMinimumLicenseTier(lic, shortSku);

            return of$(meetsMinimumTier);
        }),
        distinctUntilChanged(),
    );
};
