// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Model} from '@nozbe/watermelondb';
import {MM_TABLES} from '@constants/database';
import field from '@nozbe/watermelondb/decorators/field';
import date from '@nozbe/watermelondb/decorators/date';

export default class App extends Model {
    static table = MM_TABLES.DEFAULT.APP

    @field('build_number') buildNumber!: string
    @date('created_at') createdAt!: Date
    @field('version_number') unreadCount!: string
}
