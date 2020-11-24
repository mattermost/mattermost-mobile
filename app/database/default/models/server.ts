// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import {Model} from '@nozbe/watermelondb';
import field from '@nozbe/watermelondb/decorators/field';

import {MM_TABLES} from '@constants/database';

export default class Server extends Model {
    static table = MM_TABLES.DEFAULT.SERVERS

    @field('db_path') dbPath!: string
    @field('display_name') displayName!: string
    @field('mention_count') mentionCount!: number
    @field('unread_count') unreadCount!: number
    @field('url') url!: string
}
