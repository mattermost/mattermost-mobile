import Model, { Associations } from '@nozbe/watermelondb/Model';
export default class TeamChannelHistory extends Model {
    static table: any;
    static associations: Associations;
    channelIds: string[];
    teamId: string;
}
