// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Q} from '@nozbe/watermelondb';
import deepEqual from 'deep-equal';
import {DeviceEventEmitter} from 'react-native';

import {Events} from '@constants';
import {MM_TABLES, SYSTEM_IDENTIFIERS} from '@constants/database';
import {PostTypes, BOR_POST_CLEANUP_MIN_RUN_INTERVAL} from '@constants/post';
import DatabaseManager from '@database/manager';
import {getServerCredentials} from '@init/credentials';
import {queryAllChannelsForTeam} from '@queries/servers/channel';
import {queryPostsByType} from '@queries/servers/post';
import {
    getConfig,
    getLicense,
    getGlobalDataRetentionPolicy,
    getGranularDataRetentionPolicies,
    getLastGlobalDataRetentionRun,
    getIsDataRetentionEnabled,
    getLastBoRPostCleanupRun,
} from '@queries/servers/system';
import PostModel from '@typings/database/models/servers/post';
import {isExpiredBoRPost} from '@utils/bor';
import {logError} from '@utils/log';

import {deletePostsForChannelsWithAutotranslation} from './channel';
import {deletePosts} from './post';

import type {DataRetentionPoliciesRequest} from '@actions/remote/systems';

const {SERVER: {POST}} = MM_TABLES;

export async function storeConfigAndLicense(serverUrl: string, config: ClientConfig, license: ClientLicense) {
    try {
        // If we have credentials for this server then update the values in the database
        const credentials = await getServerCredentials(serverUrl);
        if (credentials) {
            const {operator, database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
            const currentLicense = await getLicense(database);
            const systems: IdValue[] = [];

            if (!deepEqual(license, currentLicense)) {
                systems.push({
                    id: SYSTEM_IDENTIFIERS.LICENSE,
                    value: JSON.stringify(license),
                });
            }

            if (systems.length) {
                await operator.handleSystem({systems, prepareRecordsOnly: false});
                DeviceEventEmitter.emit(Events.LICENSE_CHANGED, {serverUrl, license});
            }

            return await storeConfig(serverUrl, config);
        }
    } catch (error) {
        logError('An error occurred while saving config & license', error);
    }
    return [];
}

export async function storeConfig(serverUrl: string, config: ClientConfig | undefined, prepareRecordsOnly = false) {
    if (!config) {
        return [];
    }

    try {
        const {operator, database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const currentConfig = await getConfig(database);
        const configsToUpdate: IdValue[] = [];
        const configsToDelete: IdValue[] = [];

        // Check if EnableAutoTranslation changed from enabled to disabled
        const enableAutoTranslationChanged = (currentConfig?.EnableAutoTranslation === 'true') !== (config.EnableAutoTranslation === 'true');

        let k: keyof ClientConfig;
        for (k in config) {
            if (currentConfig?.[k] !== config[k]) {
                configsToUpdate.push({
                    id: k,
                    value: config[k],
                });
            }
        }
        for (k in currentConfig) {
            if (config[k] === undefined) {
                configsToDelete.push({
                    id: k,
                    value: currentConfig[k],
                });
            }
        }

        if (configsToDelete.length || configsToUpdate.length) {
            const results = await operator.handleConfigs({configs: configsToUpdate, configsToDelete, prepareRecordsOnly});
            DeviceEventEmitter.emit(Events.CONFIG_CHANGED, {serverUrl, config});

            // If EnableAutoTranslation was disabled, delete posts and disable user autotranslation
            if (enableAutoTranslationChanged) {
                await deletePostsForChannelsWithAutotranslation(serverUrl, prepareRecordsOnly);
            }

            return results;
        }
    } catch (error) {
        logError('storeConfig', error);
    }
    return [];
}

export async function storeDataRetentionPolicies(serverUrl: string, data: DataRetentionPoliciesRequest, prepareRecordsOnly = false) {
    try {
        const {globalPolicy, teamPolicies, channelPolicies} = data;
        const {operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const systems: IdValue[] = [{
            id: SYSTEM_IDENTIFIERS.DATA_RETENTION_POLICIES,
            value: globalPolicy || {},
        }, {
            id: SYSTEM_IDENTIFIERS.GRANULAR_DATA_RETENTION_POLICIES,
            value: {
                team: teamPolicies || [],
                channel: channelPolicies || [],
            },
        }];

        return operator.handleSystem({
            systems,
            prepareRecordsOnly,
        });
    } catch {
        return [];
    }
}

export async function updateLastDataRetentionRun(serverUrl: string, value?: number, prepareRecordsOnly = false) {
    try {
        const {operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);

        const systems: IdValue[] = [{
            id: SYSTEM_IDENTIFIERS.LAST_DATA_RETENTION_RUN,
            value: value || Date.now(),
        }];

        return operator.handleSystem({systems, prepareRecordsOnly});
    } catch (error) {
        logError('Failed updateLastDataRetentionRun', error);
        return {error};
    }
}

export async function dataRetentionCleanup(serverUrl: string) {
    try {
        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);

        const lastRunAt = await getLastGlobalDataRetentionRun(database);
        const lastCleanedToday = new Date(lastRunAt).toDateString() === new Date().toDateString();

        // Do not run if clean up is already done today
        if (lastRunAt && lastCleanedToday) {
            return {error: undefined};
        }

        const isDataRetentionEnabled = await getIsDataRetentionEnabled(database);
        const result = await (isDataRetentionEnabled ? dataRetentionPolicyCleanup(serverUrl) : dataRetentionWithoutPolicyCleanup(serverUrl));

        if (!result.error) {
            await updateLastDataRetentionRun(serverUrl);
        }

        await database.unsafeVacuum();

        return result;
    } catch (error) {
        logError('An error occurred while performing data retention cleanup', error);
        return {error};
    }
}

async function dataRetentionPolicyCleanup(serverUrl: string) {
    try {
        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const globalPolicy = await getGlobalDataRetentionPolicy(database);
        const granularPoliciesData = await getGranularDataRetentionPolicies(database);

        // Get global data retention cutoff
        let globalRetentionCutoff = 0;
        if (globalPolicy?.message_deletion_enabled) {
            globalRetentionCutoff = globalPolicy.message_retention_cutoff;
        }

        // Get Granular data retention policies
        let teamPolicies: TeamDataRetentionPolicy[] = [];
        let channelPolicies: ChannelDataRetentionPolicy[] = [];
        if (granularPoliciesData) {
            teamPolicies = granularPoliciesData.team;
            channelPolicies = granularPoliciesData.channel;
        }

        const channelsCutoffs: {[key: string]: number} = {};

        // Get channel level cutoff from team policies
        for await (const teamPolicy of teamPolicies) {
            const {team_id, post_duration} = teamPolicy;
            const channelIds = await queryAllChannelsForTeam(database, team_id).fetchIds();
            if (channelIds.length) {
                const cutoff = getDataRetentionPolicyCutoff(post_duration);
                channelIds.forEach((channelId) => {
                    channelsCutoffs[channelId] = cutoff;
                });
            }
        }

        // Get channel level cutoff from channel policies
        channelPolicies.forEach(({channel_id, post_duration}) => {
            channelsCutoffs[channel_id] = getDataRetentionPolicyCutoff(post_duration);
        });

        const conditions = [];

        const channelIds = Object.keys(channelsCutoffs);
        if (channelIds.length) {
            // Fetch posts by channel level cutoff
            for (const channelId of channelIds) {
                const cutoff = channelsCutoffs[channelId];
                conditions.push(`(channel_id='${channelId}' AND create_at < ${cutoff})`);
            }

            // Fetch posts by global cutoff which are not already fetched by channel level cutoff
            conditions.push(`(channel_id NOT IN ('${channelIds.join("','")}') AND create_at < ${globalRetentionCutoff})`);
        } else {
            conditions.push(`create_at < ${globalRetentionCutoff}`);
        }

        const postIds = await database.get<PostModel>(POST).query(
            Q.unsafeSqlQuery(`SELECT * FROM ${POST} where ${conditions.join(' OR ')}`),
        ).fetchIds();

        return dataRetentionCleanPosts(serverUrl, postIds);
    } catch (error) {
        logError('An error occurred while performing data retention policy cleanup', error);
        return {error};
    }
}

async function dataRetentionWithoutPolicyCleanup(serverUrl: string) {
    try {
        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const cutoff = getDataRetentionPolicyCutoff(14); // 14 days

        const postIds = await database.get<PostModel>(POST).query(
            Q.where('create_at', Q.lt(cutoff)),
        ).fetchIds();

        return dataRetentionCleanPosts(serverUrl, postIds);
    } catch (error) {
        logError('An error occurred while performing data retention without policy cleanup', error);
        return {error};
    }
}

export async function dataRetentionCleanPosts(serverUrl: string, postIds: string[]) {
    if (postIds.length) {
        const batchSize = 1000;
        const deletePromises = [];
        for (let i = 0; i < postIds.length; i += batchSize) {
            const batch = postIds.slice(i, batchSize);
            deletePromises.push(
                deletePosts(serverUrl, batch),
            );
        }
        const deleteResult = await Promise.all(deletePromises);
        for (const {error} of deleteResult) {
            if (error) {
                return {error};
            }
        }
    }

    return {error: undefined};
}

// Returns cutoff time based on the policy's post_duration
function getDataRetentionPolicyCutoff(postDuration: number) {
    const periodDate = new Date();
    periodDate.setDate(periodDate.getDate() - postDuration);
    periodDate.setHours(0);
    periodDate.setMinutes(0);
    periodDate.setSeconds(0);
    return periodDate.getTime();
}

export async function setLastServerVersionCheck(serverUrl: string, reset = false) {
    try {
        const {operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        await operator.handleSystem({
            systems: [{
                id: SYSTEM_IDENTIFIERS.LAST_SERVER_VERSION_CHECK,
                value: reset ? 0 : Date.now(),
            }],
            prepareRecordsOnly: false,
        });
        return {error: undefined};
    } catch (error) {
        logError('setLastServerVersionCheck', error);
        return {error};
    }
}

export async function setGlobalThreadsTab(serverUrl: string, globalThreadsTab: GlobalThreadsTab) {
    try {
        const {operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        await operator.handleSystem({
            systems: [{
                id: SYSTEM_IDENTIFIERS.GLOBAL_THREADS_TAB,
                value: globalThreadsTab,
            }],
            prepareRecordsOnly: false,
        });
        return {error: undefined};
    } catch (error) {
        logError('setGlobalThreadsTab', error);
        return {error};
    }
}

export async function dismissAnnouncement(serverUrl: string, announcementText: string) {
    try {
        const {operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        await operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.LAST_DISMISSED_BANNER, value: announcementText}], prepareRecordsOnly: false});
        return {error: undefined};
    } catch (error) {
        logError('An error occurred while dismissing an announcement', error);
        return {error};
    }
}

export async function expiredBoRPostCleanup(serverUrl: string) {
    try {
        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const lastRunAt = await getLastBoRPostCleanupRun(database);

        const shouldRunNow = (Date.now() - lastRunAt) > BOR_POST_CLEANUP_MIN_RUN_INTERVAL;

        if (!shouldRunNow) {
            return;
        }

        const {error} = await removeExpiredBoRPosts(serverUrl);
        if (!error) {
            await updateLastBoRCleanupRun(serverUrl);
        }
    } catch (error) {
        logError('An error occurred running the Burn on Read cleanup task', error);
    }
}

async function removeExpiredBoRPosts(serverUrl: string) {
    try {
        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const allBoRPosts = await queryPostsByType(database, PostTypes.BURN_ON_READ).fetch();
        const expiredBoRPostIDs = allBoRPosts.
            filter((post) => isExpiredBoRPost(post)).
            map((post) => post.id);

        await dataRetentionCleanPosts(serverUrl, expiredBoRPostIDs);
        return {error: undefined};
    } catch (error) {
        logError('An error occurred while performing BoR post cleanup', error);
        return {error};
    }
}

async function updateLastBoRCleanupRun(serverUrl: string) {
    try {
        const {operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);

        const systems: IdValue[] = [{
            id: SYSTEM_IDENTIFIERS.LAST_BOR_POST_CLEANUP_RUN,
            value: Date.now(),
        }];

        return operator.handleSystem({systems, prepareRecordsOnly: false});
    } catch (error) {
        logError('Failed updateLastBoRCleanupRun', error);
        return {error};
    }
}
