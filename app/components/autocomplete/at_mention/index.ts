// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import {of as of$, combineLatest, Observable} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {Permissions} from '@constants';
import {observeChannel} from '@queries/servers/channel';
import {observePermissionForChannel} from '@queries/servers/role';
import {observeCurrentTeamId, observeLicense} from '@queries/servers/system';
import {observeCurrentTeam} from '@queries/servers/team';
import {observeCurrentUser} from '@queries/servers/user';

import AtMention from './at_mention';

import type {WithDatabaseArgs} from '@typings/database/database';

type OwnProps = {channelId?: string}
const enhanced = withObservables([], ({database, channelId}: WithDatabaseArgs & OwnProps) => {
    const currentUser = observeCurrentUser(database);
    const currentTeam = observeCurrentTeam(database);
    const currentTeamId = observeCurrentTeamId(database);

    const hasLicense = observeLicense(database).pipe(
        switchMap((lcs) => of$(lcs?.IsLicensed === 'true')),
    );

    let useChannelMentions: Observable<boolean>;
    let useGroupMentions: Observable<boolean>;
    let isChannelConstrained: Observable<boolean>;
    let isTeamConstrained: Observable<boolean>;
    if (channelId) {
        const currentChannel = observeChannel(database, channelId);
        isChannelConstrained = currentChannel.pipe(
            switchMap((c) => of$(Boolean(c?.isGroupConstrained))),
        );
        isTeamConstrained = currentTeam.pipe(
            switchMap((t) => of$(Boolean(t?.isGroupConstrained))),
        );

        useChannelMentions = combineLatest([currentUser, currentChannel]).pipe(switchMap(([u, c]) => (u && c ? observePermissionForChannel(c, u, Permissions.USE_CHANNEL_MENTIONS, false) : of$(false))));
        useGroupMentions = combineLatest([currentUser, currentChannel, hasLicense]).pipe(
            switchMap(([u, c, lcs]) => (lcs && u && c ? observePermissionForChannel(c, u, Permissions.USE_GROUP_MENTIONS, false) : of$(false))),
        );
    } else {
        useChannelMentions = of$(false);
        useGroupMentions = of$(false);
        isChannelConstrained = of$(false);
        isTeamConstrained = of$(false);
    }

    return {
        isChannelConstrained,
        isTeamConstrained,
        useChannelMentions,
        useGroupMentions,
        currentTeamId,
    };
});

export default withDatabase(enhanced(AtMention));
