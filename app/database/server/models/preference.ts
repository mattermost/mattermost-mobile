// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import Model, {Associations} from '@nozbe/watermelondb/Model';
import {field, relation} from '@nozbe/watermelondb/decorators';

import {MM_TABLES} from '@constants/database';
import User from '@typings/database/user';

const {PREFERENCE, USER} = MM_TABLES.SERVER;

/**
 * The Preference model hold information about the user's preference in the app.
 * This includes settings about the account, the themes, etc.
 */
export default class Preference extends Model {
    /** table (entity name) : Preference */
    static table = PREFERENCE

    /** associations : Describes every relationship to this entity. */
    static associations: Associations = {

        /** A PREFERENCE can belong to only one USER  */
        [USER]: {type: 'belongs_to', key: 'user_id'},
    }

    /** category : The preference category ( e.g. Themes, Account settings etc..) */
    @field('category') category!: string

    /** name : The category name */
    @field('name') name!: string

    /** user_id : The foreign key of the user's record in this model */
    @field('user_id') userId!: string

    /** value : The preference's value */
    @field('value') value!: string

    /** user : The related record to the parent User model */
    @relation(USER, 'user_id') user!: User
}
