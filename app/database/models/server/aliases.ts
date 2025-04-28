// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Model} from '@nozbe/watermelondb';
import {field} from '@nozbe/watermelondb/decorators';

import {MM_TABLES} from '@constants/database';

import type AliasesModelInterface from '@typings/database/models/servers/aliases';

const {ALIASES} = MM_TABLES.SERVER;

/**
 * The Config model is another set of key-value pair combination but this one
 * will hold the server configuration.
 */
export default class AliasesModel extends Model implements AliasesModelInterface {
    /** table (name) : Config */
    static table = ALIASES;

    @field('from') from!: string;
    @field('to') to!: string;
}
