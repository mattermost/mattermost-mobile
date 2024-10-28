// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {debounce} from 'lodash';
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {Platform, SectionList, type SectionListRenderItemInfo, type StyleProp, type ViewStyle} from 'react-native';

import {searchUsers} from '@actions/remote/user';
import GroupMentionItem from '@components/autocomplete/at_mention_group/at_mention_group';
import AtMentionItem from '@components/autocomplete/at_mention_item';
import AutocompleteSectionHeader from '@components/autocomplete/autocomplete_section_header';
import SpecialMentionItem from '@components/autocomplete/special_mention_item';
import {AT_MENTION_REGEX, AT_MENTION_SEARCH_REGEX} from '@constants/autocomplete';
import {useServerUrl} from '@context/server';

import {SECTION_KEY_GROUPS, SECTION_KEY_SPECIAL, emptyGroupList, emptySectionList, emptyUserlList} from './constants';
import {checkSpecialMentions, filterResults, getAllUsers, getMatchTermForAtMention, keyExtractor, makeSections, searchGroups, sortReceivedUsers} from './utils';

import type {SpecialMention, UserMentionSections} from './types';
import type GroupModel from '@typings/database/models/servers/group';
import type UserModel from '@typings/database/models/servers/user';

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
    const [usersInChannel, setUsersInChannel] = useState<Array<UserProfile | UserModel>>(emptyUserlList);
    const [usersOutOfChannel, setUsersOutOfChannel] = useState<Array<UserProfile | UserModel>>(emptyUserlList);
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
            const [sortedMembers, sortedOutOfChannel] = await sortReceivedUsers(sUrl, term, receivedUsers?.users, receivedUsers?.out_of_channel);
            setUsersInChannel(sortedMembers.length ? sortedMembers : emptyUserlList);
            setUsersOutOfChannel(sortedOutOfChannel.length ? sortedOutOfChannel : emptyUserlList);
        }

        setLoading(false);
    }, 200), []);

    const teamMembers = useMemo(
        () => [...usersInChannel, ...usersOutOfChannel],
        [usersInChannel, usersOutOfChannel],
    );

    const matchTerm = getMatchTermForAtMention(value.substring(0, localCursorPosition), isSearch);
    const resetState = () => {
        setUsersInChannel(emptyUserlList);
        setUsersOutOfChannel(emptyUserlList);
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
        const buildMemberSection = isSearch || (!channelId && teamMembers.length > 0);
        let newSections;
        if (useLocal) {
            newSections = makeSections(filteredLocalUsers, [], [], groups, showSpecialMentions, true, buildMemberSection);
        } else {
            newSections = makeSections(teamMembers, usersInChannel, usersOutOfChannel, groups, showSpecialMentions, buildMemberSection);
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
    }, [!useLocal && usersInChannel, !useLocal && usersOutOfChannel, groups, loading, channelId, useLocal && filteredLocalUsers]);

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
