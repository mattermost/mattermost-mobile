// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Relation} from '@nozbe/watermelondb';
import Model, {Associations} from '@nozbe/watermelondb/Model';

import type ChannelModel from './channel';
import type GroupModel from './group';

/**
 * The GroupChannel model represents the 'association table' where many groups have channels and many channels are in
 * groups (relationship type N:N)
 */
export default class GroupChannelModel extends Model {
    /** table (name) : GroupChannel */
    static table: string;

    /** associations : Describes every relationship to this table. */
    static associations: Associations;

    /** group_id : The foreign key to the related Group record */
    groupId: string;

    /* channel_id : The foreign key to the related User record*/
    channelId: string;

    /** created_at : The timestamp for when it was created */
    createdAt: number;

    /** updated_at : The timestamp for when it was updated */
    updatedAt: number;

    /** deleted_at : The timestamp for when it was deleted */
    deletedAt: number;

    /** group : The related group */
    group: Relation<GroupModel>;

    /** channel : The related channel */
    channel: Relation<ChannelModel>;
}
