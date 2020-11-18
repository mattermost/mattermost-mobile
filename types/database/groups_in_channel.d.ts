import { Model } from '@nozbe/watermelondb';
export default class GroupsInChannel extends Model {
    static table: any;
    memberCount: number;
    timeZoneCount: number;
}
