// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import {of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {CHANNEL_MENTION_REGEX, CHANNEL_MENTION_SEARCH_REGEX} from '@constants/autocomplete';
import {observeChannel, queryAllMyChannel, queryChannelsForAutocomplete} from '@queries/servers/channel';
import {observeCurrentTeamId} from '@queries/servers/system';

import ChannelMention from './channel_mention';

import type {WithDatabaseArgs} from '@typings/database/database';
import type ChannelModel from '@typings/database/models/servers/channel';

const getMatchTermForChannelMention = (() => {
    let lastMatchTerm: string | null = null;
    let lastValue: string;
    let lastIsSearch: boolean;
    return (value: string, isSearch: boolean) => {
        if (value !== lastValue || isSearch !== lastIsSearch) {
            const regex = isSearch ? CHANNEL_MENTION_SEARCH_REGEX : CHANNEL_MENTION_REGEX;
            const match = value.match(regex);
            lastValue = value;
            lastIsSearch = isSearch;
            if (match) {
                if (isSearch) {
                    lastMatchTerm = match[1].toLowerCase();
                } else if (match.index && match.index > 0 && value[match.index - 1] === '~') {
                    lastMatchTerm = null;
                } else {
                    lastMatchTerm = match[2].toLowerCase();
                }
            } else {
                lastMatchTerm = null;
            }
        }
        return lastMatchTerm;
    };
})();

type WithTeamIdProps = {
    teamId?: string;
    channelId?: string;
} & WithDatabaseArgs;

type OwnProps = {
    value: string;
    isSearch: boolean;
    cursorPosition: number;
    teamId: string;
} & WithDatabaseArgs;

const emptyChannelList: ChannelModel[] = [];

const withMembers = withObservables([], ({database}: WithDatabaseArgs) => {
    return {
        myMembers: queryAllMyChannel(database).observe(),
    };
});

const withTeamId = withObservables(['teamId', 'channelId'], ({teamId, channelId, database}: WithTeamIdProps) => {
    let currentTeamId;
    if (teamId) {
        currentTeamId = of$(teamId);
    } else if (channelId) {
        currentTeamId = observeChannel(database, channelId).pipe(switchMap((c) => {
            return c?.teamId ? of$(c.teamId) : observeCurrentTeamId(database);
        }));
    } else {
        currentTeamId = observeCurrentTeamId(database);
    }

    return {
        teamId: currentTeamId,
    };
});

const enhanced = withObservables(['value', 'isSearch', 'teamId', 'cursorPosition'], ({value, isSearch, teamId, cursorPosition, database}: OwnProps) => {
    const matchTerm = getMatchTermForChannelMention(value.substring(0, cursorPosition), isSearch);

    const localChannels = matchTerm === null ? of$(emptyChannelList) : queryChannelsForAutocomplete(database, matchTerm, isSearch, teamId).observe();

    return {
        matchTerm: of$(matchTerm),
        localChannels,
    };
});

export default withDatabase(withMembers(withTeamId(enhanced(ChannelMention))));
