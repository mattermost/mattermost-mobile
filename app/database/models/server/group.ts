// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Q} from '@nozbe/watermelondb';
import {field, lazy} from '@nozbe/watermelondb/decorators';
import Model, {type Associations} from '@nozbe/watermelondb/Model';

import {MM_TABLES} from '@constants/database';

import type ChannelModel from '@typings/database/models/servers/channel';
import type GroupInterface from '@typings/database/models/servers/group';
import type TeamModel from '@typings/database/models/servers/team';
import type UserModel from '@typings/database/models/servers/user';

const {
    CHANNEL,
    GROUP,
    GROUP_CHANNEL,
    GROUP_TEAM,
    GROUP_MEMBERSHIP,
    TEAM,
    USER,
} = MM_TABLES.SERVER;

/**
 * A Group is a collection of users that can be associated with a team or a channel
 */
export default class GroupModel extends Model implements GroupInterface {
    /** table (name) : Group */
    static table = GROUP;

    /** associations : Describes every relationship to this table. */
    static associations: Associations = {

        /** Groups are associated with Channels (relationship N:N) through GROUP_CHANNEL */
        [GROUP_CHANNEL]: {type: 'has_many', foreignKey: 'group_id'},

        /** Groups are associated with Members (Users) (relationship N:N) through GROUP_MEMBERSHIP */
        [GROUP_MEMBERSHIP]: {type: 'has_many', foreignKey: 'group_id'},

        /** Groups are associated with Teams (relationship N:N) through GROUP_TEAM */
        [GROUP_TEAM]: {type: 'has_many', foreignKey: 'group_id'},
    };

    /** name : The name for the group */
    @field('name') name!: string;

    /** display_name : The display name for the group */
    @field('display_name') displayName!: string;

    /** description : The display name for the group */
    @field('description') description!: string;

    /** remote_id : The source for the group (i.e. custom) */
    @field('source') source!: string;

    /** remote_id : The remote id for the group (i.e. in a shared channel) */
    @field('remote_id') remoteId!: string;

    /** member_count : The number of members in the group */
    @field('member_count') memberCount!: number;

    /** created_at : The creation date for this row */
    @field('created_at') createdAt!: number;

    /** updated_at : The update date for this row */
    @field('updated_at') updatedAt!: number;

    /** deleted_at : The delete date for this row */
    @field('deleted_at') deletedAt!: number;

    /** channels : Retrieves all the channels that are associated to this group */
    @lazy channels = this.collections.
        get<ChannelModel>(CHANNEL).
        query(Q.on(GROUP_CHANNEL, 'group_id', this.id));

    /** teams : Retrieves all the teams that are associated to this group */
    @lazy teams = this.collections.
        get<TeamModel>(TEAM).
        query(Q.on(GROUP_TEAM, 'group_id', this.id));

    /** members : Retrieves all the members that are associated to this group */
    @lazy members = this.collections.
        get<UserModel>(USER).
        query(Q.on(GROUP_MEMBERSHIP, 'group_id', this.id));
}
