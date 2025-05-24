// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useMemo} from 'react';
import {defineMessages, type IntlShape, useIntl} from 'react-intl';
import {FlatList, Keyboard, type ListRenderItemInfo, Platform, SectionList, type SectionListData, Text, View} from 'react-native';

import {storeProfile} from '@actions/local/user';
import Loading from '@components/loading';
import NoResultsWithTerm from '@components/no_results_with_term';
import UserListRow from '@components/user_list_row';
import {General} from '@constants';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {useKeyboardHeight} from '@hooks/device';
import {openUserProfileModal} from '@screens/navigation';
import {
    changeOpacity,
    makeStyleSheetFromTheme,
} from '@utils/theme';
import {typography} from '@utils/typography';

import type UserModel from '@typings/database/models/servers/user';
import type {AvailableScreens} from '@typings/screens/navigation';

type UserProfileWithChannelAdmin = UserProfile & {scheme_admin?: boolean}
type RenderItemType = ListRenderItemInfo<UserProfileWithChannelAdmin> & {section?: SectionListData<UserProfileWithChannelAdmin>}

const INITIAL_BATCH_TO_RENDER = 15;
const SCROLL_EVENT_THROTTLE = 60;

const messages = defineMessages({
    admins: {
        id: 'mobile.manage_members.section_title_admins',
        defaultMessage: 'CHANNEL ADMINS',
    },
    members: {
        id: 'mobile.manage_members.section_title_members',
        defaultMessage: 'MEMBERS',
    },
});

const keyboardDismissProp = Platform.select({
    android: {
        onScrollBeginDrag: Keyboard.dismiss,
    },
    ios: {
        keyboardDismissMode: 'on-drag' as const,
    },
});

const keyExtractor = (item: UserProfile) => {
    return item.id;
};

const sectionKeyExtractor = (profile: UserProfile) => {
    // Group items alphabetically by first letter of username
    return profile.username[0].toUpperCase();
};

const sectionRoleKeyExtractor = (cAdmin: boolean) => {
    // Group items by channel admin or channel member
    return cAdmin ? messages.admins : messages.members;
};

export function createProfilesSections(intl: IntlShape, profiles: UserProfile[], members?: ChannelMembership[]) {
    if (!profiles.length) {
        return [];
    }

    const sections = new Map<string, UserProfileWithChannelAdmin[]>();

    if (members?.length) {
        // when channel members are provided, build the sections by admins and members
        const membersDictionary = new Map<string, ChannelMembership>();
        const membersSections = new Map<string, UserProfileWithChannelAdmin[]>();
        const {formatMessage} = intl;
        members.forEach((m) => membersDictionary.set(m.user_id, m));
        profiles.forEach((p) => {
            const member = membersDictionary.get(p.id);
            if (member) {
                const sectionKey = sectionRoleKeyExtractor(member.scheme_admin!).id;
                const section = membersSections.get(sectionKey) || [];
                section.push({...p, scheme_admin: member.scheme_admin});
                membersSections.set(sectionKey, section);
            }
        });
        sections.set(formatMessage(messages.admins), membersSections.get(messages.admins.id) || []);
        sections.set(formatMessage(messages.members), membersSections.get(messages.members.id) || []);
    } else {
        // when channel members are not provided, build the sections alphabetically
        profiles.forEach((p) => {
            const sectionKey = sectionKeyExtractor(p);
            const sectionValue = sections.get(sectionKey) || [];
            const section = [...sectionValue, p];
            sections.set(sectionKey, section);
        });
    }

    const results = [];
    let index = 0;
    for (const [k, v] of sections) {
        if (v.length) {
            results.push({
                first: index === 0,
                id: k,
                data: v,
            });
            index++;
        }
    }
    return results;
}

function createProfiles(profiles: UserProfile[], members?: ChannelMembership[]): UserProfileWithChannelAdmin[] {
    if (!profiles.length) {
        return [];
    }

    const profileMap = new Map<string, UserProfileWithChannelAdmin>();
    profiles.forEach((profile) => {
        profileMap.set(profile.id, profile);
    });

    if (members?.length) {
        members.forEach((m) => {
            const profileFound = profileMap.get(m.user_id);
            if (profileFound) {
                profileFound.scheme_admin = m.scheme_admin;
            }
        });
    }

    return Array.from(profileMap.values());
}

const getStyleFromTheme = makeStyleSheetFromTheme((theme) => {
    return {
        list: {
            backgroundColor: theme.centerChannelBg,
            flex: 1,
        },
        container: {
            flexGrow: 1,
        },
        loadingContainer: {
            flex: 1,
            justifyContent: 'center' as const,
            alignItems: 'center' as const,
        },
        noResultContainer: {
            flexGrow: 1,
            alignItems: 'center' as const,
            justifyContent: 'center' as const,
        },
        sectionContainer: {
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.08),
            paddingLeft: 16,
            justifyContent: 'center',
            height: 24,
        },
        sectionWrapper: {
            backgroundColor: theme.centerChannelBg,
        },
        sectionText: {
            color: theme.centerChannelColor,
            ...typography('Body', 75, 'SemiBold'),
        },
    };
});

type Props = {
    profiles: UserProfile[];
    channelMembers?: ChannelMembership[];
    currentUserId: string;
    handleSelectProfile: (user: UserProfile | UserModel) => void;
    fetchMore?: () => void;
    loading: boolean;
    manageMode?: boolean;
    showManageMode?: boolean;
    showNoResults: boolean;
    selectedIds: {[id: string]: UserProfile};
    testID?: string;
    term?: string;
    tutorialWatched: boolean;
    includeUserMargin?: boolean;
    location: AvailableScreens;
}

