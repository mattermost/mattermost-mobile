// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Model} from '@nozbe/watermelondb';
import {json} from '@nozbe/watermelondb/decorators';

import {MM_TABLES} from '@constants/database';
import {safeParseJSON} from '@utils/helpers';

const {GLOBAL} = MM_TABLES.APP;

// TODO : add TS definitions to sanitizer function signature.

/**
 * The Global model will act as a dictionary of name-value pairs.  The value field can be a JSON object or any other
 * data type.  It will hold information that applies to the whole app ( e.g. sidebar settings for tablets)
 */
export default class GlobalModel extends Model {
    /** table (name) : global */
    static table = GLOBAL;

    /** value : The value part of the key-value combination and whose key will be the id column  */
    @json('value', safeParseJSON) value!: any;
}
