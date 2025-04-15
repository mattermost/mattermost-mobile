// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {getPosts} from '@actions/local/post';
import {General} from '@constants';
import {SYSTEM_IDENTIFIERS} from '@constants/database';
import DatabaseManager from '@database/manager';
import NetworkManager from '@managers/network_manager';
import {prepareMissingChannelsForAllTeams} from '@queries/servers/channel';
import {getConfigValue, getCurrentTeamId} from '@queries/servers/system';
import {getIsCRTEnabled, prepareThreadsFromReceivedPosts} from '@queries/servers/thread';
import {getCurrentUser} from '@queries/servers/user';
import {getFullErrorMessage} from '@utils/errors';
import {getUtcOffsetForTimeZone} from '@utils/helpers';
import {logDebug} from '@utils/log';
import {getUserTimezone} from '@utils/user';

import {fetchPostAuthors, fetchMissingChannelsFromPosts} from './post';
import {forceLogoutIfNecessary} from './session';

import type Model from '@nozbe/watermelondb/Model';
import type ChannelModel from '@typings/database/models/servers/channel';
import type PostModel from '@typings/database/models/servers/post';

export async function fetchRecentMentions(serverUrl: string): Promise<PostSearchRequest> {
    try {
        const {database, operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const currentUser = await getCurrentUser(database);
        if (!currentUser) {
            return {
                posts: [],
                order: [],
            };
        }
        const terms = currentUser.userMentionKeys.map(({key}) => key).join(' ').trim() + ' ';
        const results = await searchPosts(serverUrl, '', {terms, is_or_search: true});
        if (results.error) {
            throw results.error;
        }

        const mentions: IdValue = {
            id: SYSTEM_IDENTIFIERS.RECENT_MENTIONS,
            value: JSON.stringify(results.order),
        };

        await operator.handleSystem({
            systems: [mentions],
            prepareRecordsOnly: false,
        });

        return results;
    } catch (error) {
        return {error};
    }
}

export const searchPosts = async (serverUrl: string, teamId: string, params: PostSearchParams): Promise<PostSearchRequest> => {
    try {
        const {database, operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const client = NetworkManager.getClient(serverUrl);
        const viewArchivedChannels = await getConfigValue(database, 'ExperimentalViewArchivedChannels');
        const user = await getCurrentUser(database);
        const timezoneOffset = getUtcOffsetForTimeZone(getUserTimezone(user)) * 60;

        let postsArray: Post[] = [];
        const data = await client.searchPostsWithParams(teamId, {
            ...params,
            include_deleted_channels: Boolean(viewArchivedChannels),
            time_zone_offset: timezoneOffset,
        });

        const posts = data.posts || {};
        const order = data.order || [];

        const promises: Array<Promise<Model[]>> = [];
        postsArray = order.map((id) => posts[id]);
        if (postsArray.length) {
            const isCRTEnabled = await getIsCRTEnabled(database);
            if (isCRTEnabled) {
                promises.push(prepareThreadsFromReceivedPosts(operator, postsArray, false));
            }

            const {authors} = await fetchPostAuthors(serverUrl, postsArray, true);
            const {channels, channelMemberships} = await fetchMissingChannelsFromPosts(serverUrl, postsArray, true);

            if (authors?.length) {
                promises.push(
                    operator.handleUsers({
                        users: authors,
                        prepareRecordsOnly: true,
                    }),
                );
            }

            if (channels?.length && channelMemberships?.length) {
                const channelPromises = prepareMissingChannelsForAllTeams(operator, channels, channelMemberships, isCRTEnabled);
                if (channelPromises.length) {
                    promises.push(...channelPromises);
                }
            }

            promises.push(
                operator.handlePosts({
                    actionType: '',
                    order: [],
                    posts: postsArray,
                    previousPostId: '',
                    prepareRecordsOnly: true,
                }),
            );
        }

        const modelArrays = await Promise.all(promises);
        const models = modelArrays.flatMap((mdls) => {
            if (!mdls || !mdls.length) {
                return [];
            }
            return mdls;
        });

        await operator.batchRecords(models, 'searchPosts');
        return {
            order,
            posts: postsArray,
            matches: data.matches,
        };
    } catch (error) {
        logDebug('error on searchPosts', getFullErrorMessage(error));
        forceLogoutIfNecessary(serverUrl, error);
        return {error};
    }
};

export const searchFiles = async (serverUrl: string, teamId: string, params: FileSearchParams, channel?: ChannelModel): Promise<{files?: FileInfo[]; channels?: string[]; error?: unknown}> => {
    try {
        let currentTeamId = teamId;
        if (channel && (channel.type === General.DM_CHANNEL || channel.type === General.GM_CHANNEL)) {
            const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
            currentTeamId = await getCurrentTeamId(database);
        }
        const client = NetworkManager.getClient(serverUrl);
        const result = await client.searchFiles(currentTeamId, params.terms, false);
        const files = result?.file_infos ? Object.values(result.file_infos) : [];
        const [allChannelIds, allPostIds] = files.reduce<[Set<string>, Set<string>]>((acc, f) => {
            if (f.channel_id) {
                acc[0].add(f.channel_id);
            }
            if (f.post_id) {
                acc[1].add(f.post_id);
            }
            return acc;
        }, [new Set<string>(), new Set<string>()]);
        const channels = Array.from(allChannelIds.values());

        // Attach the file's post's props to the FileInfo (needed for captioning videos)
        const postIds = Array.from(allPostIds);
        const posts = await getPosts(serverUrl, postIds);
        const idToPost = posts.reduce<Dictionary<PostModel>>((acc, p) => {
            acc[p.id] = p;
            return acc;
        }, {});
        files.forEach((f) => {
            if (f.post_id) {
                f.postProps = idToPost[f.post_id]?.props || {};
            }
        });
        return {files, channels};
    } catch (error) {
        logDebug('error on searchFiles', getFullErrorMessage(error));
        forceLogoutIfNecessary(serverUrl, error);
        return {error};
    }
};
