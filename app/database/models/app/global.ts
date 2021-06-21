// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Model} from '@nozbe/watermelondb';
import {field, json} from '@nozbe/watermelondb/decorators';

import {MM_TABLES} from '@constants/database';

const {GLOBAL} = MM_TABLES.APP;

// TODO : add TS definitions to sanitizer function signature.

/**
 * The Global model will act as a dictionary of name-value pairs.  The value field can be a JSON object or any other
 * data type.  It will hold information that applies to the whole app ( e.g. sidebar settings for tablets)
 */
export default class Global extends Model {
    /** table (name) : global */
    static table = GLOBAL;

    /** name : The label/key to use to retrieve the special 'value' */
    @field('name') name!: string;

    /** value : The value part of the key-value combination */
    @json('value', (rawJson) => rawJson) value!: any;
}
