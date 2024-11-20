// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import {of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {Preferences} from '@constants';
import {getPreferenceValue} from '@helpers/api/preference';
import {queryPreferencesByCategoryAndName} from '@queries/servers/preference';
import {observeConfigBooleanValue, observeConfigValue} from '@queries/servers/system';
import {observeIsCRTEnabled} from '@queries/servers/thread';
import {observeCurrentUser} from '@queries/servers/user';

import NotificationSettings from './notifications';

import type {WithDatabaseArgs} from '@typings/database/database';

const enhanced = withObservables([], ({database}: WithDatabaseArgs) => {
    return {
        currentUser: observeCurrentUser(database),
        isCRTEnabled: observeIsCRTEnabled(database),
        enableAutoResponder: observeConfigBooleanValue(database, 'ExperimentalEnableAutomaticReplies'),
        enableEmailBatching: observeConfigBooleanValue(database, 'EnableEmailBatching'),
        emailInterval: queryPreferencesByCategoryAndName(database, Preferences.CATEGORIES.NOTIFICATIONS).
            observeWithColumns(['value']).pipe(
                switchMap((preferences) => of$(getPreferenceValue<string>(preferences, Preferences.CATEGORIES.NOTIFICATIONS, Preferences.EMAIL_INTERVAL, Preferences.INTERVAL_NOT_SET))),
            ),
        sendEmailNotifications: observeConfigBooleanValue(database, 'SendEmailNotifications'),
        serverVersion: observeConfigValue(database, 'Version'),
    };
});

export default withDatabase(enhanced(NotificationSettings));
