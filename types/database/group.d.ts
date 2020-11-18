import { Model } from '@nozbe/watermelondb';
import { Associations } from '@nozbe/watermelondb/Model';
import GroupsInChannel from './groups_in_channel';
export default class Group extends Model {
    static table: any;
    static associations: Associations;
    displayName: string;
    groupId: string;
    name: string;
    groupsInChannel: GroupsInChannel;
}
