// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Model} from '@nozbe/watermelondb';
import {field} from '@nozbe/watermelondb/decorators';

import {MM_TABLES} from '@constants/database';

import type TermsOfServiceModelInterface from '@typings/database/models/servers/terms_of_service';

const {TERMS_OF_SERVICE} = MM_TABLES.SERVER;

/**
 * The model for Terms of Service
 */
export default class TermsOfServiceModel extends Model implements TermsOfServiceModelInterface {
    /** table (name) : TermsOfService */
    static table = TERMS_OF_SERVICE;

    /** accepted_at : the date the term has been accepted */
    @field('accepted_at') acceptedAt!: number;
}
