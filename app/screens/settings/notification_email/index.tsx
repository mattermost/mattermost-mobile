// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import {of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {Preferences} from '@constants';
import {getPreferenceValue} from '@helpers/api/preference';
import {queryPreferencesByCategoryAndName} from '@queries/servers/preference';
import {observeConfigBooleanValue} from '@queries/servers/system';
import {observeIsCRTEnabled} from '@queries/servers/thread';
import {observeCurrentUser} from '@queries/servers/user';

import NotificationEmail from './notification_email';

import type {WithDatabaseArgs} from '@typings/database/database';

const enhanced = withObservables([], ({database}: WithDatabaseArgs) => {
    return {
        currentUser: observeCurrentUser(database),
        enableEmailBatching: observeConfigBooleanValue(database, 'EnableEmailBatching'),
        emailInterval: queryPreferencesByCategoryAndName(database, Preferences.CATEGORIES.NOTIFICATIONS).
            observeWithColumns(['value']).pipe(
                switchMap((preferences) => of$(getPreferenceValue<string>(preferences, Preferences.CATEGORIES.NOTIFICATIONS, Preferences.EMAIL_INTERVAL, Preferences.INTERVAL_NOT_SET))),
            ),
        isCRTEnabled: observeIsCRTEnabled(database),
        sendEmailNotifications: observeConfigBooleanValue(database, 'SendEmailNotifications'),
    };
});

export default withDatabase(enhanced(NotificationEmail));
