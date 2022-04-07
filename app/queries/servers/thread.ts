// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Database, Q, Query} from '@nozbe/watermelondb';
import {combineLatest, of as of$} from 'rxjs';
import {map, switchMap} from 'rxjs/operators';

import {Preferences} from '@constants';
import {MM_TABLES} from '@constants/database';
import {isCRTEnabled} from '@utils/thread';

import {queryPreferencesByCategoryAndName} from './preference';
import {getConfig, observeConfig} from './system';

import type ServerDataOperator from '@database/operator/server_data_operator';
import type Model from '@nozbe/watermelondb/Model';
import type ThreadModel from '@typings/database/models/servers/thread';

const {SERVER: {CHANNEL, POST, THREAD}} = MM_TABLES;

export const getIsCRTEnabled = async (database: Database): Promise<boolean> => {
    const config = await getConfig(database);
    const preferences = await queryPreferencesByCategoryAndName(database, Preferences.CATEGORY_DISPLAY_SETTINGS).fetch();
    return isCRTEnabled(preferences, config);
};

export const getThreadById = async (database: Database, threadId: string) => {
    try {
        const thread = await database.get<ThreadModel>(THREAD).find(threadId);
        return thread;
    } catch {
        return undefined;
    }
};

export const observeIsCRTEnabled = (database: Database) => {
    getConfig(database);
    const config = observeConfig(database);
    const preferences = queryPreferencesByCategoryAndName(database, Preferences.CATEGORY_DISPLAY_SETTINGS).observe();
    return combineLatest([config, preferences]).pipe(
        map(
            ([cfg, prefs]) => isCRTEnabled(prefs, cfg),
        ),
    );
};

export const observeThreadById = (database: Database, threadId: string) => {
    return database.get<ThreadModel>(THREAD).query(
        Q.where('id', threadId),
    ).observe().pipe(
        switchMap((threads) => threads[0]?.observe() || of$(undefined)),
    );
};

export const observeUnreadsAndMentionsInTeam = (database: Database, teamId: string) => {
    return queryThreadsInTeam(database, teamId, true).observeWithColumns(['unread_replies', 'unread_mentions']).pipe(
        switchMap((threads) => {
            let unreads = 0;
            let mentions = 0;
            threads.forEach((thread) => {
                unreads += thread.unreadReplies;
                mentions += thread.unreadMentions;
            });
            return of$({unreads, mentions});
        }),
    );
};

// On receiving "posts", Save the "root posts" as "threads"
export const prepareThreadsFromReceivedPosts = async (operator: ServerDataOperator, posts: Post[]) => {
    const models: Model[] = [];
    const threads: Thread[] = [];
    posts.forEach((post: Post) => {
        if (!post.root_id && post.type === '') {
            threads.push({
                id: post.id,
                participants: post.participants,
                reply_count: post.reply_count,
                last_reply_at: post.last_reply_at,
                is_following: post.is_following,
            } as Thread);
        }
    });
    if (threads.length) {
        const threadModels = await operator.handleThreads({threads, prepareRecordsOnly: true});
        models.push(...threadModels);
    }

    return models;
};

export const queryThreadsInTeam = (database: Database, teamId: string, onlyUnreads?: boolean, hasReplies?: boolean, isFollowing?: boolean, sort?: boolean): Query<ThreadModel> => {
    const query: Q.Clause[] = [
        Q.experimentalNestedJoin(POST, CHANNEL),
    ];

    if (isFollowing) {
        query.push(Q.where('is_following', true));
    }

    if (hasReplies) {
        query.push(Q.where('reply_count', Q.gt(0)));
    }

    if (onlyUnreads) {
        query.push(Q.where('unread_replies', Q.gt(0)));
    }

    if (sort) {
        query.push(Q.sortBy('last_reply_at', Q.desc));
    }

    query.push(
        Q.on(
            POST,
            Q.on(
                CHANNEL,
                Q.or(
                    Q.where('team_id', teamId),
                    Q.where('team_id', ''),
                ),
            ),
        ),
    );

    return database.get<ThreadModel>(THREAD).query(...query);
};
