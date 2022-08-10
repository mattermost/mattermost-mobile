// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import type {Model} from '@nozbe/watermelondb';

/**
 * The System model is another set of key-value pair combination but this one
 * will mostly hold configuration information about the client, the licences and some
 * custom data (e.g. recent emoji used)
 */
declare class SystemModel extends Model {
    /** table (name) : System */
    static table: string;

    /** value : The value for that config/information and whose key will be the id column  */
    value: any;
}

export default SystemModel;
