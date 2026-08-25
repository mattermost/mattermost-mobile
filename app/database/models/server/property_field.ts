// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {children, field, json} from '@nozbe/watermelondb/decorators';
import Model, {type Associations} from '@nozbe/watermelondb/Model';

import {MM_TABLES} from '@constants/database';
import {safeParseJSON} from '@utils/helpers';

import type PropertyValueModel from './property_value';
import type {Query} from '@nozbe/watermelondb';
import type PropertyFieldModelInterface from '@typings/database/models/servers/property_field';

const {PROPERTY_FIELD, PROPERTY_VALUE} = MM_TABLES.SERVER;

/**
 * The PropertyField model represents the 'PropertyField' table and defines a
 * single property (name, type, options, scope, permissions).
 *
 * The `has_many` association on `field_id` lets consumers traverse to related
 * PropertyValue rows via `field.propertyValues`.
 */
export default class PropertyFieldModel extends Model implements PropertyFieldModelInterface {
    /** table (name) : PropertyField */
    static table = PROPERTY_FIELD;

    /** associations : Describes every relationship to this table. */
    static associations: Associations = {
        [PROPERTY_VALUE]: {type: 'has_many', foreignKey: 'field_id'},
    };

    /** group_id : The property group this field belongs to */
    @field('group_id') groupId!: string;

    /** name : The property name */
    @field('name') name!: string;

    /** type : The property type (e.g. 'text', 'select') */
    @field('type') type!: string;

    /** attrs : Free-form attributes for the property (options, sort order, …) */
    @json('attrs', safeParseJSON) attrs!: PropertyFieldAttrs | null;

    /** object_type : The object this property describes (e.g. 'card') */
    @field('object_type') objectType!: string;

    /** target_id : Scope target (channel/team id, empty for system) */
    @field('target_id') targetId!: string;

    /** target_type : Scope level (e.g. 'channel', 'team', 'system') */
    @field('target_type') targetType!: string;

    /** protected : Whether the field is system-protected */
    @field('protected') protected!: boolean;

    /** permission_field : The field driving permission evaluation */
    @field('permission_field') permissionField!: string | null;

    /** permission_values : Serialized permission values mapping */
    @json('permission_values', safeParseJSON) permissionValues!: unknown | null;

    /** permission_options : Serialized permission options mapping */
    @json('permission_options', safeParseJSON) permissionOptions!: unknown | null;

    /** create_at : Timestamp when this field was created */
    @field('create_at') createAt!: number;

    /** update_at : Timestamp when this field was last updated */
    @field('update_at') updateAt!: number;

    /** delete_at : Timestamp when this field was deleted (0 if not deleted) */
    @field('delete_at') deleteAt!: number;

    /** created_by : User id that created the field */
    @field('created_by') createdBy!: string;

    /** updated_by : User id that last updated the field */
    @field('updated_by') updatedBy!: string;

    /** propertyValues : Property values that reference this field */
    @children(PROPERTY_VALUE) propertyValues!: Query<PropertyValueModel>;
}
