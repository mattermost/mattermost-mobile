// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Relation, Query, Q} from '@nozbe/watermelondb';
import {children, field, immutableRelation, lazy} from '@nozbe/watermelondb/decorators';
import Model, {Associations} from '@nozbe/watermelondb/Model';
import {map, distinctUntilChanged} from 'rxjs';

import {MM_TABLES} from '@constants/database';

import type CategoryInterface from '@typings/database/models/servers/category';
import type CategoryChannelModel from '@typings/database/models/servers/category_channel';
import type TeamModel from '@typings/database/models/servers/team';
import type UserModel from '@typings/database/models/servers/user';

const {
    CATEGORY,
    CATEGORY_CHANNEL,
    CHANNEL,
    TEAM,
    USER,
} = MM_TABLES.SERVER;

/**
 * A Category holds channels for a given user in a team
 */
export default class CategoryModel extends Model implements CategoryInterface {
    /** table (name) : Category */
    static table = CATEGORY;

    /** associations : Describes every relationship to this table. */
    static associations: Associations = {

        /** A CATEGORY has a 1:N relationship with CHANNEL. A CATEGORY can possess multiple channels */
        [CATEGORY_CHANNEL]: {type: 'has_many', foreignKey: 'category_id'},

        /** A TEAM can be associated to CATEGORY (relationship is 1:N) */
        [TEAM]: {type: 'belongs_to', key: 'team_id'},
    };

    /** display_name : The display name for the category */
    @field('display_name') displayName!: string;

    /** type : The type of category */
    @field('type') type!: string;

    /** sort_order : The sort order for the category */
    @field('sort_order') sortOrder!: number;

    /** sorting : The type of sorting applied to the category channels (alpha, recent, manual) */
    @field('sorting') sorting!: CategorySorting;

    /** collapsed : Boolean flag indicating if the category is collapsed */
    @field('collapsed') collapsed!: boolean;

    /** muted : Boolean flag indicating if the category is muted */
    @field('muted') muted!: boolean;

    /** userId : The team in which this category lives */
    @field('team_id') teamId!: string;

    /** channels : All the channels associated with this team */
    @children(CATEGORY_CHANNEL) categoryChannels!: Query<CategoryChannelModel>;

    /** team : Retrieves information about the team that this category is a part of. */
    @immutableRelation(TEAM, 'id') team!: Relation<TeamModel>;

    /** channels : Retrieves all the channels that are part of this category */
    @lazy channels = this.collections.
        get(CHANNEL).
        query(
            Q.on(CATEGORY_CHANNEL, Q.where('category_id', this.id)),
            Q.sortBy('display_name'),
        );

    /** hasChannels : Returns a boolean indicating if the category has channels */
    @lazy hasChannels = this.categoryChannels.observeCount().pipe(
        map((c) => c > 0),
        distinctUntilChanged(),
    );
}