export default function UserList({
    profiles,
    channelMembers,
    selectedIds,
    currentUserId,
    handleSelectProfile,
    fetchMore,
    loading,
    manageMode = false,
    showManageMode = false,
    showNoResults,
    term,
    testID,
    tutorialWatched,
    includeUserMargin,
    location,
}: Props) {
    const intl = useIntl();
    const theme = useTheme();
    const serverUrl = useServerUrl();
    const style = getStyleFromTheme(theme);
    const keyboardHeight = useKeyboardHeight();
    const noResutsStyle = useMemo(() => [
        style.noResultContainer,
        {paddingBottom: keyboardHeight},
    ], [style, keyboardHeight]);

    const data = useMemo(() => {
        if (profiles.length === 0 && !loading) {
            return [];
        }

        if (term) {
            return createProfiles(profiles, channelMembers);
        }

        return createProfilesSections(intl, profiles, channelMembers);
    }, [channelMembers, intl, loading, profiles, term]);

    const openUserProfile = useCallback(async (profile: UserProfile | UserModel) => {
        let user: UserModel;
        if ('create_at' in profile) {
            const res = await storeProfile(serverUrl, profile);
            if (!res.user) {
                return;
            }
            user = res.user;
        } else {
            user = profile;
        }

        openUserProfileModal(intl, theme, {
            userId: user.id,
            location,
        });
    }, [intl, location, serverUrl, theme]);

    const renderItem = useCallback(({item, index, section}: RenderItemType) => {
        // The list will re-render when the selection changes because it's passed into the list as extraData
        const selected = Boolean(selectedIds[item.id]);
        const canAdd = Object.keys(selectedIds).length < General.MAX_USERS_IN_GM;

        const isChAdmin = item.scheme_admin || false;

        return (
            <UserListRow
                key={item.id}
                highlight={section?.first && index === 0}
                id={item.id}
                isChannelAdmin={isChAdmin}
                isMyUser={currentUserId === item.id}
                manageMode={manageMode}
                onPress={handleSelectProfile}
                onLongPress={openUserProfile}
                selectable={manageMode || canAdd}
                disabled={!canAdd}
                selected={selected}
                showManageMode={showManageMode}
                testID='create_direct_message.user_list.user_item'
                tutorialWatched={tutorialWatched}
                user={item}
                includeMargin={includeUserMargin}
            />
        );
    }, [selectedIds, currentUserId, manageMode, handleSelectProfile, openUserProfile, showManageMode, tutorialWatched, includeUserMargin]);

    const renderLoading = useCallback(() => {
        if (!loading) {
            return null;
        }

        return (
            <Loading
                color={theme.buttonBg}
                containerStyle={style.loadingContainer}
                size='large'
            />
        );
    }, [loading, theme]);

    const renderNoResults = useCallback(() => {
        if (!showNoResults || !term) {
            return null;
        }

        return (
            <View style={noResutsStyle}>
                <NoResultsWithTerm term={term}/>
            </View>
        );
    }, [showNoResults && style, term, noResutsStyle]);

    const renderSectionHeader = useCallback(({section}: {section: SectionListData<UserProfile>}) => {
        return (
            <View style={style.sectionWrapper}>
                <View style={style.sectionContainer}>
                    <Text style={style.sectionText}>{section.id}</Text>
                </View>
            </View>
        );
    }, [style]);

    const renderFlatList = (items: UserProfile[]) => {
        return (
            <FlatList
                contentContainerStyle={style.container}
                data={items}
                keyboardShouldPersistTaps='always'
                {...keyboardDismissProp}
                keyExtractor={keyExtractor}
                initialNumToRender={INITIAL_BATCH_TO_RENDER}
                ListEmptyComponent={renderNoResults}
                ListFooterComponent={renderLoading}
                maxToRenderPerBatch={INITIAL_BATCH_TO_RENDER + 1}
                removeClippedSubviews={true}
                renderItem={renderItem}
                scrollEventThrottle={SCROLL_EVENT_THROTTLE}
                style={style.list}
                testID={`${testID}.flat_list`}
            />
        );
    };

    const renderSectionList = (sections: Array<SectionListData<UserProfile>>) => {
        return (
            <SectionList
                contentContainerStyle={style.container}
                keyboardShouldPersistTaps='always'
                {...keyboardDismissProp}
                keyExtractor={keyExtractor}
                initialNumToRender={INITIAL_BATCH_TO_RENDER}
                ListEmptyComponent={renderNoResults}
                ListFooterComponent={renderLoading}
                maxToRenderPerBatch={INITIAL_BATCH_TO_RENDER + 1}
                removeClippedSubviews={true}
                renderItem={renderItem}
                renderSectionHeader={renderSectionHeader}
                scrollEventThrottle={SCROLL_EVENT_THROTTLE}
                sections={sections}
                style={style.list}
                stickySectionHeadersEnabled={false}
                testID={`${testID}.section_list`}
                onEndReached={fetchMore}
            />
        );
    };

    if (term) {
        return renderFlatList(data as UserProfileWithChannelAdmin[]);
    }
    return renderSectionList(data as Array<SectionListData<UserProfileWithChannelAdmin>>);
}
