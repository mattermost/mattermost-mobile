// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import type {Model} from '@nozbe/watermelondb';

/**  The Role model will describe the set of permissions for each role */
declare class RoleModel extends Model {
    /** table (name) : Role */
    static table: string;

    /** name  : The role's name */
    name: string;

    /** permissions : The different permissions associated to that role */
    permissions: string[];
}

export default RoleModel;
