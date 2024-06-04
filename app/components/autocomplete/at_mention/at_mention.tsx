// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {debounce} from 'lodash';
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {Platform, SectionList, type SectionListData, type SectionListRenderItemInfo, type StyleProp, type ViewStyle} from 'react-native';

import {searchGroupsByName, searchGroupsByNameInChannel, searchGroupsByNameInTeam} from '@actions/local/group';
import {searchUsers} from '@actions/remote/user';
import GroupMentionItem from '@components/autocomplete/at_mention_group/at_mention_group';
import AtMentionItem from '@components/autocomplete/at_mention_item';
import AutocompleteSectionHeader from '@components/autocomplete/autocomplete_section_header';
import SpecialMentionItem from '@components/autocomplete/special_mention_item';
import {AT_MENTION_REGEX, AT_MENTION_SEARCH_REGEX} from '@constants/autocomplete';
import {useServerUrl} from '@context/server';
import DatabaseManager from '@database/manager';
import {t} from '@i18n';
import {queryAllUsers, getUsersFromDMSorted} from '@queries/servers/user';
import {hasTrailingSpaces} from '@utils/helpers';

import type GroupModel from '@typings/database/models/servers/group';
import type UserModel from '@typings/database/models/servers/user';

const SECTION_KEY_TEAM_MEMBERS = 'teamMembers';
const SECTION_KEY_IN_CHANNEL = 'inChannel';
const SECTION_KEY_SPECIAL = 'special';
const SECTION_KEY_GROUPS = 'groups';

type SpecialMention = {
    completeHandle: string;
    id: string;
    defaultMessage: string;
}

type UserMentionSections = Array<SectionListData<UserProfile|UserModel|GroupModel|SpecialMention>>

