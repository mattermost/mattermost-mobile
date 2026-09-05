// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import type {Model, Relation} from '@nozbe/watermelondb';
import type {Associations} from '@nozbe/watermelondb/Model';
import type ChannelModel from '@typings/database/models/servers/channel';

/**
 * The AiThread model represents an AI thread conversation in the Mattermost app.
 */
declare class AiThreadModel extends Model {
    /** table (name) : AiThread */
    static table: string;

    /** associations : Describes every relationship to this table. */
    static associations: Associations;

    /** The thread title */
    title: string;

    /** Foreign key to the DM channel with the bot */
    channelId: string;

    /** Number of user<->agent turns in the conversation (plugin 2.x) */
    turnCount: number;

    /** Timestamp when the thread was last updated */
    updateAt: number;

    /** The CHANNEL to which this AI_THREAD belongs */
    channel: Relation<ChannelModel>;
}

export default AiThreadModel;
