// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Model} from '@nozbe/watermelondb';
import {field} from '@nozbe/watermelondb/decorators';

import {MM_TABLES} from '@constants/database';

import type ServersModelInterface from '@typings/database/models/app/servers';

const {SERVERS} = MM_TABLES.APP;

/**
 * The Server model will help us to identify the various servers a user will log in; in the context of
 * multi-server support system.  The db_path field will hold the App-Groups file-path
 */
export default class ServersModel extends Model implements ServersModelInterface {
    /** table (name) : servers */
    static table = SERVERS;

    /** db_path : The file path where the database is stored */
    @field('db_path') dbPath!: string;

    /** display_name : The server display name */
    @field('display_name') displayName!: string;

    /** url : The online address for the Mattermost server */
    @field('url') url!: string;

    /** last_active_at: The last time this server was active */
    @field('last_active_at') lastActiveAt!: number;

    /** identifier: Determines the installation identifier of a server */
    @field('identifier') identifier!: string;
}
