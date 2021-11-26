// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import {of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {MM_TABLES, SYSTEM_IDENTIFIERS} from '@constants/database';

import PostInput from './post_input';

import type {WithDatabaseArgs} from '@typings/database/database';
import type ChannelModel from '@typings/database/models/servers/channel';
import type SystemModel from '@typings/database/models/servers/system';

const {SERVER: {SYSTEM, CHANNEL}} = MM_TABLES;

type OwnProps = {
    channelId: string;
    rootId?: string;
}

const enhanced = withObservables([], ({database, channelId, rootId}: WithDatabaseArgs & OwnProps) => {
    const timeBetweenUserTypingUpdatesMilliseconds = database.get<SystemModel>(SYSTEM).findAndObserve(SYSTEM_IDENTIFIERS.CONFIG).pipe(
        switchMap(({value}: {value: ClientConfig}) => of$(parseInt(value.TimeBetweenUserTypingUpdatesMilliseconds, 10))),
    );

    let channel;
    if (rootId) {
        channel = database.get<ChannelModel>(CHANNEL).findAndObserve(channelId);
    } else {
        channel = database.get<SystemModel>(SYSTEM).findAndObserve(SYSTEM_IDENTIFIERS.CURRENT_CHANNEL_ID).pipe(
            switchMap((t) => database.get<ChannelModel>(CHANNEL).findAndObserve(t.value)),
        );
    }

    const channelDisplayName = channel.pipe(
        switchMap((c) => of$(c.displayName)),
    );

    return {
        timeBetweenUserTypingUpdatesMilliseconds,
        channelDisplayName,
    };
});

export default withDatabase(enhanced(PostInput));
