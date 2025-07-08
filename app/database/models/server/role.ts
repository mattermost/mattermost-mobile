// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Model} from '@nozbe/watermelondb';
import {field, json} from '@nozbe/watermelondb/decorators';

import {MM_TABLES} from '@constants/database';
import {safeParseJSONStringArray} from '@utils/helpers';

import type RoleModelInterface from '@typings/database/models/servers/role';

const {ROLE} = MM_TABLES.SERVER;

/**  The Role model will describe the set of permissions for each role */
export default class RoleModel extends Model implements RoleModelInterface {
    /** table (name) : Role */
    static table = ROLE;

    /** name  : The role's name */
    @field('name') name!: string;

    /** permissions : The different permissions associated to that role */
    @json('permissions', safeParseJSONStringArray) permissions!: string[];
}

