// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import {switchMap, of} from 'rxjs';

import {observeChannel, observeChannelMembers} from '@app/queries/servers/channel';
import {observeUser} from '@app/queries/servers/user';

import Drafts from './draft';

import type {WithDatabaseArgs} from '@typings/database/database';

type Props = {
    channelId: string;
} & WithDatabaseArgs;

const enhance = withObservables(['channelId'], ({channelId, database}: Props) => {
    const channel = observeChannel(database, channelId);
    const sendToUser = channel.pipe(
        switchMap((channelData) => {
            if (channelData?.type === 'D') {
                // Fetch the channel member for direct message channels
                return observeChannelMembers(database, channelId).pipe(
                    // eslint-disable-next-line max-nested-callbacks
                    switchMap((members) => {
                        if (members.length > 0) {
                            const userId = members[0]?.userId;
                            return observeUser(database, userId);
                        }
                        return of(undefined);
                    }),
                );
            }
            return of(undefined);
        }),
    );

    return {
        channel,
        sendToUser,
    };
});

export default withDatabase(enhance(Drafts));
