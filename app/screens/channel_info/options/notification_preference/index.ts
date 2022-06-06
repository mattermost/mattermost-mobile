// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import {of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {observeChannelSettings} from '@queries/servers/channel';

import NotificationPreference from './notification_preference';

import type {WithDatabaseArgs} from '@typings/database/database';

type Props = WithDatabaseArgs & {
    channelId: string;
}

const enhanced = withObservables(['channelId'], ({channelId, database}: Props) => {
    const settings = observeChannelSettings(database, channelId);
    const notifyLevel = settings.pipe(
        switchMap((s) => of$(s?.notifyProps.push)),
    );

    return {
        notifyLevel,
    };
});

export default withDatabase(enhanced(NotificationPreference));
