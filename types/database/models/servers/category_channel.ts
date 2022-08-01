// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import type CategoryModel from './category';
import type ChannelModel from './channel';
import type MyChannelModel from './my_channel';
import type {Relation, Model} from '@nozbe/watermelondb';
import type {Associations} from '@nozbe/watermelondb/Model';

/**
 * The CategoryChannel model represents the 'association table' where many categories have channels and many channels are in
 * categories (relationship type N:N)
 */
declare class CategoryChannelModel extends Model {
    /** table (name) : CategoryChannel */
    static table: string;

    /** associations : Describes every relationship to this table. */
    static associations: Associations;

    /** category_id : The foreign key to the related Category record */
    categoryId: string;

    /* channel_id : The foreign key to the related User record*/
    channelId: string;

    /* sort_order : The order in which the channel displays in the category, if the order is manually set */
    sortOrder: number;

    /** category : The related category */
    category: Relation<CategoryModel>;

    /** channel : The related channel */
    channel: Relation<ChannelModel>;

    /** myChannel : The related myChannel */
    myChannel: Relation<MyChannelModel>;
}

export default CategoryChannelModel;
