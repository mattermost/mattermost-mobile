// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import type CustomProfileFieldModel from './custom_profile_field';
import type UserModel from './user';
import type {Relation, Model} from '@nozbe/watermelondb';
import type {Associations} from '@nozbe/watermelondb/Model';

declare class CustomProfileAttributeModel extends Model {
    /** table (name) : CustomProfileAttribute */
    static table: string;

    /** associations : Describes every relationship to this table. */
    static associations: Associations;

    /** field_id : The identifier of the custom profile field this attribute is for */
    fieldId: string;

    /** user_id : The identifier of the user this attribute belongs to */
    userId: string;

    /** value : The value of the custom profile attribute */
    value: string;

    /** Relation to the custom profile field */
    field: Relation<CustomProfileFieldModel>;

    /** Relation to the user */
    user: Relation<UserModel>;
}

export default CustomProfileAttributeModel;
