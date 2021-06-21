// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Model} from '@nozbe/watermelondb';

/**
 * The model for Terms of Service
 */
export default class TermsOfService extends Model {
    /** table (name) : TermsOfService */
    static table: string;

    /** accepted_at : the date the term has been accepted */
    acceptedAt: number;
}
