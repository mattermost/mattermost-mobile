// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import {of as of$} from 'rxjs';
import {map, switchMap} from 'rxjs/operators';

import {CHANNEL_MENTION_REGEX, CHANNEL_MENTION_REGEX_DELAYED, CHANNEL_MENTION_SEARCH_REGEX} from '@constants/autocomplete';
import {observeChannel, queryAllMyChannel, queryChannelsForAutocomplete} from '@queries/servers/channel';
import {observeConfigBooleanValue, observeCurrentTeamId, observeCurrentUserId} from '@queries/servers/system';

import ChannelMention from './channel_mention';

import type {Database} from '@nozbe/watermelondb';
import type {WithDatabaseArgs} from '@typings/database/database';
import type ChannelModel from '@typings/database/models/servers/channel';

const getMatchTermForChannelMention = (() => {
    let lastMatchTerm: string | null = null;
    let lastValue: string;
    let lastMatchPattern: RegExp;
    let lastIsSearch: boolean;
    return (value: string, matchPattern: RegExp, isSearch: boolean) => {
        if (value !== lastValue || matchPattern !== lastMatchPattern || isSearch !== lastIsSearch) {
            const match = value.match(matchPattern);
            lastValue = value;
            lastMatchPattern = matchPattern;
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
        currentUserId: observeCurrentUserId(database),
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

function observeMatchPattern(isSearch: boolean, database: Database) {
    let matchPattern;

    if (isSearch) {
        matchPattern = of$(CHANNEL_MENTION_SEARCH_REGEX);
    } else {
        matchPattern = observeConfigBooleanValue(database, 'DelayChannelAutocomplete').pipe(map((c) => {
            return c ? CHANNEL_MENTION_REGEX_DELAYED : CHANNEL_MENTION_REGEX;
        }));
    }

    return matchPattern;
}

const enhanced = withObservables(['value', 'isSearch', 'teamId', 'cursorPosition'], ({value, isSearch, teamId, cursorPosition, database}: OwnProps) => {
    const matchTerm = observeMatchPattern(isSearch, database).pipe(map((regexp) => {
        return getMatchTermForChannelMention(value.substring(0, cursorPosition), regexp, isSearch);
    }));

    const localChannels = matchTerm.pipe(switchMap((term) => {
        return term === null ? of$(emptyChannelList) : queryChannelsForAutocomplete(database, term, isSearch, teamId).observe();
    }));

    return {
        matchTerm,
        localChannels,
    };
});

export default withDatabase(withMembers(withTeamId(enhanced(ChannelMention))));
