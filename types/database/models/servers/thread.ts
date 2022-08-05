// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import type PostModel from './post';
import type ThreadInTeamModel from './thread_in_team';
import type ThreadParticipantsModel from './thread_participant';
import type {Query, Relation, Model} from '@nozbe/watermelondb';
import type {Associations} from '@nozbe/watermelondb/Model';

/**
 * The Thread model contains thread information of a post.
 */
declare class ThreadModel extends Model {
    /** table (name) : Thread */
    static table: string;

    /** associations : Describes every relationship to this table. */
    static associations: Associations;

    /** lastReplyAt : The timestamp of when user last replied to the thread. */
    lastReplyAt: number;

    /** last_last_fetched_at_at : The timestamp when we successfully last fetched post on this channel */
    lastFetchedAt: number;

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

    /** viewed_at : The timestamp showing when the user's last opened this thread (this is used for the new line message indicator) */
    viewedAt: number;

    /** participants: All the participants of the thread */
    participants: Query<ThreadParticipantsModel>;

    /** threadsInTeam : All the threadsInTeam associated with this Thread */
    threadsInTeam: Query<ThreadInTeamModel>;

    /** post : Query returning the post data for the current thread */
    post: Relation<PostModel>;
}

export default ThreadModel;
