// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import type {Model} from '@nozbe/watermelondb';

/**
 * The Global model will act as a dictionary of name-value pairs.  The value field can be a JSON object or any other
 * data type.  It will hold information that applies to the whole app ( e.g. sidebar settings for tablets)
 */
declare class GlobalModel extends Model {
    /** table (name) : global */
    static table: string;

    /** value : The value part of the key-value combination and whose key will be the id column  */
    value: any;
}

export default GlobalModel;
