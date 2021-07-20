// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Relation} from '@nozbe/watermelondb';
import {immutableRelation, json} from '@nozbe/watermelondb/decorators';
import Model, {Associations} from '@nozbe/watermelondb/Model';

import {MM_TABLES} from '@constants/database';
import {safeParseJSON} from '@utils/helpers';

import type TeamModel from '@typings/database/models/servers/team';

const {TEAM, TEAM_CHANNEL_HISTORY} = MM_TABLES.SERVER;

/**
 * The TeamChannelHistory model helps keeping track of the last channel visited
 * by the user.
 */
export default class TeamChannelHistoryModel extends Model {
    /** table (name) : TeamChannelHistory */
    static table = TEAM_CHANNEL_HISTORY;

    /** associations : Describes every relationship to this table. */
    static associations: Associations = {

        /** A TEAM and TEAM_CHANNEL_HISTORY share a 1:1 relationship */
        [TEAM]: {type: 'belongs_to', key: 'id'},
    };

    /** channel_ids : An array containing the last 5 channels visited within this team order by recency */
    @json('channel_ids', safeParseJSON) channelIds!: string[];

    /** team : The related record from the parent Team model */
    @immutableRelation(TEAM, 'id') team!: Relation<TeamModel>;
}
