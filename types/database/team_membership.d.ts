import Model, { Associations } from '@nozbe/watermelondb/Model';
export default class TeamMembership extends Model {
    static table: any;
    static associations: Associations;
    teamId: string;
    userId: string;
}
