// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {field, immutableRelation, json} from '@nozbe/watermelondb/decorators';
import Model, {type Associations} from '@nozbe/watermelondb/Model';

import {MM_TABLES} from '@constants/database';
import {safeParseJSON} from '@utils/helpers';

import type PropertyFieldModel from './property_field';
import type {Relation} from '@nozbe/watermelondb';
import type PropertyValueModelInterface from '@typings/database/models/servers/property_value';

const {PROPERTY_FIELD, PROPERTY_VALUE} = MM_TABLES.SERVER;

/**
 * The PropertyValue model represents the 'PropertyValue' table and stores a
 * single object's value for a single PropertyField.
 *
 * No `belongs_to` on `target_id` is declared because `target_type` is
 * polymorphic (e.g. 'post', 'user'); a typed WatermelonDB relation would be
 * wrong for user-typed targets. Queries go through `Q.where('target_id', ...)`.
 */
export default class PropertyValueModel extends Model implements PropertyValueModelInterface {
    /** table (name) : PropertyValue */
    static table = PROPERTY_VALUE;

    /** associations : Describes every relationship to this table. */
    static associations: Associations = {
        [PROPERTY_FIELD]: {type: 'belongs_to', key: 'field_id'},
    };

    /** field_id : The property field this value answers */
    @field('field_id') fieldId!: string;

    /** target_id : The object this value belongs to (post, user, …) */
    @field('target_id') targetId!: string;

    /** target_type : The kind of target (e.g. 'post', 'user') */
    @field('target_type') targetType!: string;

    /** group_id : The property group this value belongs to */
    @field('group_id') groupId!: string;

    /** value : Serialized property value (shape depends on field type) */
    @json('value', safeParseJSON) value!: unknown | null;

    /** create_at : Timestamp when this value was created */
    @field('create_at') createAt!: number;

    /** update_at : Timestamp when this value was last updated */
    @field('update_at') updateAt!: number;

    /** delete_at : Timestamp when this value was deleted (0 if not deleted) */
    @field('delete_at') deleteAt!: number;

    /** created_by : User id that created the value */
    @field('created_by') createdBy!: string;

    /** updated_by : User id that last updated the value */
    @field('updated_by') updatedBy!: string;

    /** field : Relation to the PropertyField definition */
    @immutableRelation(PROPERTY_FIELD, 'field_id') field!: Relation<PropertyFieldModel>;
}
