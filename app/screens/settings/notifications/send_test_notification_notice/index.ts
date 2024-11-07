// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import {of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {observeConfigValue, observeLicense} from '@queries/servers/system';

import SendTestNotificationNotice from './send_test_notification_notice';

import type {WithDatabaseArgs} from '@typings/database/database';

const enhanced = withObservables([], ({database}: WithDatabaseArgs) => {
    return {
        isCloud: observeLicense(database).pipe(switchMap((v) => of$(v?.Cloud === 'true'))),
        telemetryId: observeConfigValue(database, 'TelemetryId').pipe(switchMap((v) => of$(v || ''))),
    };
});

export default withDatabase(enhanced(SendTestNotificationNotice));
