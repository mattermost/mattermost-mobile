// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {defineMessages} from 'react-intl';

import {searchGroupsByName, searchGroupsByNameInChannel, searchGroupsByNameInTeam} from '@actions/local/group';
import {AT_MENTION_REGEX, AT_MENTION_SEARCH_REGEX} from '@constants/autocomplete';
import DatabaseManager from '@database/manager';
import {getUsersFromDMSorted, queryAllUsers} from '@queries/servers/user';
import {hasTrailingSpaces} from '@utils/helpers';

import {SECTION_KEY_GROUPS, SECTION_KEY_IN_CHANNEL, SECTION_KEY_OUT_OF_CHANNEL, SECTION_KEY_SPECIAL, SECTION_KEY_TEAM_MEMBERS, emptyGroupList} from './constants';

import type {SpecialMention, UserMentionSections} from './types';
import type GroupModel from '@typings/database/models/servers/group';
import type UserModel from '@typings/database/models/servers/user';

export const getMatchTermForAtMention = (() => {
    let lastMatchTerm: string | null = null;
    let lastValue: string;
    let lastIsSearch: boolean;
    return (value: string, isSearch: boolean) => {
        if (value !== lastValue || isSearch !== lastIsSearch) {
            const regex = isSearch ? AT_MENTION_SEARCH_REGEX : AT_MENTION_REGEX;
            let term = value.toLowerCase();
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

const specialMentionsMessages = defineMessages({
    all: {
        id: 'suggestion.mention.all',
        defaultMessage: 'Notifies everyone in this channel',
    },
    channel: {
        id: 'suggestion.mention.channel',
        defaultMessage: 'Notifies everyone in this channel',
    },
    here: {
        id: 'suggestion.mention.here',
        defaultMessage: 'Notifies everyone online in this channel',
    },
});

const getSpecialMentions: () => SpecialMention[] = () => {
    return [{
        completeHandle: 'all',
        ...specialMentionsMessages.all,
    }, {
        completeHandle: 'channel',
        ...specialMentionsMessages.channel,
    }, {
        completeHandle: 'here',
        ...specialMentionsMessages.here,
    }];
};

export const checkSpecialMentions = (term: string) => {
    return getSpecialMentions().filter((m) => m.completeHandle.startsWith(term)).length > 0;
};

export const keyExtractor = (item: UserProfile) => {
    return item.id;
};

const filterAndSlice = (term: string, sortedMembers: Array<UserModel | UserProfile>) => {
    if (hasTrailingSpaces(term)) {
        const filteredReceivedUsers = filterResults(sortedMembers, term);
        return filteredReceivedUsers.slice(0, 20);
    }

    return sortedMembers.slice(0, 20);
};

export async function sortReceivedUsers(sUrl: string, term: string, receivedUsers: UserProfile[], outOfChannel: UserProfile[] | undefined) {
    const database = DatabaseManager.serverDatabases[sUrl]?.database;
    if (!database) {
        return [[], []];
    }
    const memberIds = receivedUsers.map((e) => e.id);
    const sortedMembers: Array<UserProfile | UserModel> = await getUsersFromDMSorted(database, memberIds);
    const sortedMembersOutOfChannel: Array<UserProfile | UserModel> = [];
    const sortedMembersId = new Set<string>(sortedMembers.map((e) => e.id));

    const membersNoDm = receivedUsers.filter((u) => !sortedMembersId.has(u.id));
    sortedMembers.push(...membersNoDm);

    if (outOfChannel?.length) {
        const outChannelMemberIds = outOfChannel.map((e) => e.id);

        // This only get us the users we have on the database.
        // We need to append those users from which we don't have
        // information at the end of the list.
        const outSortedMembers = await getUsersFromDMSorted(database, outChannelMemberIds);
        const idSet = new Set(outSortedMembers.map((v) => v.id));
        const outRest = outOfChannel.filter((v) => !idSet.has(v.id));
        sortedMembersOutOfChannel.push(...outSortedMembers, ...outRest);
    }

    const filteredMembers = filterAndSlice(term, sortedMembers);
    const filteredOutOfChannel = filterAndSlice(term, sortedMembersOutOfChannel);

    return [filteredMembers, filteredOutOfChannel];
}

export const filterResults = (users: Array<UserModel | UserProfile>, term: string) => {
    return users.filter((u) => {
        const firstName = ('firstName' in u ? u.firstName : u.first_name).toLowerCase();
        const lastName = ('lastName' in u ? u.lastName : u.last_name).toLowerCase();
        const fullName = `${firstName} ${lastName}`;
        return u.username.toLowerCase().includes(term) ||
            u.nickname.toLowerCase().includes(term) ||
            fullName.includes(term) ||
            u.email.toLowerCase().includes(term);
    });
};

const sectionMessages = defineMessages({
    members: {
        id: 'mobile.suggestion.members',
        defaultMessage: 'Members',
    },
    groups: {
        id: 'suggestion.mention.groups',
        defaultMessage: 'Group Mentions',
    },
    special: {
        id: 'suggestion.mention.special',
        defaultMessage: 'Special Mentions',
    },
    users: {
        id: 'suggestion.mention.users',
        defaultMessage: 'Users',
    },
    nonmembers: {
        id: 'suggestion.mention.nonmembers',
        defaultMessage: 'Not in Channel',
    },
});

export const makeSections = (teamMembers: Array<UserProfile | UserModel>, usersInChannel: Array<UserProfile | UserModel>, usersOutOfChannel: Array<UserProfile | UserModel>, groups: GroupModel[], showSpecialMentions: boolean, isLocal = false, isSearch = false) => {
    const newSections: UserMentionSections = [];

    if (isSearch) {
        if (teamMembers.length) {
            newSections.push({
                ...sectionMessages.members,
                data: teamMembers,
                key: SECTION_KEY_TEAM_MEMBERS,
            });
        }
    } else if (isLocal) {
        if (teamMembers.length) {
            newSections.push({
                ...sectionMessages.members,
                data: teamMembers,
                key: SECTION_KEY_TEAM_MEMBERS,
            });
        }

        if (groups.length) {
            newSections.push({
                ...sectionMessages.groups,
                data: groups,
                key: SECTION_KEY_GROUPS,
            });
        }

        if (showSpecialMentions) {
            newSections.push({
                ...sectionMessages.special,
                data: getSpecialMentions(),
                key: SECTION_KEY_SPECIAL,
            });
        }
    } else {
        if (usersInChannel.length) {
            newSections.push({
                ...sectionMessages.users,
                data: usersInChannel,
                key: SECTION_KEY_IN_CHANNEL,
            });
        }

        if (groups.length) {
            newSections.push({
                ...sectionMessages.groups,
                data: groups,
                key: SECTION_KEY_GROUPS,
            });
        }

        if (showSpecialMentions) {
            newSections.push({
                ...sectionMessages.special,
                data: getSpecialMentions(),
                key: SECTION_KEY_SPECIAL,
            });
        }

        if (usersOutOfChannel.length) {
            newSections.push({
                ...sectionMessages.nonmembers,
                data: usersOutOfChannel,
                key: SECTION_KEY_OUT_OF_CHANNEL,
            });
        }
    }
    return newSections;
};

export const searchGroups = async (serverUrl: string, matchTerm: string, useGroupMentions: boolean, isChannelConstrained: boolean, isTeamConstrained: boolean, channelId?: string, teamId?: string) => {
    try {
        if (useGroupMentions && matchTerm && matchTerm !== '') {
            let g = emptyGroupList;

            if (isChannelConstrained) {
                // If the channel is constrained, we only show groups for that channel
                if (channelId) {
                    g = await searchGroupsByNameInChannel(serverUrl, matchTerm, channelId);
                }
            } else if (isTeamConstrained) {
                // If there is no channel constraint, but a team constraint - only show groups for team
                g = await searchGroupsByNameInTeam(serverUrl, matchTerm, teamId!);
            } else {
                // No constraints? Search all groups
                g = await searchGroupsByName(serverUrl, matchTerm || '');
            }

            return g.length ? g : emptyGroupList;
        }
        return emptyGroupList;
    } catch (error) {
        return emptyGroupList;
    }
};

export const getAllUsers = async (serverUrl: string) => {
    const database = DatabaseManager.serverDatabases[serverUrl]?.database;
    if (!database) {
        return [];
    }

    return queryAllUsers(database).fetch();
};
