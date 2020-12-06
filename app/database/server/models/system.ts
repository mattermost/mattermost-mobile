// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Model} from '@nozbe/watermelondb';
import {field, json} from '@nozbe/watermelondb/decorators';

import {MM_TABLES} from '@constants/database';

const {SYSTEM} = MM_TABLES.SERVER;

export default class System extends Model {
    static table = SYSTEM

    @field('name') name!: string
    @json('value', (rawJson) => rawJson) value!: string[]
}
