// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import field from '@nozbe/watermelondb/decorators/field';
import json from '@nozbe/watermelondb/decorators/json';
import {Model} from '@nozbe/watermelondb';

import {MM_TABLES} from '@constants/database';

const {GLOBAL} = MM_TABLES.DEFAULT;

export default class Global extends Model {
    static table = GLOBAL

    @field('name') name!: string

    // TODO : add TS definitions to sanitizer function signature.

    // TODO : atm, the return type for 'value' is string[].  However, this return type can change to string/number/etc.  A broader definition will need to be applied and this return type updated accordingly.
    @json('value', (rawJson) => rawJson) value!: string[]
}
