// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {children, field, immutableRelation} from '@nozbe/watermelondb/decorators';
import Model, {type Associations} from '@nozbe/watermelondb/Model';

import {MM_TABLES} from '@constants/database';

import type {Query, Relation} from '@nozbe/watermelondb';
import type PostModel from '@typings/database/models/servers/post';
import type ThreadModelInterface from '@typings/database/models/servers/thread';
import type ThreadInTeamModel from '@typings/database/models/servers/thread_in_team';
import type ThreadParticipantModel from '@typings/database/models/servers/thread_participant';

const {POST, THREAD, THREAD_PARTICIPANT, THREADS_IN_TEAM} = MM_TABLES.SERVER;

/**
 * The Thread model contains thread information of a post.
 */
export default class ThreadModel extends Model implements ThreadModelInterface {
    /** table (name) : Thread */
    static table = THREAD;

    /** associations : Describes every relationship to this table. */
    static associations: Associations = {

        /** A THREAD is associated to one POST (relationship is 1:1) */
        [POST]: {type: 'belongs_to', key: 'id'},

        /** A THREAD can have multiple THREAD_PARTICIPANT. (relationship is 1:N)*/
        [THREAD_PARTICIPANT]: {type: 'has_many', foreignKey: 'thread_id'},

        /** A THREAD can have multiple THREADS_IN_TEAM. (relationship is 1:N)*/
        [THREADS_IN_TEAM]: {type: 'has_many', foreignKey: 'thread_id'},
    };

    /** last_reply_at : The timestamp of when user last replied to the thread. */
    @field('last_reply_at') lastReplyAt!: number;

    /** last_last_fetched_at_at : The timestamp when we successfully last fetched post on this thread */
    @field('last_fetched_at') lastFetchedAt!: number;

    /** last_viewed_at : The timestamp of when user last viewed the thread. */
    @field('last_viewed_at') lastViewedAt!: number;

    /** reply_count : The total replies to the thread by all the participants. */
    @field('reply_count') replyCount!: number;

    /** is_following: If user is following the thread or not */
    @field('is_following') isFollowing!: boolean;

    /** unread_replies : The number of replies that have not been read by the user. */
    @field('unread_replies') unreadReplies!: number;

    /** unread_mentions : The number of mentions that have not been read by the user. */
    @field('unread_mentions') unreadMentions!: number;

    /** viewed_at : The timestamp showing when the user's last opened this thread (this is used for the new line message indicator) */
    @field('viewed_at') viewedAt!: number;

    /** participants : All the participants associated with this Thread */
    @children(THREAD_PARTICIPANT) participants!: Query<ThreadParticipantModel>;

    /** threadsInTeam : All the threadsInTeam associated with this Thread */
    @children(THREADS_IN_TEAM) threadsInTeam!: Query<ThreadInTeamModel>;

    /** post : The root post of this thread */
    @immutableRelation(POST, 'id') post!: Relation<PostModel>;
}
