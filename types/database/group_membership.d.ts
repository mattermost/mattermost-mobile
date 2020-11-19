import Model, { Associations } from '@nozbe/watermelondb/Model';
export default class GroupMembership extends Model {
    static table: any;
    static associations: Associations;
    groupId: string;
    userId: string;
}
