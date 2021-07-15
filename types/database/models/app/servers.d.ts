// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Model} from '@nozbe/watermelondb';

/**
 * The Server model will help us to identify the various servers a user will log in; in the context of
 * multi-server support system.  The db_path field will hold the App-Groups file-path
 */
export default class ServersModel extends Model {
    /** table (name) : servers */
    static table: string;

    /** db_path : The file path where the database is stored */
    dbPath: string;

    /** display_name : The server display name */
    displayName: string;

    /** mention_count : The number of mention on this server */
    mentionCount: number;

    /** unread_count : The number of unread messages on this server */
    unreadCount: number;

    /** url : The online address for the Mattermost server */
    url: string;

    /** last_active_at: The last time this server was active */
    lastActiveAt!: number;

    /** is_secured: Determines if the protocol used for this server url is HTTP or HTTPS */
    isSecured!: boolean;
}
