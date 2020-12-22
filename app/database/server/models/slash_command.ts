// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import Model, {Associations} from '@nozbe/watermelondb/Model';
import {field, immutableRelation} from '@nozbe/watermelondb/decorators';

import {MM_TABLES} from '@constants/database';
import Team from '@typings/database/team';

const {TEAM} = MM_TABLES.SERVER;

/**
 * The SlashCommand model describes the commands of the various plugins installed in each team.
 */
export default class SlashCommand extends Model {
    /** table (entity name) : SlashCommand */
    static table = MM_TABLES.SERVER.SLASH_COMMAND;

    /** associations : Describes every relationship to this entity. */
    static associations: Associations = {

        /** A TEAM can have multiple slash commands. (relationship is 1:N) */
        [TEAM]: {type: 'belongs_to', key: 'team_id'},
    };

    constructor() {
        super();
        this.autoComplete = false;
        this.description = '';
        this.displayName = '';
        this.hint = '';
        this.method = '';
        this.teamId = '';
        this.token = '';
        this.trigger = '';
        this.team = {} as Team;
    }

    /** auto_complete : Boolean flag for auto-completing slash commands */
    @field('auto_complete') autoComplete!: boolean;

    /** description : The description for the slash command */
    @field('description') description!: string;

    /** display_name : The name for the command */
    @field('display_name') displayName!: string;

    /** hint : A helpful text explaining the purpose of the command  */
    @field('hint') hint!: string;

    /** method : API methods like HTTP */
    @field('method') method!: string;

    /** team_id : The foreign key of the parent Team */
    @field('team_id') teamId!: string;

    /** token : A key identifying this slash command */
    @field('token') token!: string;

    /** trigger : A pattern/text used to recognize when a slash command needs to launch */
    @field('trigger') trigger!: string;

    /** team : The related parent TEAM record */
    @immutableRelation(TEAM, 'team_id') team!: Team;
}
