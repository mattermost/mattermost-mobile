// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import {of as of$, from as from$, combineLatest, Observable} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {Permissions} from '@constants';
import {observeChannel} from '@queries/servers/channel';
import {observeLicense} from '@queries/servers/system';
import {observeCurrentUser} from '@queries/servers/user';
import {hasPermissionForChannel} from '@utils/role';

import AtMention from './at_mention';

import type {WithDatabaseArgs} from '@typings/database/database';

type OwnProps = {channelId?: string}
const enhanced = withObservables([], ({database, channelId}: WithDatabaseArgs & OwnProps) => {
    const currentUser = observeCurrentUser(database);

    const hasLicense = observeLicense(database).pipe(
        switchMap((lcs) => of$(lcs?.IsLicensed === 'true')),
    );

    let useChannelMentions: Observable<boolean>;
    let useGroupMentions: Observable<boolean>;
    if (channelId) {
        const currentChannel = observeChannel(database, channelId);
        useChannelMentions = combineLatest([currentUser, currentChannel]).pipe(switchMap(([u, c]) => (u && c ? from$(hasPermissionForChannel(c, u, Permissions.USE_CHANNEL_MENTIONS, false)) : of$(false))));
        useGroupMentions = combineLatest([currentUser, currentChannel, hasLicense]).pipe(
            switchMap(([u, c, lcs]) => (lcs && u && c ? from$(hasPermissionForChannel(c, u, Permissions.USE_GROUP_MENTIONS, false)) : of$(false))),
        );
    } else {
        useChannelMentions = of$(false);
        useGroupMentions = of$(false);
    }

    return {
        useChannelMentions,
        useGroupMentions,
    };
});

export default withDatabase(enhanced(AtMention));
