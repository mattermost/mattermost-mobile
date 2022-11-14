// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import type {Model} from '@nozbe/watermelondb';

/**
 * The Config model is another set of key-value pair combination but this one
 * will hold the server configuration.
 */
declare class ConfigModel extends Model {
    /** table (name) : Config */
    static table: string;

    /** value : The value for that config/information and whose key will be the id column  */
    value: string;
}

export default ConfigModel;
