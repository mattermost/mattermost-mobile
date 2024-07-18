// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import type ChannelModel from './channel';
import type FileModel from './file';
import type UserModel from './user';
import type {Model, Relation} from '@nozbe/watermelondb';
import type {Associations} from '@nozbe/watermelondb/Model';

/**
 * ChannelBookmark the bookmarks for a specific channel.
 */
declare class ChannelBookmarkModel extends Model {
    /** table (name) : ChannelBookmark */
    static table: string;

    /** associations : Describes every relationship to this table. */
    static associations: Associations;

    /** create_at : The creation date for this channel bookmark */
    createAt: number;

    /** update_at : The timestamp to when this channel bookmark was last updated on the server */
    updateAt: number;

    /** delete_at : The deletion/archived date of this channel bookmark */
    deleteAt: number;

    /** channel_id : The channel to which this channel bookmark belongs. */
    channelId: string;

    /** owner_id : The user who created this channel bookmark */
    ownerId: string;

    /** file_id : The file that was bookmarked if of type file */
    fileId?: string;

    /** display_name : The channel bookmark display name (e.g. Important Document ) */
    displayName: string;

    /** sort_order : The channel bookmark sort order */
    sortOrder: number;

    /** link_url : The channel bookmark url if of type link */
    linkUrl?: string;

    /** image_url : The channel bookmark image url if of type link (optional) */
    imageUrl?: string;

    /** emoji : The channel bookmark emoji (optional) */
    emoji?: string;

    /** type : The channel bookmark type it can be link or file */
    type: ChannelBookmarkType;

    /** original_id : The channel bookmark original identifier before it was edited */
    originalId?: string;

    /** parent_id : The channel bookmark parent in case is nested */
    parentId?: string;

    /** channel : The CHANNEL to which this CHANNEL BOOKMARK belongs */
    channel: Relation<ChannelModel>;

    /** owner : The USER that created this CHANNEL BOOKMARK */
    owner: Relation<UserModel>;

    /** file : The FILE attached to this CHANNEL BOOKMARK */
    file: Relation<FileModel>;

    toApi(): ChannelBookmark;
}

export default ChannelBookmarkModel;
