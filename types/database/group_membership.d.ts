import Model, { Associations } from '@nozbe/watermelondb/Model';
export default class GroupMembership extends Model {
    static table: string;
    static associations: Associations;
    groupId: string;
    userId: string;
}
