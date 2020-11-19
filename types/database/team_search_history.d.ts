// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import Model, {Associations} from '@nozbe/watermelondb/Model';
export default class TeamSearchHistory extends Model {
    static table: string;
    static associations: Associations;
    createdAt: number;
    displayTerm: string[];
    team_id: number;
    term: number;
}
