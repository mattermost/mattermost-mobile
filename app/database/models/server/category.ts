// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Relation, Query, Q} from '@nozbe/watermelondb';
import {children, field, immutableRelation, lazy} from '@nozbe/watermelondb/decorators';
import Model, {Associations} from '@nozbe/watermelondb/Model';
import {map, distinctUntilChanged} from 'rxjs';

import {MM_TABLES} from '@constants/database';

import type CategoryInterface from '@typings/database/models/servers/category';
import type CategoryChannelModel from '@typings/database/models/servers/category_channel';
import type ChannelModel from '@typings/database/models/servers/channel';
import type MyChannelModel from '@typings/database/models/servers/my_channel';
import type TeamModel from '@typings/database/models/servers/team';

const {
    CATEGORY,
    CATEGORY_CHANNEL,
    CHANNEL,
    MY_CHANNEL,
    TEAM,
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

    /** type : The type of category ('channels' | 'direct_messages' | 'favorites' | 'custom') */
    @field('type') type!: CategoryType;

    /** sort_order : The index on which to sort and display categories */
    @field('sort_order') sortOrder!: number;

    /** sorting : The type of sorting applied to the category channels (alpha, recent, manual) */
    @field('sorting') sorting!: CategorySorting;

    /** collapsed : Boolean flag indicating if the category is collapsed */
    @field('collapsed') collapsed!: boolean;

    /** muted : Boolean flag indicating if the category is muted */
    @field('muted') muted!: boolean;

    /** teamId : The team in which this category lives */
    @field('team_id') teamId!: string;

    /** team : Retrieves information about the team that this category is a part of. */
    @immutableRelation(TEAM, 'id') team!: Relation<TeamModel>;

    /** categoryChannels : All the CategoryChannels associated with this team */
    @children(CATEGORY_CHANNEL) categoryChannels!: Query<CategoryChannelModel>;

    /** categoryChannelsBySortOrder : Retrieves assocated category channels sorted by sort_order */
    @lazy categoryChannelsBySortOrder = this.categoryChannels.collection.query(
        Q.where('category_id', this.id),
        Q.sortBy('sort_order', Q.asc),
    );

    /** channels : Retrieves all the channels that are part of this category */
    @lazy channels = this.collections.
        get<ChannelModel>(CHANNEL).
        query(
            Q.on(CATEGORY_CHANNEL, 'category_id', this.id),
            Q.where('delete_at', Q.eq(0)),
            Q.sortBy('display_name'),
        );

    /** myChannels : Retrieves all myChannels that are part of this category */
    @lazy myChannels = this.collections.
        get<MyChannelModel>(MY_CHANNEL).
        query(
            Q.experimentalJoinTables([CHANNEL, CATEGORY_CHANNEL]),
            Q.on(CATEGORY_CHANNEL,
                Q.and(
                    Q.on(CHANNEL, Q.where('delete_at', Q.eq(0))),
                    Q.where('category_id', this.id),
                ),
            ),
            Q.sortBy('last_post_at', Q.desc),
        );

    /** hasChannels : Returns a boolean indicating if the category has channels */
    @lazy hasChannels = this.categoryChannels.observeCount().pipe(
        map((c) => c > 0),
        distinctUntilChanged(),
    );
}
