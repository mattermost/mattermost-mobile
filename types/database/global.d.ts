// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Model} from '@nozbe/watermelondb';

/**
 * The Global model will act as a dictionary of name-value pairs.  The value field can be a JSON object or any other
 * data type.  It will hold information that applies to the whole app ( e.g. sidebar settings for tablets)
 */
export default class Global extends Model {
    /** table (entity name) : global */
    static table: string;

    /** name : The label/key to use to retrieve the special 'value' */
    name: string;

    /** value : The value part of the key-value combination */
    value: string;
}
