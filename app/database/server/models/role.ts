// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Model} from '@nozbe/watermelondb';
import {field, json} from '@nozbe/watermelondb/decorators';

import {MM_TABLES} from '@constants/database';

const {ROLE} = MM_TABLES.SERVER;

/**  The Role model will describe the set of permissions for each role */
export default class Role extends Model {
    /** table (entity name) : Role */
    static table = ROLE;

    /** name  : The role's name */
    @field('name') name!: string;

    /** permissions : The different permissions associated to that role */
    @json('permissions', (rawJson) => rawJson) permissions!: string[];
}

