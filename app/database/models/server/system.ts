// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Model} from '@nozbe/watermelondb';
import {field, json} from '@nozbe/watermelondb/decorators';

import {MM_TABLES} from '@constants/database';

const {SYSTEM} = MM_TABLES.SERVER;

/**
 * The System model is another set of key-value pair combination but this one
 * will mostly hold configuration information about the client, the licences and some
 * custom data (e.g. recent emoji used)
 */
export default class System extends Model {
    /** table (entity name) : System */
    static table = SYSTEM;

    /** name : The name or key value for the config */
    @field('name') name!: string;

    /** value : The value for that config/information */
    @json('value', (rawJson) => rawJson) value!: any;
}
