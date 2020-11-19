// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import Model, {Associations} from '@nozbe/watermelondb/Model';
export default class SlashCommand extends Model {
    static table: string;
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
