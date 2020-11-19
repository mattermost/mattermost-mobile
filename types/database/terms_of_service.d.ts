// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import {Model} from '@nozbe/watermelondb';
export default class Terms_of_service extends Model {
    static table: string;
    acceptedAt: number;
    termsOfServiceId: string;
}
