// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {lazy} from '@nozbe/watermelondb/decorators';

import type ChannelModel from './channel';
import type TeamModel from './team';
import type UserModel from './user';
import type {Query, Model} from '@nozbe/watermelondb';
import type {Associations} from '@nozbe/watermelondb/Model';

/**
 * A Group is a collection of users, associated to teams and/or channels
 */
declare class GroupModel extends Model {
    /** table (name) : Group */
    static table: string;

    /** associations : Describes every relationship to this table. */
    static associations: Associations;

    /** name : The name of the group */
    name: string;

    /** display_name : The display name for the group */
    displayName: string;

    /** description : A short description of the group */
    description: string;

    /** source : The source of the group */
    source: string;

    /** remote_id : The remote_id of the group */
    remoteId: string;

    /** created_at : The timestamp for when it was created */
    createdAt: number;

    /** updated_at : The timestamp for when it was updated */
    updatedAt: number;

    /** deleted_at : The timestamp for when it was deleted */
    deletedAt: number;

    /** member_count : The number of members in the group */
    memberCount: number;

    /** channels : All the channels associated with this group */
    @lazy channels: Query<ChannelModel>;

    /** teams : All the teams associated with this group */
    @lazy teams: Query<TeamModel>;

    /** members : All the members (users) of this group */
    @lazy members: Query<UserModel>;
}

export default GroupModel;
