// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Model} from '@nozbe/watermelondb';
import {field} from '@nozbe/watermelondb/decorators';

import {MM_TABLES} from '@constants/database';

const {SERVERS} = MM_TABLES.APP;

/**
 * The Server model will help us to identify the various servers a user will log in; in the context of
 * multi-server support system.  The db_path field will hold the App-Groups file-path
 */
export default class Servers extends Model {
    /** table (name) : servers */
    static table = SERVERS;

    /** db_path : The file path where the database is stored */
    @field('db_path') dbPath!: string;

    /** display_name : The server display name */
    @field('display_name') displayName!: string;

    /** mention_count : The number of mention on this server */
    @field('mention_count') mentionCount!: number;

    /** unread_count : The number of unread messages on this server */
    @field('unread_count') unreadCount!: number;

    /** url : The online address for the Mattermost server */
    @field('url') url!: string;

    /** last_active_at: The last time this server was active */
    @field('last_active_at') lastActiveAt!: number;

    /** is_secured: Determines if the protocol used for this server url is HTTP or HTTPS */
    @field('is_secured') isSecured!: boolean;
}
