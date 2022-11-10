// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Model} from '@nozbe/watermelondb';
import {field} from '@nozbe/watermelondb/decorators';

import {MM_TABLES} from '@constants/database';

import type ConfigModelInterface from '@typings/database/models/servers/config';

const {CONFIG} = MM_TABLES.SERVER;

/**
 * The Config model is another set of key-value pair combination but this one
 * will hold the server configuration.
 */
export default class ConfigModel extends Model implements ConfigModelInterface {
    /** table (name) : Config */
    static table = CONFIG;

    /** value : The value for that config/information and whose key will be the id column */
    @field('value') value!: string;
}
