// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Query, Relation} from '@nozbe/watermelondb';
import Model, {Associations} from '@nozbe/watermelondb/Model';

/**
 * The CategoryChannel model represents the 'association table' where many categories have channels and many channels are in
 * categories (relationship type N:N)
 */
export default class CategoryChannelModel extends Model {
    /** table (name) : TeamMembership */
    static table: string;

    /** associations : Describes every relationship to this table. */
    static associations: Associations;

    /** category_id : The foreign key to the related Category record */
    categoryId: string;

    /* user_id : The foreign key to the related User record*/
    userId: string;

    /* channel_id : The foreign key to the related User record*/
    channelId: string;

    /* sort_order : The order in which the channel displays in the category, if the order is manually set */
    sortOrder: number;

    /** user: The related user in the category */
    user: Relation<UserModel>;

    /** team : The related team of users */
    category: Relation<CategoryModel>;

    /** team : The related team of users */
    channel: Relation<ChannelModel>;

    /**
     * getAllChannelsInCategory - Retrieves all the channels that are in this category
     */
    getAllChannelsInCategory: Query<ChannelModel>;
}
