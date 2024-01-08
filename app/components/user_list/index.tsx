// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {BottomSheetFlatList, BottomSheetSectionList} from '@gorhom/bottom-sheet';
import React, {useCallback, useMemo, type ComponentProps} from 'react';
import {defineMessages, type IntlShape, useIntl} from 'react-intl';
import {Keyboard, type ListRenderItemInfo, Platform, FlatList, SectionList, type SectionListData, Text, View, type SectionListRenderItemInfo} from 'react-native';

import {storeProfile} from '@actions/local/user';
import {fetchUsersByIds} from '@actions/remote/user';
import Loading from '@components/loading';
import NoResultsWithTerm from '@components/no_results_with_term';
import UserListRow from '@components/user_list_row';
import {Screens} from '@constants';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {useKeyboardHeight} from '@hooks/device';
import {openAsBottomSheet} from '@screens/navigation';
import {
    changeOpacity,
    makeStyleSheetFromTheme,
} from '@utils/theme';
import {typography} from '@utils/typography';

import type {GroupModel} from '@app/database/models/server';
import type UserModel from '@typings/database/models/servers/user';

type TUser = UserProfile;
type TUserChannelAdmin = TUser & {scheme_admin?: boolean | undefined}
type TGroup = Group | GroupModel;
type TDisplayItem = TUserChannelAdmin | TGroup;
type RenderItemType = ListRenderItemInfo<TDisplayItem> & Partial<SectionListRenderItemInfo<TDisplayItem>>;

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

const keyExtractor = (item: {id: string}) => {
    return item.id;
};

const sectionRoleKeyExtractor = (cAdmin: boolean | undefined) => {
    // Group items by channel admin or channel member
    return cAdmin ? messages.admins : messages.members;
};

const getName = (x: TUser | TGroup) => {
    if ('username' in x) {
        return x.username;
    }
    return x.name;
};

export function createSectionedList(intl: IntlShape, profiles: TUser[], groups: TGroup[] | undefined, members: ChannelMembership[] | undefined) {
    if (!profiles.length && !groups?.length) {
        return [];
    }

    const sections = new Map<string, TDisplayItem[]>();

    if (members?.length && !groups?.length) {
        // when channel members are provided, build the sections by admins and members
        const membersDictionary = new Map<string, ChannelMembership>();
        const membersSections = new Map<string, TUserChannelAdmin[]>();
        const {formatMessage} = intl;
        members.forEach((m) => membersDictionary.set(m.user_id, m));
        profiles.forEach((p) => {
            const member = membersDictionary.get(p.id);
            if (member) {
                const sectionKey = sectionRoleKeyExtractor(member.scheme_admin).id;
                const section = membersSections.get(sectionKey) || [];
                section.push({...p, scheme_admin: member.scheme_admin ?? false});
                membersSections.set(sectionKey, section);
            }
        });
        sections.set(formatMessage(messages.admins), membersSections.get(messages.admins.id) || []);
        sections.set(formatMessage(messages.members), membersSections.get(messages.members.id) || []);
    } else {
        // when channel members are not provided, build the sections alphabetically

        makeSortedItems(profiles, groups).forEach((item) => {
            const key = getName(item)[0].toUpperCase();
            sections.set(key, [...sections.get(key) || [], item]);
        });
    }

    const results = [];
    let index = 0;
    for (const [k, items] of sections) {
        if (items.length) {
            results.push({
                first: index === 0,
                id: k,
                data: items,
            });
            index++;
        }
    }
    return results;
}

const makeSortedItems = (profiles: TUser[], groups: TGroup[] | undefined) => {
    if (!groups?.length) {
        return profiles;
    }

    return [...profiles, ...groups].sort((a, b) => getName(a).localeCompare(getName(b)));
};

