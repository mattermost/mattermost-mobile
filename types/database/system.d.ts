// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Model} from '@nozbe/watermelondb';

/**
 * The System model is another set of key-value pair combination but this one
 * will mostly hold configuration information about the client, the licences and some
 * custom data (e.g. recent emoji used)
 */
export default class System extends Model {
    /** table (entity name) : System */
    static table: string;

    /** name : The name or key value for the config */
    name: string;

    /** value : The value for that config/information */
    value: any;
}
