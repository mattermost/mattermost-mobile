// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import Model, {Associations} from '@nozbe/watermelondb/Model';
import {field} from '@nozbe/watermelondb/decorators';

import {MM_TABLES} from '@constants/database';

const {PREFERENCE, USER} = MM_TABLES.SERVER;

export default class Preference extends Model {
    static table = PREFERENCE
    static associations: Associations = {
        [USER]: {type: 'belongs_to', key: 'user_id'},
    }

    @field('category') category!: string
    @field('name') name!: string
    @field('user_id') userId!: string
    @field('value') value!: string
}
