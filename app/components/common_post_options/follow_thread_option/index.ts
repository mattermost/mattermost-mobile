// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import {of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {MM_TABLES} from '@constants/database';

import FollowThreadOption from './follow_thread_option';

import type {WithDatabaseArgs} from '@typings/database/database';
import type ChannelModel from '@typings/database/models/servers/channel';

const {SERVER: {CHANNEL}} = MM_TABLES;

const enhanced = withObservables(['channelId'], ({database, channelId}: WithDatabaseArgs & { channelId: string }) => {
    const teamId = database.get<ChannelModel>(CHANNEL).findAndObserve(channelId).pipe(
        switchMap((chan) => of$(chan.teamId)),
    );

    return {
        teamId,
    };
});

export default withDatabase(enhanced(FollowThreadOption));
