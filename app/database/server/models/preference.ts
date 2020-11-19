// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import Model, {Associations} from '@nozbe/watermelondb/Model';
import {MM_TABLES} from '@constants/database';
import field from '@nozbe/watermelondb/decorators/field';

export default class Preference extends Model {
    static table = MM_TABLES.SERVER.PREFERENCE
    static associations: Associations = {
        [MM_TABLES.SERVER.USER]: {type: 'belongs_to', key: 'user_id'},
    }

    @field('category') category!: string
    @field('name') name!: string
    @field('user_id') userId!: string
    @field('value') value!: string
}
