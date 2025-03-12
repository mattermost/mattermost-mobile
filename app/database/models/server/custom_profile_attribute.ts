// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {field, relation} from '@nozbe/watermelondb/decorators';
import Model, {type Associations} from '@nozbe/watermelondb/Model';

import {MM_TABLES} from '@constants/database';

const {CUSTOM_PROFILE_ATTRIBUTE, CUSTOM_PROFILE_FIELD, USER} = MM_TABLES.SERVER;

/**
 * The CustomProfileAttribute model represents the 'CUSTOM_PROFILE_ATTRIBUTE' table and stores
 * the custom profile attribute values for users.
 */
export default class CustomProfileAttributeModel extends Model {
    /** table (name) : CustomProfileAttribute */
    static table = CUSTOM_PROFILE_ATTRIBUTE;

    /** associations : Describes every relationship to this table. */
    static associations: Associations = {
        [CUSTOM_PROFILE_FIELD]: {type: 'belongs_to', key: 'field_id'},
        [USER]: {type: 'belongs_to', key: 'user_id'},
    };

    /** field_id : The identifier of the custom profile field this attribute is for */
    @field('field_id') fieldId!: string;

    /** user_id : The identifier of the user this attribute belongs to */
    @field('user_id') userId!: string;

    /** value : The value of the custom profile attribute */
    @field('value') value!: string;

    /** Relation to the custom profile field */
    @relation(CUSTOM_PROFILE_FIELD, 'field_id') field!: Model;

    /** Relation to the user */
    @relation(USER, 'user_id') user!: Model;
}
