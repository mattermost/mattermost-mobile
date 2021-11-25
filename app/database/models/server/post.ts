// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Q, Query, Relation} from '@nozbe/watermelondb';
import {children, field, immutableRelation, json, lazy} from '@nozbe/watermelondb/decorators';
import Model, {Associations} from '@nozbe/watermelondb/Model';

import {MM_TABLES} from '@constants/database';
import {safeParseJSON} from '@utils/helpers';

import type ChannelModel from '@typings/database/models/servers/channel';
import type DraftModel from '@typings/database/models/servers/draft';
import type FileModel from '@typings/database/models/servers/file';
import type PostInThreadModel from '@typings/database/models/servers/posts_in_thread';
import type ReactionModel from '@typings/database/models/servers/reaction';
import type UserModel from '@typings/database/models/servers/user';

const {CHANNEL, DRAFT, FILE, POST, POSTS_IN_THREAD, REACTION, USER} = MM_TABLES.SERVER;

/**
 * The Post model is the building block of communication in the Mattermost app.
 */
export default class PostModel extends Model {
    /** table (name) : Post */
    static table = POST;

    /** associations : Describes every relationship to this table. */
    static associations: Associations = {

        /** A CHANNEL can have multiple POST. (relationship is 1:N) */
        [CHANNEL]: {type: 'belongs_to', key: 'channel_id'},

        /** A POST can have multiple DRAFT. (relationship is 1:N) */
        [DRAFT]: {type: 'has_many', foreignKey: 'root_id'},

        /** A POST can have multiple FILE.  (relationship is 1:N)*/
        [FILE]: {type: 'has_many', foreignKey: 'post_id'},

        /** A POST can have multiple POSTS_IN_THREAD. (relationship is 1:N)*/
        [POSTS_IN_THREAD]: {type: 'has_many', foreignKey: 'root_id'},

        /** A POST can have multiple REACTION. (relationship is 1:N)*/
        [REACTION]: {type: 'has_many', foreignKey: 'post_id'},

        /** A USER can have multiple POST.  A user can author several posts. (relationship is 1:N)*/
        [USER]: {type: 'belongs_to', key: 'user_id'},
    };

    /** channel_id : The foreign key for the Channel to which this post belongs to. */
    @field('channel_id') channelId!: string;

    /** create_at : The timestamp to when this post was first created */
    @field('create_at') createAt!: number;

    /** delete_at : The timestamp to when this post was last archived/deleted */
    @field('delete_at') deleteAt!: number;

    /** update_at : The timestamp to when this post was last updated on the server */
    @field('update_at') updateAt!: number;

    /** edit_at : The timestamp to when this post was last edited */
    @field('edit_at') editAt!: number;

    /** is_pinned : A Boolean flag indicating if this Post is pinned */
    @field('is_pinned') isPinned!: boolean;

    /** message : Message in the post */
    @field('message') message!: string;

    /** metadata: All the extra data associated with this Post */
    @json('metadata', safeParseJSON) metadata!: PostMetadata | null;

    /** original_id : Any post will have this value empty unless it is updated */
    @field('original_id') originalId!: string;

    /** pending_post_id : The id given to a post before it is published on the server */
    @field('pending_post_id') pendingPostId!: string;

    /** previous_post_id : Id of the previous post.  If this value is empty, this implies that it is not in the db and we will request it from server */
    @field('previous_post_id') previousPostId!: string;

    /** root_id : Used in threads. All posts under a thread will have this id in common */
    @field('root_id') rootId!: string;

    /** type : Type of props (e.g. system message) */
    @field('type') type!: PostType;

    /** user_id : The foreign key of the User who authored this post. */
    @field('user_id') userId!: string;

    /** props : Additional attributes for this props */
    @json('props', safeParseJSON) props!: any;

    // A draft can be associated with this post for as long as this post is a parent post
    @lazy draft = this.collections.get(DRAFT).query(Q.on(POST, 'id', this.id)) as Query<DraftModel>;

    @lazy root = this.collection.query(Q.where('id', this.rootId)) as Query<PostModel>;

    /** postsInThread: The thread to which this post is associated */
    @lazy postsInThread = this.collections.get(POSTS_IN_THREAD).query(
        Q.where('root_id', this.rootId || this.id),
        Q.sortBy('latest', Q.desc),
        Q.take(1),
    ) as Query<PostInThreadModel>;

    /** files: All the files associated with this Post */
    @children(FILE) files!: Query<FileModel>;

    /** reactions: All the reactions associated with this Post */
    @children(REACTION) reactions!: Query<ReactionModel>;

    /** author: The author of this Post */
    @immutableRelation(USER, 'user_id') author!: Relation<UserModel>;

    /** channel: The channel which is presenting this Post */
    @immutableRelation(CHANNEL, 'channel_id') channel!: Relation<ChannelModel>;

    async destroyPermanently() {
        await this.reactions.destroyAllPermanently();
        await this.files.destroyAllPermanently();
        await this.draft.destroyAllPermanently();
        await this.collections.get(POSTS_IN_THREAD).query(
            Q.where('root_id', this.id),
        ).destroyAllPermanently();
        super.destroyPermanently();
    }
}
