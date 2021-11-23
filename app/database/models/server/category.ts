// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Relation} from '@nozbe/watermelondb';
import {children, field, immutableRelation} from '@nozbe/watermelondb/decorators';
import Model, {Associations} from '@nozbe/watermelondb/Model';

import {MM_TABLES} from '@constants/database';
import TeamModel from '@typings/database/models/servers/team';

import {ChannelModel, UserModel} from '.';

const {
    CATEGORY,
    CHANNEL,
    TEAM,
    USER,
} = MM_TABLES.SERVER;

/**
 * The Category model represents a group of channels within a team for a user.
 */
export default class CategoryModel extends Model {
    /** table (name) : Category */
    static table = CATEGORY;

    /** associations : Describes every relationship to this table. */
    static associations: Associations = {

        /** A CATEGORY can be associated with multiple CHANNEL (relationship is 1:N) */
        [CHANNEL]: {type: 'has_many', foreignKey: 'id'},

        /** A TEAM can be associated to CATEGORY (relationship is 1:N) */
        [TEAM]: {type: 'belongs_to', key: 'team_id'},

        /** A USER can create multiple CATEGORY (relationship is 1:N) */
        [USER]: {type: 'belongs_to', key: 'user_id'},
    };

    /** display_name : The category display name (e.g. Favorites ) */
    @field('display_name') displayName!: string;

    /** team_id : The team to which this category belongs. */
    @field('team_id') teamId!: string;

    /** user_id : The user to which this category belongs. */
    @field('user_id') userId!: string;

    /** type : The type of the category ( e.g. custom | favorites | direct_messages | channel) */
    @field('type') type!: CategoryType;

    /** collapsed : Whether the category display is collapsed */
    @field('collapsed') collapsed!: boolean;

    /** sort_order : The sort order number for this category */
    @field('sort_order') sortOrder!: number;

    /** members : Channels belonging to this category */
    @children(CHANNEL) channels!: ChannelModel[];

    /** team : The TEAM to which this CHANNEL belongs */
    @immutableRelation(TEAM, 'team_id') team!: Relation<TeamModel>;

    /** creator : The USER who created this CHANNEL*/
    @immutableRelation(USER, 'user_id') creator!: Relation<UserModel>;

    toApi = (): Omit<Category, 'collapsed'> => {
        return {
            id: this.id,
            team_id: this.teamId,
            user_id: this.userId,
            type: this.type,
            display_name: this.displayName,
            channel_ids: this.channels.map((channel) => channel.id),
        };
    };
}
