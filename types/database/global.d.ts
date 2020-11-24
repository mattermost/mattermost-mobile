// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import {Model} from '@nozbe/watermelondb';
export default class Global extends Model {
    static table: string;
    name: string;

    // TODO : atm, the return type for 'value' is string[].  However, this return type can change to string/number/etc.  A broader definition will need to be applied and this return type updated accordingly.
    value: string[];
}
