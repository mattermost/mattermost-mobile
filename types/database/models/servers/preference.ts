// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import type UserModel from './user';
import type {Relation, Model} from '@nozbe/watermelondb';
import type {Associations} from '@nozbe/watermelondb/Model';

/**
 * The Preference model hold information about the user's preference in the app.
 * This includes settings about the account, the themes, etc.
 */
declare class PreferenceModel extends Model {
    /** table (name) : Preference */
    static table: string;

    /** associations : Describes every relationship to this table. */
    static associations: Associations;

    /** category : The preference category ( e.g. Themes, Account settings etc..) */
    category: string;

    /** name : The category name */
    name: string;

    /** user_id : The foreign key of the user's record in this model */
    userId: string;

    /** value : The preference's value */
    value: string;

    /** user : The related record to the parent User model */
    user: Relation<UserModel>;
}

export default PreferenceModel;
