// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {debounce} from 'lodash';
import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {Platform, SectionList, SectionListData, SectionListRenderItemInfo} from 'react-native';

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

import type GroupModel from '@typings/database/models/servers/group';

type SpecialMention = {
    completeHandle: string;
    id: string;
    defaultMessage: string;
}

type UserMentionSections = Array<SectionListData<UserProfile|GroupModel|SpecialMention>>

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
    groups: GroupModel[];
}

const getStyleFromTheme = makeStyleSheetFromTheme((theme) => {
    return {
        listView: {
            backgroundColor: theme.centerChannelBg,
            borderRadius: 4,
        },
    };
});

const emptyList: UserProfile[] = [];

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
    groups,
}: Props) => {
    const serverUrl = useServerUrl();
    const theme = useTheme();
    const style = getStyleFromTheme(theme);
    const [sections, setSections] = useState<UserMentionSections>([]);
    const [usersInChannel, setUsersInChannel] = useState<UserProfile[]>([]);
    const [usersOutOfChannel, setUsersOutOfChannel] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(false);
    const [noResultsTerm, setNoResultsTerm] = useState<string|null>(null);

    const runSearch = useMemo(() => debounce(async (sUrl: string, term: string, cId?: string) => {
        setLoading(true);
        const {users: receivedChannels, error} = await searchUsers(sUrl, term, cId);
        if (!error) {
            setUsersInChannel(receivedChannels!.users);
            setUsersOutOfChannel(receivedChannels!.out_of_channel || emptyList);
        }
        setLoading(false);
    }, 200), []);

    const teamMembers = useMemo(
        () => [...usersInChannel, ...usersOutOfChannel],
        [usersInChannel, usersOutOfChannel],
    );

    const matchTerm = getMatchTermForAtMention(value.substring(0, cursorPosition), isSearch);

    const completeMention = useCallback((mention) => {
        const mentionPart = value.substring(0, cursorPosition);

        let completedDraft;
        if (isSearch) {
            completedDraft = mentionPart.replace(AT_MENTION_SEARCH_REGEX, `from: ${mention} `);
        } else {
            completedDraft = mentionPart.replace(AT_MENTION_REGEX, `@${mention} `);
        }
        if (value.length > cursorPosition) {
            completedDraft += value.substring(cursorPosition);
        }

        updateValue(completedDraft);

        onShowingChange(false);
        setNoResultsTerm(mention);
    }, [value, cursorPosition, isSearch]);

    const renderSpecialMentions = useCallback(({item}: SectionListRenderItemInfo<SpecialMention>) => {
        return (
            <SpecialMentionItem
                completeHandle={item.completeHandle}
                defaultMessage={item.defaultMessage}
                id={item.id}
                onPress={completeMention}
            />
        );
    }, [completeMention]);

    const renderGroupMentions = useCallback(({item}: SectionListRenderItemInfo<GroupModel>) => {
        return (
            <GroupMentionItem
                key={`autocomplete-group-${item.name}`}
                completeHandle={item.name}
                onPress={completeMention}
            />
        );
    }, [completeMention]);

    const renderItem = useCallback(({item}) => {
        return (
            <AtMentionItem
                testID={`autocomplete.at_mention.item.${item}`}
                onPress={completeMention}
                user={item}
            />
        );
    }, [completeMention]);

    const renderSectionHeader = useCallback(({section}) => {
        const isFirstSection = section.id === sections[0].id;
        return (
            <AutocompleteSectionHeader
                id={section.id}
                defaultMessage={section.defaultMessage}
                loading={!section.hideLoadingIndicator && loading}
                isFirstSection={isFirstSection}
            />
        );
    }, [sections[0]?.id, loading]);

    useEffect(() => {
        if (matchTerm === null) {
            setSections([]);
            setNoResultsTerm(null);
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
        if (matchTerm === null) {
            return;
        }

        const newSections: UserMentionSections = [];

        if (isSearch) {
            newSections.push({
                id: t('mobile.suggestion.members'),
                defaultMessage: 'Members',
                data: teamMembers,
                key: 'teamMembers',
            });
        } else {
            if (usersInChannel.length) {
                newSections.push({
                    id: t('suggestion.mention.members'),
                    defaultMessage: 'Channel Members',
                    data: usersInChannel,
                    key: 'inChannel',
                });
            }

            if (groups.length) {
                newSections.push({
                    id: t('suggestion.mention.groups'),
                    defaultMessage: 'Group Mentions',
                    data: groups,
                    key: 'groups',
                    renderItem: renderGroupMentions,
                });
            }

            if (useChannelMentions && matchTerm != null && checkSpecialMentions(matchTerm)) {
                newSections.push({
                    id: t('suggestion.mention.special'),
                    defaultMessage: 'Special Mentions',
                    data: getSpecialMentions(),
                    key: 'special',
                    renderItem: renderSpecialMentions,
                });
            }

            if (usersOutOfChannel.length) {
                newSections.push({
                    id: t('suggestion.mention.nonmembers'),
                    defaultMessage: 'Not in Channel',
                    data: usersOutOfChannel,
                    key: 'outChannel',
                });
            }
        }

        if (!loading && !newSections.length && noResultsTerm == null) {
            setNoResultsTerm(matchTerm);
        }
        setSections(newSections);
        onShowingChange(Boolean(newSections.length));
    }, [usersInChannel, usersOutOfChannel, teamMembers, groups]);

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
