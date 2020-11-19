// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import {Model} from '@nozbe/watermelondb';
export default class Server extends Model {
    static table: string;
    dbPath: string;
    displayName: string;
    mentionCount: number;
    unreadCount: number;
    url: string;
}
