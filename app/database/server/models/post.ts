// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import Model, {Associations} from '@nozbe/watermelondb/Model';
import {children, field, immutableRelation, json} from '@nozbe/watermelondb/decorators';

import {MM_TABLES} from '@constants/database';
import Channel from '@typings/database/channel';
import Draft from '@typings/database/draft';
import File from '@typings/database/file';
import PostInThread from '@typings/database/posts_in_thread';
import PostMetadata from '@typings/database/post_metadata';
import Reaction from '@typings/database/reaction';
import User from '@typings/database/user';

const {CHANNEL, DRAFT, FILE, POST, POSTS_IN_THREAD, POST_METADATA, REACTION, USER} = MM_TABLES.SERVER;

/**
 * The Post model is the building block of communication in the Mattermost app.
 */
export default class Post extends Model {
    /** table (entity name) : Post */
    static table = POST;

    constructor() {
        super();
        this.channelId = '';
        this.createAt = 0;
        this.deleteAt = 0;
        this.editAt = 0;
        this.isPinned = false;
        this.message = '';
        this.originalId = '';
        this.pendingPostId = '';
        this.previousPostId = '';
        this.rootId = '';
        this.type = '';
        this.userId = '';
        this.props = '';
        this.drafts = {} as Draft;
        this.files = {} as File;
        this.postsInThread = {} as PostInThread;
        this.metadata = {} as PostMetadata;
        this.reactions = {} as Reaction;
        this.author = {} as User;
        this.channel = {} as Channel;
    }

    /** associations : Describes every relationship to this entity. */
    static associations: Associations = {

        /** A CHANNEL can have multiple POST. (relationship is 1:N) */
        [CHANNEL]: {type: 'belongs_to', key: 'channel_id'},

        /** A POST can have multiple DRAFT. (relationship is 1:N) */
        [DRAFT]: {type: 'has_many', foreignKey: 'root_id'},

        /** A POST can have multiple FILE.  (relationship is 1:N)*/
        [FILE]: {type: 'has_many', foreignKey: 'post_id'},

        /** A POST can have multiple POSTS_IN_THREAD. (relationship is 1:N)*/
        [POSTS_IN_THREAD]: {type: 'has_many', foreignKey: 'post_id'},

        /** A POST can have multiple POST_METADATA. (relationship is 1:N)*/
        [POST_METADATA]: {type: 'has_many', foreignKey: 'post_id'},

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

    /** edit_at : The timestamp to when this post was last edited */
    @field('edit_at') editAt!: number;

    /** is_pinned : A Boolean flag indicating if this Post is pinned */
    @field('is_pinned') isPinned!: boolean;

    /** message : Message in the post */
    @field('message') message!: string;

    /** original_id : Any post will have this value empty unless it is updated */
    @field('original_id') originalId!: string;

    /** pending_post_id : The id given to a post before it is published on the server */
    @field('pending_post_id') pendingPostId!: string;

    /** previous_post_id : Id of the previous post.  If this value is empty, this implies that it is not in the db and we will request it from server */
    @field('previous_post_id') previousPostId!: string;

    /** root_id : Used in threads. All posts under a thread will have this id in common */
    @field('root_id') rootId!: string;

    /** type : Type of props (e.g. system message) */
    @field('type') type!: string;

    /** user_id : The foreign key of the User who authored this post. */
    @field('user_id') userId!: string;

    /** props : Additional attributes for this props */
    @json('props', (rawJson) => rawJson) props!: string;

    /** drafts  : Every drafts associated with this Post */
    @children(DRAFT) drafts!: Draft;

    /** files: All the files associated with this Post */
    @children(FILE) files!: File;

    /** postsInThread: Every posts associated to a thread */
    @children(POSTS_IN_THREAD) postsInThread!: PostInThread;

    /** metadata: All the extra data associated with this Post */
    @children(POST_METADATA) metadata!: PostMetadata;

    /** reactions: All the reactions associated with this Post */
    @children(REACTION) reactions!: Reaction;

    /** author: The author of this Post */
    @immutableRelation(USER, 'user_id') author!: User;

    /** channel: The channel which is presenting this Post */
    @immutableRelation(CHANNEL, 'channel_id') channel!: Channel;
}
