// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Query, Relation} from '@nozbe/watermelondb';
import {children, field, immutableRelation} from '@nozbe/watermelondb/decorators';
import Model, {Associations} from '@nozbe/watermelondb/Model';

import {MM_TABLES} from '@constants/database';

import type PostModel from '@typings/database/models/servers/post';
import type ThreadParticipantsModel from '@typings/database/models/servers/thread_participant';

const {POST, TEAM, THREAD, THREAD_PARTICIPANT} = MM_TABLES.SERVER;

/**
 * The Thread model contains thread information of a post.
 */
export default class ThreadModel extends Model {
    /** table (name) : Thread */
    static table = THREAD;

    /** associations : Describes every relationship to this table. */
    static associations: Associations = {

        /** A THREAD is associated to one POST (relationship is 1:1) */
        [POST]: {type: 'has_many', foreignKey: 'id'},

        /** A POST can have multiple THREAD_PARTICIPANT. (relationship is 1:N)*/
        [THREAD_PARTICIPANT]: {type: 'has_many', foreignKey: 'thread_id'},

        /** A TEAM can have multiple THREAD. (relationship is 1:N) */
        [TEAM]: {type: 'belongs_to', key: 'team_id'},
    };

    /** last_reply_at : The timestamp of when user last replied to the thread. */
    @field('last_reply_at') lastReplyAt!: number;

    /** last_viewed_at : The timestamp of when user last viewed the thread. */
    @field('last_viewed_at') lastViewedAt!: number;

    /** reply_count : The total replies to the thread by all the participants. */
    @field('reply_count') replyCount!: number;

    /** is_following: If user is following the thread or not */
    @field('is_following') isFollowing!: boolean;

    /** unread_replies : The number of replies that are not read by the user. */
    @field('unread_replies') unreadReplies!: number;

    /** unread_mentions : The number of mentions that are not read by the user. */
    @field('unread_mentions') unreadMentions!: number;

    /** reactions : All the reactions associated with this Post */
    @children(THREAD_PARTICIPANT) participants!: Query<ThreadParticipantsModel>;

    /** channel : The channel which is presenting this Post */
    @immutableRelation(POST, 'id') post!: Relation<PostModel>;

    async destroyPermanently() {
        await this.participants.destroyAllPermanently();
        super.destroyPermanently();
    }
}
