// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {field, immutableRelation} from '@nozbe/watermelondb/decorators';
import Model, {type Associations} from '@nozbe/watermelondb/Model';

import {MM_TABLES} from '@constants/database';

import type {Relation} from '@nozbe/watermelondb';
import type PreferenceModelInterface from '@typings/database/models/servers/preference';
import type UserModel from '@typings/database/models/servers/user';

const {PREFERENCE, USER} = MM_TABLES.SERVER;

/**
 * The Preference model hold information about the user's preference in the app.
 * This includes settings about the account, the themes, etc.
 */
export default class PreferenceModel extends Model implements PreferenceModelInterface {
    /** table (name) : Preference */
    static table = PREFERENCE;

    /** associations : Describes every relationship to this table. */
    static associations: Associations = {

        /** A USER can have multiple PREFERENCE.(relationship is 1:N)*/
        [USER]: {type: 'belongs_to', key: 'user_id'},
    };

    /** category : The preference category ( e.g. Themes, Account settings etc..) */
    @field('category') category!: string;

    /** name : The category name */
    @field('name') name!: string;

    /** user_id : The foreign key of the user's record in this model */
    @field('user_id') userId!: string;

    /** value : The preference's value */
    @field('value') value!: string;

    /** user : The related record to the parent User model */
    @immutableRelation(USER, 'user_id') user!: Relation<UserModel>;
}
