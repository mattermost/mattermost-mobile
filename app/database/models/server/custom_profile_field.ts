// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {field, json, children} from '@nozbe/watermelondb/decorators';
import Model, {type Associations} from '@nozbe/watermelondb/Model';

import {MM_TABLES} from '@constants/database';
import {safeParseJSON} from '@utils/helpers';

import type CustomProfileAttributeModel from './custom_profile_attribute';
import type {Query} from '@nozbe/watermelondb';
import type CustomProfileFieldModelInterface from '@typings/database/models/servers/custom_profile_field';

const {CUSTOM_PROFILE_ATTRIBUTE, CUSTOM_PROFILE_FIELD} = MM_TABLES.SERVER;

/**
 * The CustomProfileField model represents the 'CUSTOM_PROFILE_FIELD' table and defines
 * the custom profile fields available in the system.
 */
export default class CustomProfileFieldModel extends Model implements CustomProfileFieldModelInterface {
    /** table (name) : CustomProfileField */
    static table = CUSTOM_PROFILE_FIELD;

    /** associations : Describes every relationship to this table. */
    static associations: Associations = {
        [CUSTOM_PROFILE_ATTRIBUTE]: {type: 'has_many', foreignKey: 'field_id'},
    };

    /** group_id : The identifier of the group this field belongs to */
    @field('group_id') groupId!: string;

    /** name : The name of the custom profile field */
    @field('name') name!: string;

    /** type : The type of values accepted (e.g., 'text') */
    @field('type') type!: string;

    /** target_id : The id of the target element (empty if system property) */
    @field('target_id') targetId!: string;

    /** target_type : The type of element this is assigned to (e.g., 'user', 'post', 'card') */
    @field('target_type') targetType!: string;

    /** create_at : The timestamp when this field was created */
    @field('create_at') createAt!: number;

    /** update_at : The timestamp when this field was last updated */
    @field('update_at') updateAt!: number;

    /** delete_at : The timestamp when this field was deleted (0 if not deleted) */
    @field('delete_at') deleteAt!: number;

    /** attrs : Any extra properties of the field */
    @json('attrs', safeParseJSON) attrs!: {
        sort_order?: number;
        value_type?: string;
        options?: Array<{id: string; name: string; color?: string}>;
        [key: string]: unknown;
    } | null;

    /** customProfileAttributes : All the custom profile attributes for this field */
    @children(CUSTOM_PROFILE_ATTRIBUTE) customProfileAttributes!: Query<CustomProfileAttributeModel>;
}