function createFlatList(profiles: TUser[], groups: TGroup[] | undefined, members?: ChannelMembership[]) {
    if (!profiles.length && !groups?.length) {
        return [];
    }

    if (members?.length && !groups?.length) {
        const profileMap = new Map<string, TUserChannelAdmin>();
        profiles.forEach((profile) => {
            profileMap.set(profile.id, profile);
        });

        return members.forEach((m) => {
            const p = profileMap.get(m.user_id);

            if (p) {
                profileMap.set(p.id, {...p, scheme_admin: m.scheme_admin ?? false});
            }
        });
    }

    return makeSortedItems(profiles, groups);
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
    profiles: TUser[];
    groups?: TGroup[];
    channelMembers?: ChannelMembership[];
    currentUserId: string;
    handleSelectProfile?: (user: TUser) => void;
    handleSelectGroup?: (group: TGroup) => void;
    forceFetchProfile?: boolean;
    fetchMore?: () => void;
    loading: boolean;
    flatten?: boolean;
    manageMode?: boolean;
    showManageMode?: boolean;
    showNoResults: boolean;
    selectedIds?: {[id: string]: UserProfile | Group | GroupModel | false};
    selectionLimit?: number;
    testID?: string;
    term?: string;
    tutorialWatched: boolean;
    spacing?: ComponentProps<typeof UserListRow>['spacing'];
    inBottomSheet?: boolean;
};

export default function UserList({
    profiles,
    groups,
    channelMembers,
    selectedIds,
    selectionLimit,
    currentUserId,
    handleSelectProfile,
    handleSelectGroup,
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

    const Flat = inBottomSheet ? BottomSheetFlatList : FlatList;
    const Sectioned = inBottomSheet ? BottomSheetSectionList : SectionList;

    const noResutsStyle = useMemo(() => [
        style.noResultContainer,
        {paddingBottom: keyboardHeight},
    ], [style, keyboardHeight]);

    const {flatData, sectionedData} = useMemo(() => {
        if (profiles.length === 0 && !groups?.length && !loading) {
            return {sectionedData: []};
        }

        if (flatten) {
            return {flatData: createFlatList(profiles, groups, channelMembers)};
        }

        return {sectionedData: createSectionedList(intl, profiles, groups, channelMembers)};
    }, [channelMembers, loading, profiles, groups, term, flatten]);

    const openUserProfile = useCallback(async (profile: TUser) => {
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

    const openGroupInfo = useCallback(async (group: TGroup) => {
        if (!group?.name) {
            return;
        }

        const screen = Screens.GROUP_INFO;
        const title = intl.formatMessage({id: 'mobile.routes.group_info', defaultMessage: 'Profile'});
        const closeButtonId = 'close-group-info';
        const props = {closeButtonId, groupName: group.name};

        Keyboard.dismiss();
        openAsBottomSheet({screen, title, theme, closeButtonId, props});
    }, []);

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

    const renderSectionHeader = useCallback(({section}: {section: SectionListData<{id: string}>}) => {
        return (
            <View style={style.sectionWrapper}>
                <View style={style.sectionContainer}>
                    <Text style={style.sectionText}>{section.id}</Text>
                </View>
            </View>
        );
    }, [style]);

    const renderItem: ComponentProps<typeof Flat | typeof Sectioned>['renderItem'] = useCallback(({item, index, section}: RenderItemType) => {
        const isUser = 'username' in item;

        // The list will re-render when the selection changes because it's passed into the list as extraData
        const selected = Boolean(selectedIds?.[item.id]);
        const canAdd = Boolean(selectedIds && Boolean(!selectionLimit || Object.keys(selectedIds).length < selectionLimit));

        const openItem = isUser ? openUserProfile : openGroupInfo;
        const selectItem = isUser ? handleSelectProfile : handleSelectGroup;

        return (
            <UserListRow
                key={item.id}
                highlight={section?.first && index === 0}
                id={item.id}
                isChannelAdmin={(isUser && item.scheme_admin) ?? false}
                isMyUser={currentUserId === item.id}
                manageMode={manageMode}
                onPress={selectItem ? ((canAdd || selected) && selectItem) || undefined : openItem}
                onLongPress={openItem}
                selectable={manageMode || canAdd}
                disabled={selectedIds && !canAdd}
                selected={selected}
                showManageMode={showManageMode}
                testID='create_direct_message.user_list.user_item'
                tutorialWatched={tutorialWatched}
                item={item}
                spacing={spacing}
            />
        );
    }, [selectedIds, handleSelectProfile, handleSelectGroup, openUserProfile, openGroupInfo, showManageMode, manageMode, tutorialWatched]);

    if (flatData) {
        return (
            <Flat
                contentContainerStyle={style.flatContainer}
                keyboardShouldPersistTaps='always'
                data={flatData}
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
                onEndReached={fetchMore}
            />
        );
    }

    return sectionedData && (
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
            sections={sectionedData}
            style={style.list}
            stickySectionHeadersEnabled={false}
            testID={`${testID}.section_list`}
            onEndReached={fetchMore}
        />
    );
}
