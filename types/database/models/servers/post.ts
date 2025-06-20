// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import type ChannelModel from './channel';
import type DraftModel from './draft';
import type FileModel from './file';
import type PostsInThreadModel from './posts_in_thread';
import type ReactionModel from './reaction';
import type ThreadModel from './thread';
import type UserModel from './user';
import type {Query, Relation, Model} from '@nozbe/watermelondb';
import type {Associations} from '@nozbe/watermelondb/Model';

/**
 * The Post model is the building block of communication in the Mattermost app.
 */
declare class PostModel extends Model {
    /** table (name) : Post */
    static table: string;

    /** associations : Describes every relationship to this table. */
    static associations: Associations;

    /** channel_id : The foreign key for the Channel to which this post belongs to. */
    channelId: string;

    /** create_at : The timestamp to when this post was first created */
    createAt: number;

    /** delete_at : The timestamp to when this post was last archived/deleted */
    deleteAt: number;

    /** update_at : The timestamp to when this post was last updated on the server */
    updateAt: number;

    /** edit_at : The timestamp to when this post was last edited */
    editAt: number;

    /** is_pinned : A Boolean flag indicating if this Post is pinned */
    isPinned: boolean;

    /** message : Message in the post */
    message: string;

    /** messageSource : will contain the message as submitted by the user if Message has been modified
	by Mattermost for presentation (e.g if an image proxy is being used). It should be used to
	populate edit boxes if present. */
    messageSource: string;

    /** metadata: All the extra data associated with this Post */
    metadata: PostMetadata | null;

    /** original_id : Any post will have this value empty unless it is updated */
    originalId: string;

    /** pending_post_id : The id given to a post before it is published on the server */
    pendingPostId: string;

    /** previous_post_id : Id of the previous post.  If this value is empty, this implies that it is not in the db and we will request it from server */
    previousPostId: string;

    root: Query<PostModel>;

    /** root_id : Used in threads. All posts under a thread will have this id in common */
    rootId: string;

    /** type : Type of props (e.g. system message) */
    type: PostType;

    /** user_id : The foreign key of the User who authored this post. */
    userId: string;

    /** props : Additional attributes for this props */
    props: Record<string, unknown> | null;

    /** drafts  : Every draft associated with this Post */
    drafts: Query<DraftModel>;

    /** files: All the files associated with this Post */
    files: Query<FileModel>;

    /** postsInThread: Every posts associated to a thread */
    postsInThread: Query<PostsInThreadModel>;

    /** reactions: All the reactions associated with this Post */
    reactions: Query<ReactionModel>;

    /** author: The author of this Post */
    author: Relation<UserModel>;

    /** channel: The channel which is presenting this Post */
    channel: Relation<ChannelModel>;

    /** thread : the related thread for the post */
    thread: Relation<ThreadModel>;

    /** hasReplies: Async function to determine if the post is part of a thread */
    hasReplies: () => Promise<boolean>;

    toApi: () => Promise<Post>;
}

export default PostModel;
