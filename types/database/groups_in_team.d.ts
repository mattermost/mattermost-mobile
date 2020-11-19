import Model, { Associations } from '@nozbe/watermelondb/Model';
export default class GroupsInTeam extends Model {
    static table: any;
    static associations: Associations;
    groupId: string;
    memberCount: number;
    teamId: string;
    timezoneCount: number;
}
