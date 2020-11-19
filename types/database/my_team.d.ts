import Model, { Associations } from '@nozbe/watermelondb/Model';
export default class MyTeam extends Model {
    static table: any;
    static associations: Associations;
    isUnread: boolean;
    mentionsCount: boolean;
    roles: string[];
    teamId: boolean;
}
