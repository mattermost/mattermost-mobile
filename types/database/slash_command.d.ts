import Model, { Associations } from '@nozbe/watermelondb/Model';
export default class SlashCommand extends Model {
    static table: any;
    static associations: Associations;
    autoComplete: boolean;
    description: string;
    displayName: string;
    hint: string;
    method: string;
    slashId: string;
    teamId: string;
    token: string;
    trigger: string;
}
