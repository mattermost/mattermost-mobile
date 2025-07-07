// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import React from 'react';
import {of as of$} from 'rxjs';
import {combineLatestWith, distinctUntilChanged, switchMap} from 'rxjs/operators';

import {General} from '@constants';
import {queryPlaybookRunsPerChannel} from '@playbooks/database/queries/run';
import {observeIsPlaybooksEnabled} from '@playbooks/database/queries/version';
import {observeChannel, observeChannelInfo} from '@queries/servers/channel';
import {observeCanAddBookmarks, queryBookmarks} from '@queries/servers/channel_bookmark';
import {observeConfigBooleanValue, observeCurrentTeamId, observeCurrentUserId} from '@queries/servers/system';
import {observeUser} from '@queries/servers/user';
import {
    getUserCustomStatus,
    getUserIdFromChannelName,
    isCustomStatusExpired as checkCustomStatusIsExpired,
} from '@utils/user';

import ChannelHeader from './header';

import type {WithDatabaseArgs} from '@typings/database/database';

type OwnProps = {
    channelId: string;
};

const enhanced = withObservables(['channelId'], ({channelId, database}: OwnProps & WithDatabaseArgs) => {
    const currentUserId = observeCurrentUserId(database);
    const teamId = observeCurrentTeamId(database);

    const channel = observeChannel(database, channelId);

    const channelType = channel.pipe(switchMap((c) => of$(c?.type)));
    const channelInfo = observeChannelInfo(database, channelId);

    const dmUser = currentUserId.pipe(
        combineLatestWith(channel),
        switchMap(([userId, c]) => {
            if (c?.type === General.DM_CHANNEL) {
                const teammateId = getUserIdFromChannelName(userId, c.name);
                return observeUser(database, teammateId);
            }

            return of$(undefined);
        }),
    );

    const isOwnDirectMessage = currentUserId.pipe(
        combineLatestWith(dmUser),
        switchMap(([userId, dm]) => of$(userId === dm?.id)),
    );

    const customStatus = dmUser.pipe(
        switchMap((dm) => of$(getUserCustomStatus(dm))),
    );

    const isCustomStatusExpired = dmUser.pipe(
        switchMap((dm) => of$(checkCustomStatusIsExpired(dm))),
    );

    const isCustomStatusEnabled = observeConfigBooleanValue(database, 'EnableCustomUserStatuses');
    const isPlaybooksEnabled = observeIsPlaybooksEnabled(database);

    // const searchTerm = channel.pipe(
    //     combineLatestWith(dmUser),
    //     switchMap(([c, dm]) => {
    //         if (c?.type === General.DM_CHANNEL) {
    //             return of$(dm ? `@${dm.username}` : '');
    //         } else if (c?.type === General.GM_CHANNEL) {
    //             return of$(`@${c.name}`);
    //         }

    //         return of$(c?.name);
    //     }),
    // );

    const displayName = channel.pipe(switchMap((c) => of$(c?.displayName)));
    const memberCount = channelInfo.pipe(
        combineLatestWith(dmUser),
        switchMap(([ci, dm]) => of$(dm ? undefined : ci?.memberCount)));
    const hasBookmarks = queryBookmarks(database, channelId).observeCount(false).pipe(
        switchMap((count) => of$(count > 0)),
        distinctUntilChanged(),
    );

    const isBookmarksEnabled = observeConfigBooleanValue(database, 'FeatureFlagChannelBookmarks');
    const canAddBookmarks = observeCanAddBookmarks(database, channelId);

    const activeRuns = isPlaybooksEnabled.pipe(
        switchMap((enabled) => {
            if (!enabled) {
                return of$([]);
            }
            return queryPlaybookRunsPerChannel(database, channelId, false).observe();
        }),
    );
    const activeRunId = activeRuns.pipe(
        switchMap((runs) => {
            if (runs.length !== 1) {
                // if there is more than one active run, we directly go to the playbook list
                // so we don't need the id (since it is more than one)
                return of$(undefined);
            }
            return of$(runs[0].id);
        }),
    );

    return {
        canAddBookmarks,
        channelType,
        customStatus,
        displayName,
        hasBookmarks,
        isBookmarksEnabled,
        isCustomStatusEnabled,
        isCustomStatusExpired,
        isOwnDirectMessage,
        memberCount,
        teamId,
        playbooksActiveRuns: activeRuns.pipe(switchMap((r) => of$(r.length))),
        hasPlaybookRuns: isPlaybooksEnabled.pipe(
            switchMap((enabled) => {
                if (!enabled) {
                    return of$(false);
                }
                return queryPlaybookRunsPerChannel(database, channelId).observeCount(false).pipe(
                    // eslint-disable-next-line max-nested-callbacks
                    switchMap((v) => of$(v > 0)),
                    distinctUntilChanged(),
                );
            }),
        ),
        isPlaybooksEnabled,
        activeRunId,

        // searchTerm,
    };
});

export default withDatabase(enhanced(React.memo(ChannelHeader)));
