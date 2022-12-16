// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useMemo} from 'react';
import {useIntl} from 'react-intl';
import {FlatList, Keyboard, ListRenderItemInfo, Platform, SectionList, SectionListData, Text, View} from 'react-native';

import {storeProfile} from '@actions/local/user';
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

const INITIAL_BATCH_TO_RENDER = 15;
const SCROLL_EVENT_THROTTLE = 60;

const SECTION_TITLE_ADMINS = 'CHANNEL ADMINS';
const SECTION_TITLE_MEMBERS = 'MEMBERS';

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
    return cAdmin ? SECTION_TITLE_ADMINS : SECTION_TITLE_MEMBERS;
};

//
// console.log('\n');

// const users = ['jason.frerich', 'avinash.lingaloo', 'christopher'];
//
// const userIds = [
//     '9ciscaqbrpd6d8s68k76xb9bte', // avinash lingaloo
//     'yp7cfozunfd83r4zxmq6jycdxe', // chris speller
//     'zmaiho88ut84prw4w4q74f6kyy', // jason frerich
// ];

// if (members) {
//     console.log('. IN HERE!');
//     members.map((m) => {
//         if (userIds.includes(m.user_id)) {
//             console.log(m.user_id, m.scheme_admin);
//         }
//     });
// }

type sectionType = {[key: string]: UserProfile[]};

const addProfileToSection = (sectionKey: string, sections: sectionType, sectionKeys: string[]) => {
    if (!sections[sectionKey]) {
        sections[sectionKey] = [];
        sectionKeys.push(sectionKey);
    }
    return {sections, sectionKeys};
};

export function createProfilesSections(manageMode: boolean, profiles: UserProfile[], members?: ChannelMember[]) {
    // const sections: {[key: string]: UserProfile[]} = {};
    // const sectionKeys: string[] = [];
    //
    // const map = new Map();
    // profiles.forEach((p) => map.set(p.id, p));
    //
    // members?.forEach((m) => {
    //     const sectionKey = sectionRoleKeyExtractor(Boolean(m.scheme_admin));
    //     addProfileToSection(sectionKey, sections, sectionKeys);
    //     return sections[sectionKey].push({...map.get(m.user_id), isChannelAdmin: m.scheme_admin});
    // });

    // if (!sections[sectionKey]) {
    //     sections[sectionKey] = [];
    //     sectionKeys.push(sectionKey);
    // }
    // return {sections, sectionKeys};

    const userDictionary = new Map();
    const channelAdminDictionary = new Map();

    profiles.forEach((p) => userDictionary.set(p.id, p));
    members?.forEach((m) => {
        if (m.scheme_admin) {
            return channelAdminDictionary.set(m.user_id,
                {...userDictionary.get(m.user_id), ...m});
        }
        return undefined;
    });

    const sections = new Map();
    sections.set('ChannelAdmin', channelAdminDictionary.values());
    sections.set('ChannelMembers', userDictionary.values());

    const results = [];
    for (const [k, v] of sections) {
        results.push({
            id: k,
            data: sections[k],
        });
    }
    console.log('results', results);

    return results;

    sectionKeys.sort();

    return sectionKeys.map((sectionKey, index) => {
        return {
            id: sectionKey,
            first: index === 0,
            data: sections[sectionKey],
        };
    });
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

type UserProfileWithChannelAdmin = UserProfile & {isChannelAdmin?: boolean}

type Props = {
    profiles: UserProfile[];
    canManageMembers?: boolean;
    channelMembers?: ChannelMember[];
    currentUserId: string;
    teammateNameDisplay: string;
    handleSelectProfile: (user: UserProfile) => void;
    fetchMore: () => void;
    loading: boolean;
    manageMode?: boolean;
    showManageMode?: boolean;
    showNoResults: boolean;
    selectedIds: {[id: string]: UserProfile};
    testID?: string;
    term?: string;
    tutorialWatched: boolean;
}

export default function UserList({
    profiles,
    channelMembers,
    canManageMembers,
    selectedIds,
    currentUserId,
    teammateNameDisplay,
    handleSelectProfile,
    fetchMore,
    loading,
    manageMode = false,
    showManageMode = false,
    showNoResults,
    term,
    testID,
    tutorialWatched,
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
        if (term) {
            return profiles;
        }
        return createProfilesSections(manageMode, profiles, channelMembers);
    }, [term, profiles, channelMembers]);

    const openUserProfile = useCallback(async (profile: UserProfile) => {
        const {user} = await storeProfile(serverUrl, profile);
        if (user) {
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
        }
    }, []);

    const renderItem = useCallback(({item, index, section}: ListRenderItemInfo<UserProfileWithChannelAdmin> & {section?: SectionListData<UserProfileWithChannelAdmin>}) => {
        // The list will re-render when the selection changes because it's passed into the list as extraData
        const selected = Boolean(selectedIds[item.id]);
        const canAdd = Object.keys(selectedIds).length < General.MAX_USERS_IN_GM;

        const isChAdmin = item.isChannelAdmin || false;

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
                teammateNameDisplay={teammateNameDisplay}
                tutorialWatched={tutorialWatched}
                user={item}
            />
        );
    }, [selectedIds, canManageMembers, handleSelectProfile, showManageMode, manageMode, teammateNameDisplay, tutorialWatched]);

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
        return renderFlatList(data as UserProfile[]);
    }
    return renderSectionList(data as Array<SectionListData<UserProfile>>);
}

