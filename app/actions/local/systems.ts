// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import deepEqual from 'deep-equal';

import {SYSTEM_IDENTIFIERS} from '@constants/database';
import DatabaseManager from '@database/manager';
import {getServerCredentials} from '@init/credentials';
import {queryAllChannelsForTeam} from '@queries/servers/channel';
import {getCommonSystemValues, getGlobalDataRetentionPolicy, getGranularDataRetentionPolicies} from '@queries/servers/system';
import {logError} from '@utils/log';

export async function storeConfigAndLicense(serverUrl: string, config: ClientConfig, license: ClientLicense) {
    try {
        // If we have credentials for this server then update the values in the database
        const credentials = await getServerCredentials(serverUrl);
        if (credentials) {
            const {operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
            const current = await getCommonSystemValues(operator.database);
            const systems: IdValue[] = [];
            if (!deepEqual(config, current.config)) {
                systems.push({
                    id: SYSTEM_IDENTIFIERS.CONFIG,
                    value: JSON.stringify(config),
                });
            }

            if (!deepEqual(license, current.license)) {
                systems.push({
                    id: SYSTEM_IDENTIFIERS.LICENSE,
                    value: JSON.stringify(license),
                });
            }

            if (systems.length) {
                await operator.handleSystem({systems, prepareRecordsOnly: false});
            }
        }
    } catch (error) {
        logError('An error occurred while saving config & license', error);
    }
}

export async function dataRetentionCleanup(serverUrl: string) {
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
                conditions.push(`(channel_id=${channelId} AND create_at < ${cutoff})`);
            }

            // Fetch posts by global cutoff which are not already fetched by channel level cutoff
            conditions.push(`(channel_id NOT IN (${channelIds.join(',')}) AND create_at < ${globalRetentionCutoff})`);
        } else {
            conditions.push(`create_at < ${globalRetentionCutoff}`);
        }

        // const query = `SELECT id from posts where ${conditions.join(' OR ')}`;
        // console.log('Query >>>>', query);
    } catch (error) {
        logError('An error occurred while performing data retention cleanup', error);
    }
}

// Returns cutoff time based on the policy's post_duration
function getDataRetentionPolicyCutoff(postDuration: number) {
    const periodDate = new Date();
    periodDate.setDate(periodDate.getDate() - postDuration);
    return periodDate.getTime();
}
