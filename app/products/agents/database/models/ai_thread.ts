// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {AGENTS_TABLES} from '@agents/constants/database';
import {field, immutableRelation} from '@nozbe/watermelondb/decorators';
import Model, {type Associations} from '@nozbe/watermelondb/Model';

import {MM_TABLES} from '@constants/database';

import type AiThreadModelInterface from '@agents/types/database/models/ai_thread';
import type {Relation} from '@nozbe/watermelondb';
import type ChannelModel from '@typings/database/models/servers/channel';

const {AI_THREAD} = AGENTS_TABLES;
const {CHANNEL} = MM_TABLES.SERVER;

/**
 * The AiThread model represents an AI thread conversation in the Mattermost app.
 */
export default class AiThreadModel extends Model implements AiThreadModelInterface {
    /** table (name) : AiThread */
    static table = AI_THREAD;

    /** associations : Describes every relationship to this table. */
    static associations: Associations = {

        /** A CHANNEL can be associated to AI_THREAD (relationship is 1:N) */
        [CHANNEL]: {type: 'belongs_to', key: 'channel_id'},
    };

    /** message : The preview message text */
    @field('message') message!: string;

    /** title : The thread title */
    @field('title') title!: string;

    /** channel_id : Foreign key to the DM channel with the bot */
    @field('channel_id') channelId!: string;

    /** reply_count : Number of replies in the thread */
    @field('reply_count') replyCount!: number;

    /** update_at : Timestamp when the thread was last updated */
    @field('update_at') updateAt!: number;

    /** channel : The CHANNEL to which this AI_THREAD belongs */
    @immutableRelation(CHANNEL, 'channel_id') channel!: Relation<ChannelModel>;
}
