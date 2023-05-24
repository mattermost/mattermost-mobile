// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {field, immutableRelation} from '@nozbe/watermelondb/decorators';
import Model, {type Associations} from '@nozbe/watermelondb/Model';

import {MM_TABLES} from '@constants/database';

import type {Relation} from '@nozbe/watermelondb';
import type ChannelModel from '@typings/database/models/servers/channel';
import type GroupModel from '@typings/database/models/servers/group';
import type GroupChannelInterface from '@typings/database/models/servers/group_channel';

const {CHANNEL, GROUP, GROUP_CHANNEL} = MM_TABLES.SERVER;

/**
 * The GroupChannel model represents the 'association table' where many groups have channels and many channels are in
 * groups (relationship type N:N)
 */
export default class GroupChannelModel extends Model implements GroupChannelInterface {
    /** table (name) : GroupChannel */
    static table = GROUP_CHANNEL;

    /** associations : Describes every relationship to this table. */
    static associations: Associations = {

        /** A GroupChannel belongs to a Group */
        [GROUP]: {type: 'belongs_to', key: 'group_id'},

        /** A GroupChannel has a Channel */
        [CHANNEL]: {type: 'belongs_to', key: 'channel_id'},
    };

    /** group_id : The foreign key to the related Group record */
    @field('group_id') groupId!: string;

    /** channel_id : The foreign key to the related Channel record */
    @field('channel_id') channelId!: string;

    /** created_at : The creation date for this row */
    @field('created_at') createdAt!: number;

    /** updated_at : The update date for this row */
    @field('updated_at') updatedAt!: number;

    /** deleted_at : The delete date for this row */
    @field('deleted_at') deletedAt!: number;

    /** group : The related group */
    @immutableRelation(GROUP, 'group_id') group!: Relation<GroupModel>;

    /** channel : The related channel */
    @immutableRelation(CHANNEL, 'channel_id') channel!: Relation<ChannelModel>;
}
