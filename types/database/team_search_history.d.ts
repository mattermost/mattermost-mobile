import Model, { Associations } from '@nozbe/watermelondb/Model';
export default class TeamSearchHistory extends Model {
    static table: any;
    static associations: Associations;
    createdAt: number;
    displayTerm: string[];
    team_id: number;
    term: number;
}
