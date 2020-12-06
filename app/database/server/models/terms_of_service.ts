// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import field from '@nozbe/watermelondb/decorators/field';
import {Model} from '@nozbe/watermelondb';

import {MM_TABLES} from '@constants/database';

export default class Terms_of_service extends Model {
    static table = MM_TABLES.SERVER.TERMS_OF_SERVICE

    @field('accepted_at') acceptedAt!: number
    @field('term_of_service_id') termsOfServiceId!: string
}
