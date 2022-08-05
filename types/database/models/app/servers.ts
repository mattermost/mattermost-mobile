// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import type {Model} from '@nozbe/watermelondb';

/**
 * The Server model will help us to identify the various servers a user will log in; in the context of
 * multi-server support system.  The db_path field will hold the App-Groups file-path
 */
declare class ServersModel extends Model {
    /** table (name) : servers */
    static table: string;

    /** db_path : The file path where the database is stored */
    dbPath: string;

    /** display_name : The server display name */
    displayName: string;

    /** url : The online address for the Mattermost server */
    url: string;

    /** last_active_at: The last time this server was active */
    lastActiveAt: number;

    /** diagnostic_id: Determines the installation identifier of a server */
    identifier: string;
}

export default ServersModel;
