// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Q} from '@nozbe/watermelondb';
import deepEqual from 'deep-equal';

import {MM_TABLES, SYSTEM_IDENTIFIERS} from '@constants/database';
import DatabaseManager from '@database/manager';
import {getServerCredentials} from '@init/credentials';
import {queryAllChannelsForTeam} from '@queries/servers/channel';
import {getConfig, getLicense, getGlobalDataRetentionPolicy, getGranularDataRetentionPolicies, getLastGlobalDataRetentionRun} from '@queries/servers/system';
import {logError} from '@utils/log';

import type PostModel from '@typings/database/models/servers/post';

const {SERVER: {DRAFT, FILE, POST, POSTS_IN_THREAD, REACTION, THREAD, THREAD_PARTICIPANT, THREADS_IN_TEAM}} = MM_TABLES;

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
            }

            await storeConfig(serverUrl, config);
        }
    } catch (error) {
        logError('An error occurred while saving config & license', error);
    }
}

export async function storeConfig(serverUrl: string, config: ClientConfig | undefined, prepareRecordsOnly = false) {
    if (!config) {
        return [];
    }
    const {operator, database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
    const currentConfig = await getConfig(database);
    const configsToUpdate: IdValue[] = [];
    const configsToDelete: IdValue[] = [];

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
        return operator.handleConfigs({configs: configsToUpdate, configsToDelete, prepareRecordsOnly});
    }
    return [];
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
        for (let i = 0; i < teamPolicies.length; i++) {
            const {team_id, post_duration} = teamPolicies[i];
            // eslint-disable-next-line no-await-in-loop
            const channels = await queryAllChannelsForTeam(database, team_id).fetch();
            if (channels.length) {
                const cutoff = getDataRetentionPolicyCutoff(post_duration);
                channels.forEach((channel) => {
                    channelsCutoffs[channel.id] = cutoff;
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

        const posts = await database.get<PostModel>(POST).query(
            Q.unsafeSqlQuery(`SELECT * FROM ${POST} where ${conditions.join(' OR ')}`),
        ).fetchIds();

        if (posts.length) {
            const postsFormatted = `'${posts.join("','")}'`;

            await database.write(() => {
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                return database.adapter.unsafeExecute({
                    sqls: [
                        [`DELETE FROM ${POST} where id IN (${postsFormatted})`, []],
                        [`DELETE FROM ${REACTION} where post_id IN (${postsFormatted})`, []],
                        [`DELETE FROM ${FILE} where post_id IN (${postsFormatted})`, []],
                        [`DELETE FROM ${DRAFT} where root_id IN (${postsFormatted})`, []],

                        [`DELETE FROM ${POSTS_IN_THREAD} where root_id IN (${postsFormatted})`, []],

                        [`DELETE FROM ${THREAD} where id IN (${postsFormatted})`, []],
                        [`DELETE FROM ${THREAD_PARTICIPANT} where thread_id IN (${postsFormatted})`, []],
                        [`DELETE FROM ${THREADS_IN_TEAM} where thread_id IN (${postsFormatted})`, []],
                    ],
                });
            });
        }

        await updateLastDataRetentionRun(serverUrl);

        return {error: undefined};
    } catch (error) {
        logError('An error occurred while performing data retention cleanup', error);
        return {error};
    }
}

// Returns cutoff time based on the policy's post_duration
function getDataRetentionPolicyCutoff(postDuration: number) {
    const periodDate = new Date();
    periodDate.setDate(periodDate.getDate() - postDuration);
    return periodDate.getTime();
}
