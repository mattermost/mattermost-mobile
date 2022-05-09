// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Q} from '@nozbe/watermelondb';
import {field, lazy} from '@nozbe/watermelondb/decorators';
import Model, {Associations} from '@nozbe/watermelondb/Model';

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
 * A Group holds channels for a given user in a team
 */
export default class GroupModel extends Model implements GroupInterface {
    /** table (name) : Group */
    static table = GROUP;

    /** associations : Describes every relationship to this table. */
    static associations: Associations = {

        /** Groups are associated with Channels (relationship N:N) through GROUP_CHANNEL */
        [CHANNEL]: {type: 'has_many', foreignKey: 'group_id'},

        /** Groups are associated with Members (Users) (relationship N:N) through GROUP_MEMBERSHIP */
        [USER]: {type: 'has_many', foreignKey: 'group_id'},

        /** Groups are associated with Teams (relationship N:N) through GROUP_TEAM */
        [TEAM]: {type: 'has_many', foreignKey: 'group_id'},
    };

    /** name : The name for the group */
    @field('name') name!: string;

    /** display_name : The display name for the group */
    @field('display_name') displayName!: string;

    /** description : The display name for the group */
    @field('description') description!: string;

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
