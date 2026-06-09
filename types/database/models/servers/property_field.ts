// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import type PropertyValueModel from './property_value';
import type {Model, Query} from '@nozbe/watermelondb';
import type {Associations} from '@nozbe/watermelondb/Model';

declare class PropertyFieldModel extends Model {
    static table: string;
    static associations: Associations;

    /** group_id : The property group this field belongs to */
    groupId: string;

    /** name : The property name */
    name: string;

    /** type : The property type (e.g. 'text', 'select') */
    type: string;

    /** attrs : Free-form attributes for the property (options, sort order, …) */
    attrs: PropertyFieldAttrs | null;

    /** object_type : The object this property describes (e.g. 'card') */
    objectType: string;

    /** target_id : Scope target (channel/team id, empty for system) */
    targetId: string;

    /** target_type : Scope level (e.g. 'channel', 'team', 'system') */
    targetType: string;

    /** protected : Whether the field is system-protected */
    protected: boolean;

    /** permission_field : The field driving permission evaluation */
    permissionField: string | null;

    /** permission_values : Serialized permission values mapping */
    permissionValues: unknown | null;

    /** permission_options : Serialized permission options mapping */
    permissionOptions: unknown | null;

    /** create_at : Timestamp when this field was created */
    createAt: number;

    /** update_at : Timestamp when this field was last updated */
    updateAt: number;

    /** delete_at : Timestamp when this field was deleted (0 if not deleted) */
    deleteAt: number;

    /** created_by : User id that created the field */
    createdBy: string;

    /** updated_by : User id that last updated the field */
    updatedBy: string;

    /** propertyValues : Property values that reference this field */
    propertyValues: Query<PropertyValueModel>;
}

export default PropertyFieldModel;