const getMatchTermForAtMention = (() => {
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

const getSpecialMentions: () => SpecialMention[] = () => {
    return [{
        completeHandle: 'all',
        id: t('suggestion.mention.all'),
        defaultMessage: 'Notifies everyone in this channel',
    }, {
        completeHandle: 'channel',
        id: t('suggestion.mention.channel'),
        defaultMessage: 'Notifies everyone in this channel',
    }, {
        completeHandle: 'here',
        id: t('suggestion.mention.here'),
        defaultMessage: 'Notifies everyone online in this channel',
    }];
};

const checkSpecialMentions = (term: string) => {
    return getSpecialMentions().filter((m) => m.completeHandle.startsWith(term)).length > 0;
};

const keyExtractor = (item: UserProfile) => {
    return item.id;
};

const filterResults = (users: Array<UserModel | UserProfile>, term: string) => {
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

const makeSections = (teamMembers: Array<UserProfile | UserModel>, users: Array<UserProfile | UserModel>, groups: GroupModel[], showSpecialMentions: boolean, isLocal = false, isSearch = false) => {
    const newSections: UserMentionSections = [];

    if (isSearch) {
        if (teamMembers.length) {
            newSections.push({
                id: t('mobile.suggestion.members'),
                defaultMessage: 'Members',
                data: teamMembers,
                key: SECTION_KEY_TEAM_MEMBERS,
            });
        }
    } else if (isLocal) {
        if (teamMembers.length) {
            newSections.push({
                id: t('mobile.suggestion.members'),
                defaultMessage: 'Members',
                data: teamMembers,
                key: SECTION_KEY_TEAM_MEMBERS,
            });
        }

        if (groups.length) {
            newSections.push({
                id: t('suggestion.mention.groups'),
                defaultMessage: 'Group Mentions',
                data: groups,
                key: SECTION_KEY_GROUPS,
            });
        }

        if (showSpecialMentions) {
            newSections.push({
                id: t('suggestion.mention.special'),
                defaultMessage: 'Special Mentions',
                data: getSpecialMentions(),
                key: SECTION_KEY_SPECIAL,
            });
        }
    } else {
        if (users.length) {
            newSections.push({
                id: t('suggestion.mention.users'),
                defaultMessage: 'Users',
                data: users,
                key: SECTION_KEY_IN_CHANNEL,
            });
        }

        if (groups.length) {
            newSections.push({
                id: t('suggestion.mention.groups'),
                defaultMessage: 'Group Mentions',
                data: groups,
                key: SECTION_KEY_GROUPS,
            });
        }

        if (showSpecialMentions) {
            newSections.push({
                id: t('suggestion.mention.special'),
                defaultMessage: 'Special Mentions',
                data: getSpecialMentions(),
                key: SECTION_KEY_SPECIAL,
            });
        }
    }
    return newSections;
};

const searchGroups = async (serverUrl: string, matchTerm: string, useGroupMentions: boolean, isChannelConstrained: boolean, isTeamConstrained: boolean, channelId?: string, teamId?: string) => {
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

type Props = {
    channelId?: string;
    teamId: string;
    cursorPosition: number;
    isSearch: boolean;
    updateValue: (v: string) => void;
    onShowingChange: (c: boolean) => void;
    value: string;
    nestedScrollEnabled: boolean;
    useChannelMentions: boolean;
    useGroupMentions: boolean;
    isChannelConstrained: boolean;
    isTeamConstrained: boolean;
    listStyle: StyleProp<ViewStyle>;
}

const emptyUserlList: Array<UserModel | UserProfile> = [];
const emptySectionList: UserMentionSections = [];
const emptyGroupList: GroupModel[] = [];

const getAllUsers = async (serverUrl: string) => {
    const database = DatabaseManager.serverDatabases[serverUrl]?.database;
    if (!database) {
        return [];
    }

    return queryAllUsers(database).fetch();
};

const AtMention = ({
    channelId,
    teamId,
    cursorPosition,
    isSearch,
    updateValue,
    onShowingChange,
    value,
    nestedScrollEnabled,
    useChannelMentions,
    useGroupMentions,
    isChannelConstrained,
    isTeamConstrained,
    listStyle,
}: Props) => {
    const serverUrl = useServerUrl();

    const [sections, setSections] = useState<UserMentionSections>(emptySectionList);
    const [users, setUsers] = useState<Array<UserProfile | UserModel>>(emptyUserlList);
    const [groups, setGroups] = useState<GroupModel[]>(emptyGroupList);
    const [loading, setLoading] = useState(false);
    const [noResultsTerm, setNoResultsTerm] = useState<string|null>(null);
    const [localCursorPosition, setLocalCursorPosition] = useState(cursorPosition); // To avoid errors due to delay between value changes and cursor position changes.
    const [useLocal, setUseLocal] = useState(true);
    const [localUsers, setLocalUsers] = useState<UserModel[]>();
    const [filteredLocalUsers, setFilteredLocalUsers] = useState(emptyUserlList);

    const latestSearchAt = useRef(0);

    const runSearch = useMemo(() => debounce(async (sUrl: string, term: string, groupMentions: boolean, channelConstrained: boolean, teamConstrained: boolean, tId: string, cId?: string) => {
        const searchAt = Date.now();
        latestSearchAt.current = searchAt;

        const [{users: receivedUsers, error}, groupsResult] = await Promise.all([
            searchUsers(sUrl, term, tId, cId),
            searchGroups(sUrl, term, groupMentions, channelConstrained, teamConstrained, cId, tId),
        ]);

        if (latestSearchAt.current > searchAt) {
            return;
        }

        setGroups(groupsResult);

        setUseLocal(Boolean(error));
        if (error) {
            let fallbackUsers = localUsers;
            if (!fallbackUsers) {
                fallbackUsers = await getAllUsers(sUrl);
                setLocalUsers(fallbackUsers);
            }
            if (latestSearchAt.current > searchAt) {
                return;
            }

            const filteredUsers = filterResults(fallbackUsers, term);
            setFilteredLocalUsers(filteredUsers.length ? filteredUsers : emptyUserlList);
        } else if (receivedUsers) {
            await sortRecievedUsers(sUrl, term, receivedUsers?.users, receivedUsers?.out_of_channel);
        }

        setLoading(false);
    }, 200), []);

    async function sortRecievedUsers(sUrl: string, term: string, receivedUsers: UserProfile[], outOfChannel: UserProfile[] | undefined) {
        const database = DatabaseManager.serverDatabases[sUrl]?.database;
        if (!database) {
            return;
        }
        const memberIds = receivedUsers.map((e) => e.id);
        const sortedMembers: Array<UserProfile | UserModel> = await getUsersFromDMSorted(database, memberIds);
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
            sortedMembers.push(...outSortedMembers, ...outRest);
        }

        if (hasTrailingSpaces(term)) {
            const filteredReceivedUsers = filterResults(sortedMembers, term);
            const slicedArray = filteredReceivedUsers.slice(0, 20);
            setUsers(slicedArray.length ? slicedArray : emptyUserlList);
        } else {
            const slicedArray = sortedMembers.slice(0, 20);
            setUsers(slicedArray.length ? slicedArray : emptyUserlList);
        }
    }

    const matchTerm = getMatchTermForAtMention(value.substring(0, localCursorPosition), isSearch);
    const resetState = () => {
        setUsers(emptyUserlList);
        setGroups(emptyGroupList);
        setFilteredLocalUsers(emptyUserlList);
        setSections(emptySectionList);
        setNoResultsTerm(null);
        latestSearchAt.current = Date.now();
        setLoading(false);
        runSearch.cancel();
    };

    const completeMention = useCallback((mention: string) => {
        const mentionPart = value.substring(0, localCursorPosition);

        let completedDraft;
        if (isSearch) {
            completedDraft = mentionPart.replace(AT_MENTION_SEARCH_REGEX, `from: ${mention} `);
        } else {
            completedDraft = mentionPart.replace(AT_MENTION_REGEX, `@${mention} `);
        }

        const newCursorPosition = completedDraft.length;

        if (value.length > cursorPosition) {
            completedDraft += value.substring(cursorPosition);
        }

        updateValue(completedDraft);
        setLocalCursorPosition(newCursorPosition);

        onShowingChange(false);
        setNoResultsTerm(mention);
        setSections(emptySectionList);
        latestSearchAt.current = Date.now();
    }, [value, localCursorPosition, isSearch]);

    const renderSpecialMentions = useCallback((item: SpecialMention) => {
        return (
            <SpecialMentionItem
                completeHandle={item.completeHandle}
                defaultMessage={item.defaultMessage}
                id={item.id}
                onPress={completeMention}
                testID='autocomplete.special_mention_item'
            />
        );
    }, [completeMention]);

    const renderGroupMentions = useCallback((item: GroupModel) => {
        return (
            <GroupMentionItem
                key={`autocomplete-group-${item.name}`}
                name={item.name}
                displayName={item.displayName}
                memberCount={item.memberCount}
                onPress={completeMention}
                testID='autocomplete.group_mention_item'
            />
        );
    }, [completeMention]);

    const renderAtMentions = useCallback((item: UserProfile | UserModel) => {
        return (
            <AtMentionItem
                user={item}
                onPress={completeMention}
                testID='autocomplete.at_mention_item'
            />
        );
    }, [completeMention]);

    const renderItem = useCallback(({item, section}: SectionListRenderItemInfo<SpecialMention | GroupModel | UserProfile>) => {
        switch (section.key) {
            case SECTION_KEY_SPECIAL:
                return renderSpecialMentions(item as SpecialMention);
            case SECTION_KEY_GROUPS:
                return renderGroupMentions(item as GroupModel);
            default:
                return renderAtMentions(item as UserProfile);
        }
    }, [renderSpecialMentions, renderGroupMentions, renderAtMentions]);

    const renderSectionHeader = useCallback(({section}: SectionListRenderItemInfo<SpecialMention | GroupModel | UserProfile>) => {
        return (
            <AutocompleteSectionHeader
                id={section.id}
                defaultMessage={section.defaultMessage}
                loading={!section.hideLoadingIndicator && loading}
            />
        );
    }, [loading]);

    useEffect(() => {
        if (localCursorPosition !== cursorPosition) {
            setLocalCursorPosition(cursorPosition);
        }
    }, [cursorPosition]);

    useEffect(() => {
        if (matchTerm === null) {
            resetState();
            onShowingChange(false);
            return;
        }

        if (noResultsTerm != null && matchTerm.startsWith(noResultsTerm)) {
            return;
        }

        setNoResultsTerm(null);
        setLoading(true);
        runSearch(serverUrl, matchTerm, useGroupMentions, isChannelConstrained, isTeamConstrained, teamId, channelId);
    }, [matchTerm, teamId, useGroupMentions, isChannelConstrained, isTeamConstrained]);

    useEffect(() => {
        if (noResultsTerm && !loading) {
            return;
        }
        const showSpecialMentions = useChannelMentions && matchTerm != null && checkSpecialMentions(matchTerm);
        const buildMemberSection = isSearch || (!channelId && users.length > 0);
        let newSections;
        if (useLocal) {
            newSections = makeSections(filteredLocalUsers, [], groups, showSpecialMentions, true, buildMemberSection);
        } else {
            newSections = makeSections(users, users, groups, showSpecialMentions, buildMemberSection);
        }
        const nSections = newSections.length;

        if (!loading && !nSections && noResultsTerm == null) {
            setNoResultsTerm(matchTerm);
        }

        if (nSections && noResultsTerm) {
            setNoResultsTerm(null);
        }
        setSections(nSections ? newSections : emptySectionList);
        onShowingChange(Boolean(nSections));
    }, [!useLocal && users, users, groups, loading, channelId, useLocal && filteredLocalUsers]);

    if (sections.length === 0 || noResultsTerm != null) {
        // If we are not in an active state or the mention has been completed return null so nothing is rendered
        // other components are not blocked.
        return null;
    }

    return (
        <SectionList
            keyboardShouldPersistTaps='always'
            keyExtractor={keyExtractor}
            initialNumToRender={10}
            nestedScrollEnabled={nestedScrollEnabled}
            removeClippedSubviews={Platform.OS === 'android'}
            renderItem={renderItem}
            renderSectionHeader={renderSectionHeader}
            style={listStyle}
            sections={sections}
            testID='autocomplete.at_mention.section_list'
        />
    );
};

export default AtMention;
