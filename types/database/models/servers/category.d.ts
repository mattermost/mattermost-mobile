// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Query, Relation} from '@nozbe/watermelondb';
import Model, {Associations} from '@nozbe/watermelondb/Model';

/**
 * The Category model represents a category in the Mattermost app.
 */
export default class CategoryModel extends Model {
    /** table (name) : Category */
    static table: string;

    /** associations : Describes every relationship to this table. */
    static associations: Associations;

    /** team_id : The team to which this category belongs */
    teamId: string;

    /** team_id : The team to which this category belongs */
    userId: string;

    /** type : The type of the category (channels / custom / direct_messages / favorites) */
    type: string;

    /** display_name : The category display name (e.g. Town Square ) */
    displayName: string;

    /** collapsed : Whether the category list is visible */
    collapsed: boolean;

    /** sort_order : The categories order to display  */
    sortOrder: number;

    /** channels : All channels in the category */
    channels: Query<ChannelModel>;

    /** team : The TEAM to which this CATEGORY belongs */
    team: Relation<TeamModel>;

    /** team : The USER to which this CATEGORY belongs */
    user: Relation<UserModel>;

    toApi = () => Category;
}
