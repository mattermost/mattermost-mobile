// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import field from '@nozbe/watermelondb/decorators/field';
import {Model} from '@nozbe/watermelondb';

import {MM_TABLES} from '@constants/database';

const {TERMS_OF_SERVICE} = MM_TABLES.SERVER;

export default class Terms_of_service extends Model {
    static table = TERMS_OF_SERVICE

    @field('accepted_at') acceptedAt!: number
}
