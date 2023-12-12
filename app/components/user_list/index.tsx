// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {BottomSheetFlatList, BottomSheetSectionList} from '@gorhom/bottom-sheet';
import React, {useCallback, useMemo, type ComponentProps} from 'react';
import {defineMessages, type IntlShape, useIntl} from 'react-intl';
import {Keyboard, type ListRenderItemInfo, Platform, FlatList, SectionList, type SectionListData, Text, View} from 'react-native';

import {storeProfile} from '@actions/local/user';
import {fetchUsersByIds} from '@actions/remote/user';
import Loading from '@components/loading';
import NoResultsWithTerm from '@components/no_results_with_term';
import UserListRow from '@components/user_list_row';
import {General, Screens} from '@constants';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {useKeyboardHeight} from '@hooks/device';
import {openAsBottomSheet} from '@screens/navigation';
import {
    changeOpacity,
    makeStyleSheetFromTheme,
} from '@utils/theme';
import {typography} from '@utils/typography';

import type UserModel from '@typings/database/models/servers/user';

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
        flatList: {
            backgroundColor: theme.centerChannelBg,
            flex: 1,
            paddingTop: 8,
        },
        container: {
            flexGrow: 1,
        },
        flatContainer: {
            flexGrow: 1,
            paddingBottom: 16,
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
    handleSelectProfile?: (user: UserProfile | UserModel) => void;
    forceFetchProfile?: boolean;
    fetchMore?: () => void;
    loading: boolean;
    flatten?: boolean;
    manageMode?: boolean;
    showManageMode?: boolean;
    showNoResults: boolean;
    selectedIds?: {[id: string]: UserProfile};
    testID?: string;
    term?: string;
    tutorialWatched: boolean;
    includeUserMargin?: boolean;
    spacing?: ComponentProps<typeof UserListRow>['spacing'];
    inBottomSheet?: boolean;
}

export default function UserList({
    profiles,
    channelMembers,
    selectedIds,
    currentUserId,
    handleSelectProfile,
    forceFetchProfile,
    fetchMore,
    loading,
    manageMode = false,
    showManageMode = false,
    showNoResults,
    term,
    flatten = Boolean(term),
    testID,
    tutorialWatched,
    spacing,
    inBottomSheet,
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

        if (flatten) {
            return createProfiles(profiles, channelMembers);
        }

        return createProfilesSections(intl, profiles, channelMembers);
    }, [channelMembers, loading, profiles, term, flatten]);

    const openUserProfile = useCallback(async (profile: UserProfile | UserModel) => {
        if (profile.id !== currentUserId && forceFetchProfile) {
            await fetchUsersByIds(serverUrl, [profile.id]);
        }

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

        const screen = Screens.USER_PROFILE;
        const title = intl.formatMessage({id: 'mobile.routes.user_profile', defaultMessage: 'Profile'});
        const closeButtonId = 'close-user-profile';
        const props = {
            closeButtonId,
            userId: user.id,
            location: Screens.USER_PROFILE,
        };

        Keyboard.dismiss();
        openAsBottomSheet({screen, title, theme, closeButtonId, props});
    }, []);

    const renderItem = useCallback(({item, index, section}: RenderItemType) => {
        // The list will re-render when the selection changes because it's passed into the list as extraData
        const selected = Boolean(selectedIds?.[item.id]);
        const canAdd = Boolean(selectedIds && (Object.keys(selectedIds).length < General.MAX_USERS_IN_GM));

        const isChAdmin = item.scheme_admin || false;

        return (
            <UserListRow
                key={item.id}
                highlight={section?.first && index === 0}
                id={item.id}
                isChannelAdmin={isChAdmin}
                isMyUser={currentUserId === item.id}
                manageMode={manageMode}
                onPress={handleSelectProfile ?? openUserProfile}
                onLongPress={openUserProfile}
                selectable={manageMode || canAdd}
                disabled={selectedIds && !canAdd}
                selected={selected}
                showManageMode={showManageMode}
                testID='create_direct_message.user_list.user_item'
                tutorialWatched={tutorialWatched}
                user={item}
                spacing={spacing}
            />
        );
    }, [selectedIds, handleSelectProfile, openUserProfile, showManageMode, manageMode, tutorialWatched]);

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

    const Flat = inBottomSheet ? BottomSheetFlatList : FlatList;
    const Sectioned = inBottomSheet ? BottomSheetSectionList : SectionList;

    const renderFlatList = (items: UserProfile[]) => {
        return (
            <Flat
                contentContainerStyle={style.flatContainer}
                keyboardShouldPersistTaps='always'
                data={items}
                {...keyboardDismissProp}
                keyExtractor={keyExtractor}
                initialNumToRender={INITIAL_BATCH_TO_RENDER}
                ListEmptyComponent={renderNoResults}
                ListFooterComponent={renderLoading}
                maxToRenderPerBatch={INITIAL_BATCH_TO_RENDER + 1}
                removeClippedSubviews={true}
                renderItem={renderItem}
                scrollEventThrottle={SCROLL_EVENT_THROTTLE}
                style={style.flatList}
                testID={`${testID}.flat_list`}
            />
        );
    };

    const renderSectionList = (sections: Array<SectionListData<UserProfile>>) => {
        return (
            <Sectioned
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

    if (flatten) {
        return renderFlatList(data as UserProfileWithChannelAdmin[]);
    }
    return renderSectionList(data as Array<SectionListData<UserProfileWithChannelAdmin>>);
}
