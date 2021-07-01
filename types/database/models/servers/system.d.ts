// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Model} from '@nozbe/watermelondb';

/**
 * The System model is another set of key-value pair combination but this one
 * will mostly hold configuration information about the client, the licences and some
 * custom data (e.g. recent emoji used)
 */
export default class System extends Model {
    /** table (name) : System */
    static table: string;

    /** value : The value for that config/information and whose key will be the id column  */
    value: any;
}
