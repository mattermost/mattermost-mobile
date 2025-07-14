// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {immutableRelation, json} from '@nozbe/watermelondb/decorators';
import Model, {type Associations} from '@nozbe/watermelondb/Model';

import {MM_TABLES} from '@constants/database';
import {safeParseJSONStringArray} from '@utils/helpers';

import type {Relation} from '@nozbe/watermelondb';
import type TeamModel from '@typings/database/models/servers/team';
import type TeamChannelHistoryModelInterface from '@typings/database/models/servers/team_channel_history';

const {TEAM, TEAM_CHANNEL_HISTORY} = MM_TABLES.SERVER;

/**
 * The TeamChannelHistory model helps keeping track of the last channel visited
 * by the user.
 */
export default class TeamChannelHistoryModel extends Model implements TeamChannelHistoryModelInterface {
    /** table (name) : TeamChannelHistory */
    static table = TEAM_CHANNEL_HISTORY;

    static associations: Associations = {

        /** A TEAM has a 1:1 relationship with TEAM_CHANNEL_HISTORY. */
        [TEAM]: {type: 'belongs_to', key: 'id'},
    };

    /** channel_ids : An array containing the last 5 channels visited within this team order by recency */
    @json('channel_ids', safeParseJSONStringArray) channelIds!: string[];

    /** team : The related record from the parent Team model */
    @immutableRelation(TEAM, 'id') team!: Relation<TeamModel>;
}
