// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {searchChannels} from '@actions/remote/channel';
import {searchUsers} from '@actions/remote/user';
import {COMMAND_SUGGESTION_CHANNEL, COMMAND_SUGGESTION_USER} from '@constants/apps';

export async function inTextMentionSuggestions(serverUrl: string, pretext: string, channelID: string, teamID: string, delimiter = ''): Promise<AutocompleteSuggestion[] | null> {
    const separatedWords = pretext.split(' ');
    const incompleteLessLastWord = separatedWords.slice(0, -1).join(' ');
    const lastWord = separatedWords[separatedWords.length - 1];
    if (lastWord.startsWith('@')) {
        const res = await searchUsers(serverUrl, lastWord.substring(1), teamID, channelID);
        const users = await getUserSuggestions(res.users);
        users.forEach((u) => {
            let complete = incompleteLessLastWord ? incompleteLessLastWord + ' ' + u.Complete : u.Complete;
            if (delimiter) {
                complete = delimiter + complete;
            }
            u.Complete = complete;
        });
        return users;
    }

    if (lastWord.startsWith('~') && !lastWord.startsWith('~~')) {
        const res = await searchChannels(serverUrl, lastWord.substring(1), teamID);
        const channels = await getChannelSuggestions(res.channels);
        channels.forEach((c) => {
            let complete = incompleteLessLastWord ? incompleteLessLastWord + ' ' + c.Complete : c.Complete;
            if (delimiter) {
                complete = delimiter + complete;
            }
            c.Complete = complete;
        });
        return channels;
    }

    return null;
}

export async function getUserSuggestions(usersAutocomplete?: {users: UserProfile[]; out_of_channel?: UserProfile[]}): Promise<AutocompleteSuggestion[]> {
    const notFoundSuggestions = [{
        Complete: '',
        Suggestion: '',
        Description: 'No user found',
        Hint: '',
        IconData: '',
    }];
    if (!usersAutocomplete) {
        return notFoundSuggestions;
    }

    if (!usersAutocomplete.users.length && !usersAutocomplete.out_of_channel?.length) {
        return notFoundSuggestions;
    }

    const items: AutocompleteSuggestion[] = [];
    usersAutocomplete.users.forEach((u) => {
        items.push(getUserSuggestion(u));
    });
    usersAutocomplete.out_of_channel?.forEach((u) => {
        items.push(getUserSuggestion(u));
    });

    return items;
}

export async function getChannelSuggestions(channels?: Channel[]): Promise<AutocompleteSuggestion[]> {
    const notFoundSuggestion = [{
        Complete: '',
        Suggestion: '',
        Description: 'No channel found',
        Hint: '',
        IconData: '',
    }];
    if (!channels?.length) {
        return notFoundSuggestion;
    }

    const items = channels.map((c) => {
        return {
            Complete: '~' + c.name,
            Suggestion: '',
            Description: '',
            Hint: '',
            IconData: '',
            type: COMMAND_SUGGESTION_CHANNEL,
            item: c,
        };
    });

    return items;
}

function getUserSuggestion(u: UserProfile) {
    return {
        Complete: '@' + u.username,
        Suggestion: '',
        Description: '',
        Hint: '',
        IconData: '',
        type: COMMAND_SUGGESTION_USER,
        item: u,
    };
}
