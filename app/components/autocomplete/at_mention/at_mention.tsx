// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {Platform, SectionList, SectionListData, SectionListRenderItemInfo} from 'react-native';

import {searchGroupsByName, searchGroupsByNameInChannel, searchGroupsByNameInTeam} from '@actions/local/group';
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
import type UserModel from '@typings/database/models/servers/user';

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

type UserMentionSections = Array<SectionListData<UserProfile|UserModel|GroupModel|SpecialMention>>

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

const makeSections = (teamMembers: Array<UserProfile | UserModel>, usersInChannel: Array<UserProfile | UserModel>, usersOutOfChannel: Array<UserProfile | UserModel>, groups: GroupModel[], showSpecialMentions: boolean, isSearch = false) => {
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
    teamId?: string;
    cursorPosition: number;
    isSearch: boolean;
    maxListHeight: number;
    updateValue: (v: string) => void;
    onShowingChange: (c: boolean) => void;
    value: string;
    nestedScrollEnabled: boolean;
    useChannelMentions: boolean;
    useGroupMentions: boolean;
    isChannelConstrained: boolean;
    isTeamConstrained: boolean;
    users: {inChannel: UserModel[]; outOfChannel: UserModel[]};
    matchTerm: string;
}

const getStyleFromTheme = makeStyleSheetFromTheme((theme) => {
    return {
        listView: {
            backgroundColor: theme.centerChannelBg,
            borderRadius: 4,
        },
    };
});

const emptySectionList: UserMentionSections = [];
const emptyGroupList: GroupModel[] = [];

const AtMention = ({
    channelId,
    teamId,
    cursorPosition,
    isSearch,
    maxListHeight,
    updateValue,
    onShowingChange,
    value,
    nestedScrollEnabled,
    useChannelMentions,
    useGroupMentions,
    isChannelConstrained,
    isTeamConstrained,
    users,
    matchTerm,
}: Props) => {
    const serverUrl = useServerUrl();
    const theme = useTheme();
    const style = getStyleFromTheme(theme);

    const {inChannel: usersInChannel, outOfChannel: usersOutOfChannel} = users;

    const [sections, setSections] = useState<UserMentionSections>(emptySectionList);
    const [groups, setGroups] = useState<GroupModel[]>(emptyGroupList);
    const [noResultsTerm, setNoResultsTerm] = useState<string|null>(null);
    const [localCursorPosition, setLocalCursorPosition] = useState(cursorPosition); // To avoid errors due to delay between value changes and cursor position changes.

    const teamMembers = useMemo(
        () => [...usersInChannel, ...usersOutOfChannel],
        [usersInChannel, usersOutOfChannel],
    );

    const resetState = () => {
        setSections(emptySectionList);
    };

    const completeMention = useCallback((mention: string) => {
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
        setSections(emptySectionList);
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
            />
        );
    }, []);

    useEffect(() => {
        if (localCursorPosition !== cursorPosition) {
            setLocalCursorPosition(cursorPosition);
        }
    }, [cursorPosition]);

    useEffect(() => {
        if (useGroupMentions && matchTerm && matchTerm !== '') {
            // If the channel is constrained, we only show groups for that channel
            if (isChannelConstrained && channelId) {
                searchGroupsByNameInChannel(serverUrl, matchTerm, channelId).then((g) => {
                    setGroups(g.length ? g : emptyGroupList);
                }).catch(() => {
                    setGroups(emptyGroupList);
                });
            }

            // If there is no channel constraint, but a team constraint - only show groups for team
            if (isTeamConstrained && !isChannelConstrained) {
                searchGroupsByNameInTeam(serverUrl, matchTerm, teamId!).then((g) => {
                    setGroups(g.length ? g : emptyGroupList);
                }).catch(() => {
                    setGroups(emptyGroupList);
                });
            }

            // No constraints? Search all groups
            if (!isTeamConstrained && !isChannelConstrained) {
                searchGroupsByName(serverUrl, matchTerm || '').then((g) => {
                    setGroups(Array.isArray(g) ? g : emptyGroupList);
                }).catch(() => {
                    setGroups(emptyGroupList);
                });
            }
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
    }, [matchTerm]);

    useEffect(() => {
        const showSpecialMentions = useChannelMentions && matchTerm != null && checkSpecialMentions(matchTerm);
        const buildMemberSection = isSearch || (!channelId && teamMembers.length > 0);
        const newSections = makeSections(teamMembers, usersInChannel, usersOutOfChannel, groups, showSpecialMentions, buildMemberSection);
        const nSections = newSections.length;

        if (!nSections && noResultsTerm == null) {
            setNoResultsTerm(matchTerm);
        }

        setSections(nSections ? newSections : emptySectionList);
        onShowingChange(Boolean(nSections && !noResultsTerm));
    }, [usersInChannel, usersOutOfChannel, teamMembers, groups, channelId]);

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
            testID='autocomplete.at_mention.section_list'
        />
    );
};

export default AtMention;
