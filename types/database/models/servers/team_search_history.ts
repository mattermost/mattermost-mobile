// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import type TeamModel from './team';
import type {Relation, Model} from '@nozbe/watermelondb';
import type {Associations} from '@nozbe/watermelondb/Model';

/**
 * The TeamSearchHistory model holds the term searched within a team.  The searches are performed
 * at team level in the app.
 */
declare class TeamSearchHistoryModel extends Model {
    /** table (name) : TeamSearchHistory */
    static table: string;

    /** associations : Describes every relationship to this table. */
    static associations: Associations;

    /** created_at : The timestamp at which this search was performed */
    createdAt: number;

    /** team_id : The foreign key to the parent Team model */
    teamId: string;

    /** display_term : The term that we display to the user */
    displayTerm: string;

    /** term : The term that is sent to the server to perform the search */
    term: string;

    /** team : The related record to the parent team model */
    team: Relation<TeamModel>;
}

export default TeamSearchHistoryModel;
