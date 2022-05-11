// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {debounce} from 'lodash';
import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {Platform, SectionList, SectionListData, SectionListRenderItemInfo} from 'react-native';

import {getGroupsForAutocomplete} from '@actions/remote/groups';
import {searchUsers} from '@actions/remote/user';
import GroupMentionItem from '@components/autocomplete/at_mention_group/at_mention_group';
import AtMentionItem from '@components/autocomplete/at_mention_item';
import AutocompleteSectionHeader from '@components/autocomplete/autocomplete_section_header';
import SpecialMentionItem from '@components/autocomplete/special_mention_item';
import {AT_MENTION_REGEX, AT_MENTION_SEARCH_REGEX} from '@constants/autocomplete';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {t} from '@i18n';
import {makeStyleSheetFromTheme} from '@utils/theme';

const SECTION_KEY_TEAM_MEMBERS = 'teamMembers';
const SECTION_KEY_IN_CHANNEL = 'inChannel';
const SECTION_KEY_OUT_OF_CHANNEL = 'outChannel';
const SECTION_KEY_SPECIAL = 'special';
const SECTION_KEY_GROUPS = 'groups';

type SpecialMention = {
    completeHandle: string;
    id: string;
    defaultMessage: string;
}

type UserMentionSections = Array<SectionListData<UserProfile|Group|SpecialMention>>

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

