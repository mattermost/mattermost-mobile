// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {field, immutableRelation} from '@nozbe/watermelondb/decorators';
import Model, {type Associations} from '@nozbe/watermelondb/Model';

import {MM_TABLES} from '@constants/database';

import type {Relation} from '@nozbe/watermelondb';
import type ChannelModel from '@typings/database/models/servers/channel';
import type ChannelBookmarkInterface from '@typings/database/models/servers/channel_bookmark';
import type FileModel from '@typings/database/models/servers/file';
import type UserModel from '@typings/database/models/servers/user';

const {
    CHANNEL,
    CHANNEL_BOOKMARK,
    FILE,
    USER,
} = MM_TABLES.SERVER;

/**
 * The Channel model represents a channel in the Mattermost app.
 */
export default class ChannelBookmarkModel extends Model implements ChannelBookmarkInterface {
    /** table (name) : Channel */
    static table = CHANNEL_BOOKMARK;

    /** associations : Describes every relationship to this table. */
    static associations: Associations = {

        /** A CHANNEL can be associated to CHANNEL_BOOKMARK (relationship is 1:N) */
        [CHANNEL]: {type: 'belongs_to', key: 'channel_id'},

        /** A USER can create multiple CHANNEL_BOOKMARK (relationship is 1:N) */
        [USER]: {type: 'belongs_to', key: 'owner_id'},

        /** A FILE is associated with one CHANNEL_BOOKMARK**/
        [FILE]: {type: 'has_many', foreignKey: 'file_id'},

    };

    /** create_at : The creation date for this channel bookmark */
    @field('create_at') createAt!: number;

    /** update_at : The timestamp to when this channel bookmark was last updated on the server */
    @field('update_at') updateAt!: number;

    /** delete_at : The deletion/archived date of this channel bookmark */
    @field('delete_at') deleteAt!: number;

    /** channel_id : The channel to which this bookmarks belongs */
    @field('channel_id') channelId!: string;

    /** owner_id : The user who created this channel bookmark */
    @field('owner_id') ownerId!: string;

    /** file_id : The file attached this channel bookmark */
    @field('file_id') fileId?: string;

    /** display_name : The channel bookmark display name (e.g. Important document ) */
    @field('display_name') displayName!: string;

    /** sort_order : the order in which the bookmark is displayed in the UI. */
    @field('sort_order') sortOrder!: number;

    /** link_url : The channel bookmark url if of type link */
    @field('link_url') linkUrl?: string;

    /** image_url : The channel bookmark image url if of type link (optional) */
    @field('image_url') imageUrl?: string;

    /** emoji : The channel bookmark emoji (optional) */
    @field('emoji') emoji?: string;

    /** type : The channel bookmark type it can be link or file */
    @field('type') type!: ChannelBookmarkType;

    /** original_id : The channel bookmark original identifier before it was edited */
    @field('original_id') originalId?: string;

    /** parent_id : The channel bookmark parent in case is nested */
    @field('parent_id') parentId?: string;

    /** channel : The CHANNEL to which this CHANNEL_BOOKMARK belongs */
    @immutableRelation(CHANNEL, 'channel_id') channel!: Relation<ChannelModel>;

    /** creator : The USER who created this CHANNEL_BOOKMARK */
    @immutableRelation(USER, 'owner_id') owner!: Relation<UserModel>;

    /** file : The FILE attached to this CHANNEL_BOOKMARK */
    @immutableRelation(FILE, 'file_id') file!: Relation<FileModel>;

    toApi = () => {
        const b: ChannelBookmark = {
            id: this.id,
            create_at: this.createAt,
            update_at: this.updateAt,
            delete_at: this.deleteAt,
            channel_id: this.channelId,
            owner_id: this.ownerId,
            file_id: this.fileId,
            display_name: this.displayName,
            sort_order: this.sortOrder,
            link_url: this.linkUrl,
            image_url: this.imageUrl,
            emoji: this.emoji,
            type: this.type,
            original_id: this.originalId,
            parent_id: this.parentId,
        };

        return b;
    };
}
