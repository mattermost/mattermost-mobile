// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Relation} from '@nozbe/watermelondb';
import Model, {Associations} from '@nozbe/watermelondb/Model';

import Team from '@typings/database/team';

/**
 * The TeamChannelHistory model helps keeping track of the last channel visited
 * by the user.
 */
export default class TeamChannelHistory extends Model {
    /** table (entity name) : TeamChannelHistory */
    static table: string;

    /** associations : Describes every relationship to this entity. */
    static associations: Associations;

    /** team_id : The foreign key to the related Team record */
    teamId: string;

    /** channelIds : An array containing the last 5 channels visited within this team order by recency */
    channelIds: string[];

    /** team : The related record from the parent Team model */
    team: Relation<Team>;
}
