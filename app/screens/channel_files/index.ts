// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import {of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {observeChannel} from '@queries/servers/channel';
import {observeCanDownloadFiles, observeConfigBooleanValue} from '@queries/servers/system';
import {observeCurrentTeam} from '@queries/servers/team';

import ChannelFiles from './channel_files';

import type {WithDatabaseArgs} from '@typings/database/database';

type Props = WithDatabaseArgs & {
    channelId: string;
}

const enhance = withObservables(['channelId'], ({channelId, database}: Props) => {
    const team = observeCurrentTeam(database);
    const channel = observeChannel(database, channelId);
    return {
        teamId: team.pipe(switchMap((t) => of$(t?.id))),
        channelId: channel.pipe(switchMap((c) => of$(c?.id))),
        canDownloadFiles: observeCanDownloadFiles(database),
        publicLinkEnabled: observeConfigBooleanValue(database, 'EnablePublicLink'),
    };
});

export default withDatabase(enhance(ChannelFiles));
