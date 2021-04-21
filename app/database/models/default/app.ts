// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Model} from '@nozbe/watermelondb';
import {field} from '@nozbe/watermelondb/decorators';

import {MM_TABLES} from '@constants/database';

const {APP} = MM_TABLES.DEFAULT;

/**
 * The App model will hold information - such as the version number, build number and creation date -
 * for the Mattermost mobile app.
 */
export default class App extends Model {
    /** table (entity name) : app */
    static table = APP;

    /** build_number : Build number for the app */
    @field('build_number') buildNumber!: string;

    /** created_at : Date of creation for this version */
    @field('created_at') createdAt!: number;

    /** version_number : Version number for the app */
    @field('version_number') versionNumber!: string;
}
