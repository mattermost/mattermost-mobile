// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useMemo} from 'react';
import {FlatList, Keyboard, ListRenderItemInfo, Platform, SectionList, SectionListData, Text, View} from 'react-native';

import FormattedText from '@components/formatted_text';
import UserListRow from '@components/user_list_row';
import {General} from '@constants';
import {useTheme} from '@context/theme';
import {
    changeOpacity,
    makeStyleSheetFromTheme,
} from '@utils/theme';
import {typography} from '@utils/typography';

const INITIAL_BATCH_TO_RENDER = 15;
const SCROLL_EVENT_THROTTLE = 60;

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

export function createProfilesSections(profiles: UserProfile[]) {
    const sections: {[key: string]: UserProfile[]} = {};
    const sectionKeys: string[] = [];
    for (const profile of profiles) {
        const sectionKey = sectionKeyExtractor(profile);

        if (!sections[sectionKey]) {
            sections[sectionKey] = [];
            sectionKeys.push(sectionKey);
        }

        sections[sectionKey].push(profile);
    }

    sectionKeys.sort();

    return sectionKeys.map((sectionKey) => {
        return {
            id: sectionKey,
            data: sections[sectionKey],
        };
    });
}

const getStyleFromTheme = makeStyleSheetFromTheme((theme) => {
    return {
        list: {
            backgroundColor: theme.centerChannelBg,
            flex: 1,
            ...Platform.select({
                android: {
                    marginBottom: 20,
                },
            }),
        },
        container: {
            flexGrow: 1,
        },
        separator: {
            height: 1,
            flex: 1,
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.1),
        },
        listView: {
            flex: 1,
            backgroundColor: theme.centerChannelBg,
            ...Platform.select({
                android: {
                    marginBottom: 20,
                },
            }),
        },
        loadingText: {
            color: changeOpacity(theme.centerChannelColor, 0.6),
        },
        searching: {
            backgroundColor: theme.centerChannelBg,
            height: '100%',
            position: 'absolute',
            width: '100%',
        },
        sectionContainer: {
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.08),
            paddingLeft: 10,
            paddingVertical: 2,
            height: 28,
        },
        sectionWrapper: {
            backgroundColor: theme.centerChannelBg,
        },
        sectionText: {
            color: theme.centerChannelColor,
            ...typography('Body', 300, 'SemiBold'),
        },
        noResultContainer: {
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
        },
        noResultText: {
            fontSize: 26,
            color: changeOpacity(theme.centerChannelColor, 0.5),
        },
    };
});

type Props = {
    profiles: UserProfile[];
    currentUserId: string;
    teammateNameDisplay: string;
    handleSelectProfile: (user: UserProfile) => void;
    fetchMore: () => void;
    loading: boolean;
    showNoResults: boolean;
    selectedIds: {[id: string]: UserProfile};
    testID?: string;
    isSearch: boolean;
}

export default function UserList({
    profiles,
    selectedIds,
    currentUserId,
    teammateNameDisplay,
    handleSelectProfile,
    fetchMore,
    loading,
    showNoResults,
    isSearch,
    testID,
}: Props) {
    const theme = useTheme();
    const style = getStyleFromTheme(theme);

    const renderItem = useCallback(({item}: ListRenderItemInfo<UserProfile>) => {
        // The list will re-render when the selection changes because it's passed into the list as extraData
        const selected = Boolean(selectedIds[item.id]);
        const canAdd = Object.keys(selectedIds).length < General.MAX_USERS_IN_GM;

        return (
            <UserListRow
                key={item.id}
                id={item.id}
                isMyUser={currentUserId === item.id}
                onPress={handleSelectProfile}
                selectable={canAdd}
                selected={selected}
                enabled={canAdd}
                testID='more_direct_messages.user_list.user_item'
                teammateNameDisplay={teammateNameDisplay}
                user={item}
            />
        );
    }, [selectedIds, currentUserId, handleSelectProfile, teammateNameDisplay]);

    const renderLoading = useCallback(() => {
        if (!loading) {
            return null;
        }

        return (
            <View style={style.loadingContainer}>
                <FormattedText
                    id='mobile.loading_members'
                    defaultMessage='Loading Members...'
                    style={style.loadingText}
                />
            </View>
        );
    }, [loading && style]);

    const renderNoResults = useCallback(() => {
        if (!showNoResults) {
            return null;
        }

        return (
            <View style={style.noResultContainer}>
                <FormattedText
                    id='mobile.custom_list.no_results'
                    defaultMessage='No Results'
                    style={style.noResultText}
                />
            </View>
        );
    }, [showNoResults && style]);

    const renderSectionHeader = useCallback(({section}: {section: SectionListData<UserProfile>}) => {
        return (
            <View style={style.sectionWrapper}>
                <View style={style.sectionContainer}>
                    <Text style={style.sectionText}>{section.id}</Text>
                </View>
            </View>
        );
    }, [style]);

    const renderFlatList = (data: UserProfile[]) => {
        return (
            <FlatList
                contentContainerStyle={style.container}
                data={data}
                extraData={selectedIds}
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
                testID={testID}
            />
        );
    };

    const renderSectionList = (data: Array<SectionListData<UserProfile>>) => {
        return (
            <SectionList
                contentContainerStyle={style.container}
                extraData={loading ? false : selectedIds}
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
                sections={data}
                style={style.list}
                stickySectionHeadersEnabled={false}
                testID={testID}
                onEndReached={fetchMore}
            />
        );
    };

    const data = useMemo(() => {
        if (isSearch) {
            return profiles;
        }
        return createProfilesSections(profiles);
    }, [isSearch, profiles]);

    if (isSearch) {
        return renderFlatList(data as UserProfile[]);
    }
    return renderSectionList(data as Array<SectionListData<UserProfile>>);
}

