// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Model} from '@nozbe/watermelondb';
import {field} from '@nozbe/watermelondb/decorators';

import {MM_TABLES} from '@constants/database';

const {APP} = MM_TABLES.DEFAULT;
export default class App extends Model {
    static table = APP

    @field('build_number') buildNumber!: string
    @field('created_at') createdAt!: number
    @field('version_number') versionNumber!: string
}
