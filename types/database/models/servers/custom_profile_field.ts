// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import type CustomProfileAttributeModel from './custom_profile_attribute';
import type {Model, Query} from '@nozbe/watermelondb';
import type {Associations} from '@nozbe/watermelondb/Model';

export type CustomProfileFieldAttrs = {
    sort_order?: number;
    value_type?: string;
    options?: Array<{id: string; name: string; color?: string}>;
    [key: string]: unknown;
};

declare class CustomProfileFieldModel extends Model {
    static table: string;
    static associations: Associations;

    /** group_id : The identifier of the group this field belongs to */
    groupId: string;

    /** name : The name of the custom profile field */
    name: string;

    /** type : The type of values accepted (e.g., 'text') */
    type: string;

    /** target_id : The id of the target element (empty if system property) */
    targetId: string;

    /** target_type : The type of element this is assigned to (e.g., 'user', 'post', 'card') */
    targetType: string;

    /** create_at : The timestamp when this field was created */
    createAt: number;

    /** update_at : The timestamp when this field was last updated */
    updateAt: number;

    /** delete_at : The timestamp when this field was deleted (0 if not deleted) */
    deleteAt: number;

    /** attrs : Any extra properties of the field */
    attrs: CustomProfileFieldAttrs | null;

    /** customProfileAttributes : All the custom profile attributes for this field */
    customProfileAttributes: Query<CustomProfileAttributeModel>;
}

export default CustomProfileFieldModel;