const makeSections = (teamMembers: UserProfile[], usersInChannel: UserProfile[], usersOutOfChannel: UserProfile[], groups: Group[], showSpecialMentions: boolean, isSearch = false) => {
    const newSections: UserMentionSections = [];

    if (isSearch) {
        newSections.push({
            id: t('mobile.suggestion.members'),
            defaultMessage: 'Members',
            data: teamMembers,
            key: SECTION_KEY_TEAM_MEMBERS,
        });
    } else {
        if (usersInChannel.length) {
            newSections.push({
                id: t('suggestion.mention.members'),
                defaultMessage: 'Channel Members',
                data: usersInChannel,
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

        if (usersOutOfChannel.length) {
            newSections.push({
                id: t('suggestion.mention.nonmembers'),
                defaultMessage: 'Not in Channel',
                data: usersOutOfChannel,
                key: SECTION_KEY_OUT_OF_CHANNEL,
            });
        }
    }
    return newSections;
};

type Props = {
    channelId?: string;
    cursorPosition: number;
    isSearch: boolean;
    maxListHeight: number;
    updateValue: (v: string) => void;
    onShowingChange: (c: boolean) => void;
    value: string;
    nestedScrollEnabled: boolean;
    useChannelMentions: boolean;
    useGroupMentions: boolean;
}

const getStyleFromTheme = makeStyleSheetFromTheme((theme) => {
    return {
        listView: {
            backgroundColor: theme.centerChannelBg,
            borderRadius: 4,
        },
    };
});

const emptyProfileList: UserProfile[] = [];
const empytSectionList: UserMentionSections = [];
const emptyGroupList: Group[] = [];

const AtMention = ({
    channelId,
    cursorPosition,
    isSearch,
    maxListHeight,
    updateValue,
    onShowingChange,
    value,
    nestedScrollEnabled,
    useChannelMentions,
    useGroupMentions,
}: Props) => {
    const serverUrl = useServerUrl();
    const theme = useTheme();
    const style = getStyleFromTheme(theme);

    const [sections, setSections] = useState<UserMentionSections>(empytSectionList);
    const [usersInChannel, setUsersInChannel] = useState<UserProfile[]>(emptyProfileList);
    const [usersOutOfChannel, setUsersOutOfChannel] = useState<UserProfile[]>(emptyProfileList);
    const [groups, setGroups] = useState<Group[]>(emptyGroupList);
    const [loading, setLoading] = useState(false);
    const [noResultsTerm, setNoResultsTerm] = useState<string|null>(null);
    const [localCursorPosition, setLocalCursorPosition] = useState(cursorPosition); // To avoid errors due to delay between value changes and cursor position changes.

    const runSearch = useMemo(() => debounce(async (sUrl: string, term: string, cId?: string) => {
        setLoading(true);
        const {users: receivedUsers} = await searchUsers(sUrl, term, cId);
        if (receivedUsers) {
            setUsersInChannel(receivedUsers.users.length ? receivedUsers.users : emptyProfileList);
            setUsersOutOfChannel(receivedUsers.out_of_channel?.length ? receivedUsers.out_of_channel : emptyProfileList);
        }

        setLoading(false);
    }, 200), []);

    const teamMembers = useMemo(
        () => [...usersInChannel, ...usersOutOfChannel],
        [usersInChannel, usersOutOfChannel],
    );

    const matchTerm = getMatchTermForAtMention(value.substring(0, localCursorPosition), isSearch);
    const resetState = () => {
        setUsersInChannel(emptyProfileList);
        setUsersOutOfChannel(emptyProfileList);
        setSections(empytSectionList);
        runSearch.cancel();
    };

    const completeMention = useCallback((mention) => {
        const mentionPart = value.substring(0, localCursorPosition);

        let completedDraft;
        if (isSearch) {
            completedDraft = mentionPart.replace(AT_MENTION_SEARCH_REGEX, `from: ${mention} `);
        } else {
            completedDraft = mentionPart.replace(AT_MENTION_REGEX, `@${mention} `);
        }

        const newCursorPosition = completedDraft.length - 1;

        if (value.length > cursorPosition) {
            completedDraft += value.substring(cursorPosition);
        }

        updateValue(completedDraft);
        setLocalCursorPosition(newCursorPosition);

        onShowingChange(false);
        setNoResultsTerm(mention);
        setSections(empytSectionList);
    }, [value, localCursorPosition, isSearch]);

    const renderSpecialMentions = useCallback((item: SpecialMention) => {
        return (
            <SpecialMentionItem
                completeHandle={item.completeHandle}
                defaultMessage={item.defaultMessage}
                id={item.id}
                onPress={completeMention}
            />
        );
    }, [completeMention]);

    const renderGroupMentions = useCallback((item: Group) => {
        return (
            <GroupMentionItem
                key={`autocomplete-group-${item.name}`}
                completeHandle={item.name}
                onPress={completeMention}
            />
        );
    }, [completeMention]);

    const renderAtMentions = useCallback((item: UserProfile) => {
        return (
            <AtMentionItem
                testID={`autocomplete.at_mention.item.${item}`}
                onPress={completeMention}
                user={item}
            />
        );
    }, [completeMention]);

    const renderItem = useCallback(({item, section}: SectionListRenderItemInfo<SpecialMention | Group | UserProfile>) => {
        switch (section.key) {
            case SECTION_KEY_SPECIAL:
                return renderSpecialMentions(item as SpecialMention);
            case SECTION_KEY_GROUPS:
                return renderGroupMentions(item as Group);
            default:
                return renderAtMentions(item as UserProfile);
        }
    }, [renderSpecialMentions, renderGroupMentions, renderAtMentions]);

    const renderSectionHeader = useCallback(({section}) => {
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
        if (useGroupMentions && matchTerm && matchTerm !== '') {
            getGroupsForAutocomplete(serverUrl, matchTerm || '').then((res) => {
                setGroups(res.length ? res : emptyGroupList);
            }).catch(() => {
                setGroups(emptyGroupList);
            });
        } else {
            setGroups(emptyGroupList);
        }
    }, [matchTerm, useGroupMentions]);

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
        runSearch(serverUrl, matchTerm, channelId);
    }, [matchTerm]);

    useEffect(() => {
        const showSpecialMentions = useChannelMentions && matchTerm != null && checkSpecialMentions(matchTerm);
        const buildMemberSection = isSearch || (!channelId && teamMembers.length > 0);
        const newSections = makeSections(teamMembers, usersInChannel, usersOutOfChannel, groups, showSpecialMentions, buildMemberSection);
        const nSections = newSections.length;

        if (!loading && !nSections && noResultsTerm == null) {
            setNoResultsTerm(matchTerm);
        }
        setSections(nSections ? newSections : empytSectionList);
        onShowingChange(Boolean(nSections));
    }, [usersInChannel, usersOutOfChannel, teamMembers, groups, loading, channelId]);

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
            style={[style.listView, {maxHeight: maxListHeight}]}
            sections={sections}
            testID='at_mention_suggestion.list'
        />
    );
};

export default AtMention;
