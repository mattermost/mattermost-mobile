// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Model} from '@nozbe/watermelondb';

/**
 * The App model will hold information - such as the version number, build number and creation date -
 * for the Mattermost mobile app.
 */
export default class App extends Model {
    /** table (entity name) : app */
    static table: string;

    /** build_number : Build number for the app */
    buildNumber: string;

    /** created_at : Date of creation for this version */
    createdAt: number;

    /** version_number : Version number for the app */
    versionNumber: string;
}
