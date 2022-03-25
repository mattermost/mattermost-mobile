// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Query, Relation} from '@nozbe/watermelondb';
import Model, {Associations} from '@nozbe/watermelondb/Model';

import type PostModel from './post';
import type ThreadParticipantsModel from './thread_participant';

/**
 * The Thread model contains thread information of a post.
 */
export default class ThreadModel extends Model {
    /** table (name) : Thread */
    static table: string;

    /** associations : Describes every relationship to this table. */
    static associations: Associations;

    /** lastReplyAt : The timestamp of when user last replied to the thread. */
    lastReplyAt: number;

    /** lastViewedAt : The timestamp of when user last viewed the thread. */
    lastViewedAt: number;

    /** reply_count : The total replies to the thread by all the participants. */
    replyCount: number;

    /** isFollowing: If user is following this thread or not */
    isFollowing: boolean;

    /** unread_replies : The number of replies that are not read by the user. */
    unreadReplies: number;

    /** unread_mentions : The number of mentions that are not read by the user. */
    unreadMentions: number;

    /** loaded_in_global_threads : Flag to differentiate the unread threads loaded for showing unread counts/mentions */
    loadedInGlobalThreads: boolean;

    /** participants: All the participants of the thread */
    participants: Query<ThreadParticipantsModel>;

    /** post : Query returning the post data for the current thread */
    post: Relation<PostModel>;
}
