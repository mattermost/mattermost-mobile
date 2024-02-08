// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Relation, Query, Q} from '@nozbe/watermelondb';
import {children, field, immutableRelation, lazy} from '@nozbe/watermelondb/decorators';
import Model, {type Associations} from '@nozbe/watermelondb/Model';
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

        /** A CHANNEL can belong to several CATEGORY, and a CATEGORY posses multiple channels (N:N relationship).
         *  We use the intermediate table CATEGORY_CHANNEL for this relationship */
        [CATEGORY_CHANNEL]: {type: 'has_many', foreignKey: 'category_id'},

        /**  A Category belongs to a Team, and a Team can have several categories (relationship 1:N) */
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
    @lazy categoryChannelsBySortOrder = this.categoryChannels.collection.
        query(
            Q.on(MY_CHANNEL,
                Q.where('id', Q.notEq('')),
            ),
            Q.where('category_id', this.id),
            Q.sortBy('sort_order', Q.asc),
        );

    /** channels : Retrieves all the channels that are part of this category */
    @lazy channels = this.collections.
        get<ChannelModel>(CHANNEL).
        query(
            Q.experimentalJoinTables([MY_CHANNEL, CATEGORY_CHANNEL]),
            Q.on(CATEGORY_CHANNEL,
                Q.and(
                    Q.on(MY_CHANNEL, Q.where('id', Q.notEq(''))),
                    Q.where('category_id', this.id),
                ),
            ),
        );

    /** myChannels : Retrieves all myChannels that are part of this category */
    @lazy myChannels = this.collections.
        get<MyChannelModel>(MY_CHANNEL).
        query(
            Q.experimentalJoinTables([CHANNEL, CATEGORY_CHANNEL]),
            Q.on(CATEGORY_CHANNEL,
                Q.and(
                    Q.on(CHANNEL, Q.where('create_at', Q.gte(0))),
                    Q.where('category_id', this.id),
                ),
            ),
            Q.sortBy('last_post_at', Q.desc),
        );

    observeHasChannels = (canViewArchived: boolean, channelId: string) => {
        return this.channels.observeWithColumns(['delete_at']).pipe(
            map((channels) => {
                if (canViewArchived) {
                    return channels.filter((c) => c.deleteAt === 0 || c.id === channelId).length > 0;
                }

                return channels.filter((c) => c.deleteAt === 0).length > 0;
            }),
            distinctUntilChanged(),
        );
    };

    toCategoryWithChannels = async (): Promise<CategoryWithChannels> => {
        const categoryChannels = await this.categoryChannels.fetch();
        const orderedChannelIds = categoryChannels.sort((a, b) => {
            return a.sortOrder - b.sortOrder;
        }).map((cc) => cc.channelId);

        return {
            channel_ids: orderedChannelIds,
            id: this.id,
            team_id: this.teamId,
            display_name: this.displayName,
            sort_order: this.sortOrder,
            sorting: this.sorting,
            type: this.type,
            muted: this.muted,
            collapsed: this.collapsed,
        };
    };
}
