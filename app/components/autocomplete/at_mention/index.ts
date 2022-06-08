// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import {of as of$, combineLatest, Observable} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {Permissions} from '@constants';
import {observeChannel} from '@queries/servers/channel';
import {observePermissionForChannel} from '@queries/servers/role';
import {observeLicense} from '@queries/servers/system';
import {observeCurrentTeam, observeTeam} from '@queries/servers/team';
import {observeCurrentUser} from '@queries/servers/user';

import AtMention from './at_mention';

import type {WithDatabaseArgs} from '@typings/database/database';
import type TeamModel from '@typings/database/models/servers/team';

type OwnProps = {channelId?: string}
const enhanced = withObservables([], ({database, channelId}: WithDatabaseArgs & OwnProps) => {
    const currentUser = observeCurrentUser(database);

    const hasLicense = observeLicense(database).pipe(
        switchMap((lcs) => of$(lcs?.IsLicensed === 'true')),
    );

    let useChannelMentions: Observable<boolean>;
    let useGroupMentions: Observable<boolean>;
    let isChannelConstrained: Observable<boolean>;
    let isTeamConstrained: Observable<boolean>;
    let team: Observable<TeamModel | undefined>;

    if (channelId) {
        const currentChannel = observeChannel(database, channelId);
        team = currentChannel.pipe(switchMap((c) => {
            return c?.teamId ? observeTeam(database, c.teamId) : observeCurrentTeam(database);
        }));

        isChannelConstrained = currentChannel.pipe(
            switchMap((c) => of$(Boolean(c?.isGroupConstrained))),
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
        team = observeCurrentTeam(database);
    }

    isTeamConstrained = team.pipe(
        switchMap((t) => of$(Boolean(t?.isGroupConstrained))),
    );
    const teamId = team.pipe(switchMap((t) => of$(t?.id)));

    return {
        isChannelConstrained,
        isTeamConstrained,
        useChannelMentions,
        useGroupMentions,
        teamId,
    };
});

export default withDatabase(enhanced(AtMention));
