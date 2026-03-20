// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {AGENTS_TABLES} from '@agents/constants/database';
import {field, json} from '@nozbe/watermelondb/decorators';
import Model, {type Associations} from '@nozbe/watermelondb/Model';

import {safeParseJSONStringArray} from '@utils/helpers';

import type {ChannelAccessLevel, UserAccessLevel} from '@agents/types';
import type AiBotModelInterface from '@agents/types/database/models/ai_bot';

const {AI_BOT} = AGENTS_TABLES;

/**
 * The AiBot model represents an AI bot in the Mattermost app.
 */
export default class AiBotModel extends Model implements AiBotModelInterface {
    /** table (name) : AiBot */
    static table = AI_BOT;

    /** associations : Describes every relationship to this table. */
    static associations: Associations = {};

    /** display_name : The display name of the bot */
    @field('display_name') displayName!: string;

    /** username : The username of the bot */
    @field('username') username!: string;

    /** last_icon_update : Timestamp when the icon was last updated */
    @field('last_icon_update') lastIconUpdate!: number;

    /** dm_channel_id : The DM channel ID for the bot */
    @field('dm_channel_id') dmChannelId!: string;

    /** channel_access_level : The channel access level setting */
    @field('channel_access_level') channelAccessLevel!: ChannelAccessLevel;

    /** channel_ids : Array of channel IDs the bot has access to */
    @json('channel_ids', safeParseJSONStringArray) channelIds!: string[];

    /** user_access_level : The user access level setting */
    @field('user_access_level') userAccessLevel!: UserAccessLevel;

    /** user_ids : Array of user IDs the bot has access to */
    @json('user_ids', safeParseJSONStringArray) userIds!: string[];

    /** team_ids : Array of team IDs the bot belongs to */
    @json('team_ids', safeParseJSONStringArray) teamIds!: string[];
}
