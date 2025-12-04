// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {chunk} from 'lodash';

import {prepareModelsForChannelPosts} from '@actions/local/post';
import {ActionType} from '@constants';
import DatabaseManager from '@database/manager';

import {fetchPostAuthors, fetchPostsForChannel} from './post';

import type {Model} from '@nozbe/watermelondb';

/**
 * processChannelPostsByTeam is to fetch posts for each channel in a team, and prepare the models for the posts.
 * Then once all the models are prepared, write them into the database all at once.
 * Writing posts channel by channel is time consuming, and has caused the UI to lock up significantly.
 * @param serverUrl string the server URL
 * @param channelIds string[]
 * @param skipAuthors boolean
 * @param groupLabel string
 * @param isCRTEnabled boolean
 */
export async function processChannelPostsByTeam(
    serverUrl: string,
    channelIds: string[],
    skipAuthors = false,
    groupLabel?: RequestGroupLabel,
    isCRTEnabled = false,
): Promise<void> {
    const prepareModelsPromises: Array<Promise<Model[]>> = [];
    const allPosts: Post[] = [];

    const chunks = chunk(channelIds, 10);
    for await (const channelIdsChunk of chunks) {
        const channelPromises = channelIdsChunk.map((channelId) =>

            // hard-coding true for skipAuthors because we want to fetch authors
            // and upsert later to avoid unique constraint errors
            fetchPostsForChannel(serverUrl, channelId, true, true, groupLabel),
        );
        const chunkResults = await Promise.allSettled(channelPromises);

        for (const [i, result] of chunkResults.entries()) {
            if (result.status === 'fulfilled') {
                const {posts, order, previousPostId, authors} = result.value;
                if (posts?.length) {
                    const channelId = channelIdsChunk[i];
                    allPosts.push(...posts);
                    prepareModelsPromises.push(
                        prepareModelsForChannelPosts(
                            serverUrl,
                            channelId,
                            posts,
                            ActionType.POSTS.RECEIVED_IN_CHANNEL,
                            order || [],
                            previousPostId || '',
                            authors || [],
                            isCRTEnabled,
                        ),
                    );
                }
            }
        }
    }

    if (prepareModelsPromises.length) {
        const {operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);

        const models = await Promise.all(prepareModelsPromises);
        operator.batchRecords(models.flat(), 'processTeamChannels');
    }
    if (!skipAuthors && allPosts.length) {
        await fetchPostAuthors(serverUrl, allPosts, false, groupLabel);
    }
}
