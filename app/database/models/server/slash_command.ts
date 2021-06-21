// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Relation} from '@nozbe/watermelondb';
import {field, immutableRelation} from '@nozbe/watermelondb/decorators';
import Model, {Associations} from '@nozbe/watermelondb/Model';

import {MM_TABLES} from '@constants/database';
import Team from '@typings/database/models/servers/team';

const {SLASH_COMMAND, TEAM} = MM_TABLES.SERVER;

/**
 * The SlashCommand model describes the commands of the various commands available in each team.
 */
export default class SlashCommand extends Model {
    /** table (name) : SlashCommand */
    static table = SLASH_COMMAND;

    /** associations : Describes every relationship to this table. */
    static associations: Associations = {

        /** A TEAM can have multiple slash commands. (relationship is 1:N) */
        [TEAM]: {type: 'belongs_to', key: 'team_id'},
    };

    /** is_auto_complete : Boolean flag for auto-completing slash commands */
    @field('is_auto_complete') isAutoComplete!: boolean;

    /** description : The description for the slash command */
    @field('description') description!: string;

    /** display_name : The name for the command */
    @field('display_name') displayName!: string;

    /** hint : A helpful text explaining the purpose of the command  */
    @field('hint') hint!: string;

    /** method : HTTP API methods like get, put, post, patch, etc. */
    @field('method') method!: string;

    /** team_id : The foreign key of the parent Team */
    @field('team_id') teamId!: string;

    /** token : A key identifying this slash command */
    @field('token') token!: string;

    /** trigger : A pattern/text used to recognize when a slash command needs to launch */
    @field('trigger') trigger!: string;

    /** update_at : The timestamp to when this command was last updated on the server */
    @field('update_at') updateAt!: number;

    /** team : The related parent TEAM record */
    @immutableRelation(TEAM, 'team_id') team!: Relation<Team>;
}
