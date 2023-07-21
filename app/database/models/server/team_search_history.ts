// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {field, immutableRelation, text} from '@nozbe/watermelondb/decorators';
import Model, {type Associations} from '@nozbe/watermelondb/Model';

import {MM_TABLES} from '@constants/database';

import type {Relation} from '@nozbe/watermelondb';
import type TeamModel from '@typings/database/models/servers/team';
import type TeamSearchHistoryModelInterface from '@typings/database/models/servers/team_search_history';

const {TEAM, TEAM_SEARCH_HISTORY} = MM_TABLES.SERVER;

/**
 * The TeamSearchHistory model holds the term searched within a team.  The searches are performed
 * at team level in the app.
 */
export default class TeamSearchHistoryModel extends Model implements TeamSearchHistoryModelInterface {
    /** table (name) : TeamSearchHistory */
    static table = TEAM_SEARCH_HISTORY;

    /** associations : Describes every relationship to this table. */
    static associations: Associations = {

        /** A TEAM can have multiple search terms  */
        [TEAM]: {type: 'belongs_to', key: 'team_id'},
    };

    /** created_at : The timestamp at which this search was performed */
    @field('created_at') createdAt!: number;

    /** team_id : The foreign key to the parent Team model */
    @field('team_id') teamId!: string;

    /** display_term : The term that we display to the user */
    @field('display_term') displayTerm!: string;

    /** term : The term that is sent to the server to perform the search */
    @text('term') term!: string;

    /** team : The related record to the parent team model */
    @immutableRelation(TEAM, 'team_id') team!: Relation<TeamModel>;
}
