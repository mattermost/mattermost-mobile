// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import type TeamModel from './team';
import type {Relation, Model} from '@nozbe/watermelondb';

/**
 * The TeamChannelHistory model helps keeping track of the last channel visited
 * by the user.
 */
declare class TeamChannelHistoryModel extends Model {
    /** table (name) : TeamChannelHistory */
    static table: string;

    /** channel_ids : An array containing the last 5 channels visited within this team order by recency */
    channelIds: string[];

    /** team : The related record from the parent Team model */
    team: Relation<TeamModel>;
}

export default TeamChannelHistoryModel;
