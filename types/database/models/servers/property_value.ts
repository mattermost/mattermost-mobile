// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import type PropertyFieldModel from './property_field';
import type {Model, Relation} from '@nozbe/watermelondb';
import type {Associations} from '@nozbe/watermelondb/Model';

declare class PropertyValueModel extends Model {
    static table: string;
    static associations: Associations;

    /** field_id : The property field this value answers */
    fieldId: string;

    /** target_id : The object this value belongs to (post, user, …) */
    targetId: string;

    /** target_type : The kind of target (e.g. 'post', 'user') */
    targetType: string;

    /** group_id : The property group this value belongs to */
    groupId: string;

    /** value : Serialized property value (shape depends on field type) */
    value: unknown | null;

    /** create_at : Timestamp when this value was created */
    createAt: number;

    /** update_at : Timestamp when this value was last updated */
    updateAt: number;

    /** delete_at : Timestamp when this value was deleted (0 if not deleted) */
    deleteAt: number;

    /** created_by : User id that created the value */
    createdBy: string;

    /** updated_by : User id that last updated the value */
    updatedBy: string;

    /** field : Relation to the PropertyField definition */
    field: Relation<PropertyFieldModel>;
}

export default PropertyValueModel;
