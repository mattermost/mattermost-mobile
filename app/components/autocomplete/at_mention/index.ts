// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import {of as of$, combineLatest, Observable} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {Permissions} from '@constants';
import {AT_MENTION_REGEX, AT_MENTION_SEARCH_REGEX} from '@constants/autocomplete';
import {observeChannel} from '@queries/servers/channel';
import {observePermissionForChannel} from '@queries/servers/role';
import {observeLicense} from '@queries/servers/system';
import {observeCurrentTeam, observeTeam} from '@queries/servers/team';
import {observeCurrentUser, observeUsersForAutocomplete} from '@queries/servers/user';

import AtMention from './at_mention';

import type {WithDatabaseArgs} from '@typings/database/database';
import type TeamModel from '@typings/database/models/servers/team';

type OwnProps = {
    channelId?: string;
    value: string;
    cursorPosition: number;
    isSearch: boolean;
}

const getMatchTermForAtMention = (() => {
    let lastMatchTerm: string | null = null;
    let lastValue: string;
    let lastIsSearch: boolean;
    return (value: string, isSearch: boolean) => {
        if (value !== lastValue || isSearch !== lastIsSearch) {
            const regex = isSearch ? AT_MENTION_SEARCH_REGEX : AT_MENTION_REGEX;
            let term = value;
            if (term.startsWith('from: @') || term.startsWith('from:@')) {
                term = term.replace('@', '');
            }

            const match = term.match(regex);
            lastValue = value;
            lastIsSearch = isSearch;
            if (match) {
                lastMatchTerm = (isSearch ? match[1] : match[2]).toLowerCase();
            } else {
                lastMatchTerm = null;
            }
        }
        return lastMatchTerm;
    };
})();

const enhanced = withObservables(['value', 'cursorPosition', 'isSearch'], ({database, channelId, value, cursorPosition, isSearch}: WithDatabaseArgs & OwnProps) => {
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

        useChannelMentions = combineLatest([currentUser, currentChannel]).pipe(switchMap(([u, c]) => observePermissionForChannel(database, c, u, Permissions.USE_CHANNEL_MENTIONS, false)));
        useGroupMentions = combineLatest([currentUser, currentChannel, hasLicense]).pipe(
            switchMap(([u, c, lcs]) => (lcs ? observePermissionForChannel(database, c, u, Permissions.USE_GROUP_MENTIONS, false) : of$(false))),
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

    const matchTerm = getMatchTermForAtMention(value.substring(0, cursorPosition), isSearch);
    const users = teamId.pipe(
        switchMap((tId) => {
            if (matchTerm === null) {
                return of$({inChannel: [], outOfChannel: []});
            }
            return observeUsersForAutocomplete(database, tId!, channelId, matchTerm);
        }),
    );

    return {
        isChannelConstrained,
        isTeamConstrained,
        useChannelMentions,
        useGroupMentions,
        teamId,
        users,
        matchTerm: of$(matchTerm),
    };
});

export default withDatabase(enhanced(AtMention));
