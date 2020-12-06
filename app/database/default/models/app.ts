// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import field from '@nozbe/watermelondb/decorators/field';
import {Model} from '@nozbe/watermelondb';

import {MM_TABLES} from '@constants/database';

export default class App extends Model {
    static table = MM_TABLES.DEFAULT.APP

    @field('build_number') buildNumber!: string
    @field('created_at') createdAt!: number
    @field('version_number') versionNumber!: string
}
