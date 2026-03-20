// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import type {ChannelAccessLevel, UserAccessLevel} from '@agents/types';
import type {Model} from '@nozbe/watermelondb';
import type {Associations} from '@nozbe/watermelondb/Model';

/**
 * The AiBot model represents an AI bot in the Mattermost app.
 */
declare class AiBotModel extends Model {
    /** table (name) : AiBot */
    static table: string;

    /** associations : Describes every relationship to this table. */
    static associations: Associations;

    /** The display name of the bot */
    displayName: string;

    /** The username of the bot */
    username: string;

    /** Timestamp when the icon was last updated */
    lastIconUpdate: number;

    /** The DM channel ID for the bot */
    dmChannelId: string;

    /** The channel access level setting */
    channelAccessLevel: ChannelAccessLevel;

    /** Array of channel IDs the bot has access to */
    channelIds: string[];

    /** The user access level setting */
    userAccessLevel: UserAccessLevel;

    /** Array of user IDs the bot has access to */
    userIds: string[];

    /** Array of team IDs the bot belongs to */
    teamIds: string[];
}

export default AiBotModel;
