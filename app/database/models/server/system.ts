// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Model} from '@nozbe/watermelondb';
import {json} from '@nozbe/watermelondb/decorators';

import {MM_TABLES} from '@constants/database';
import {safeParseJSON} from '@utils/helpers';

import type SystemModelInterface from '@typings/database/models/servers/system';

const {SYSTEM} = MM_TABLES.SERVER;

/**
 * The System model is another set of key-value pair combination but this one
 * will mostly hold configuration information about the client, the licences and some
 * custom data (e.g. recent emoji used)
 */
export default class SystemModel extends Model implements SystemModelInterface {
    /** table (name) : System */
    static table = SYSTEM;

    /** value : The value for that config/information and whose key will be the id column */
    @json('value', safeParseJSON) value!: any;
}
