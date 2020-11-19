import Model, { Associations } from '@nozbe/watermelondb/Model';
export default class Channel extends Model {
    static table: any;
    static associations: Associations;
    channelId: string;
    createAt: number;
    creatorId: string;
    deleteAt: number;
    displayName: string;
    isGroupConstrained: boolean;
    name: string;
    team_id: string;
    type: string;
}
