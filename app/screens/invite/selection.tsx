// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useState, useMemo} from 'react';
import {
    Keyboard,
    Platform,
    View,
    type LayoutChangeEvent,
    useWindowDimensions,
    FlatList,
    type ListRenderItemInfo,
    ScrollView,
} from 'react-native';
import Animated, {useAnimatedStyle, useDerivedValue} from 'react-native-reanimated';

import SelectedChip from '@components/chips/selected_chip';
import SelectedUserChip from '@components/chips/selected_user_chip';
import TouchableWithFeedback from '@components/touchable_with_feedback';
import UserItem from '@components/user_item';
import {MAX_LIST_HEIGHT, MAX_LIST_TABLET_DIFF} from '@constants/autocomplete';
import {useTheme} from '@context/theme';
import {useAutocompleteDefaultAnimatedValues} from '@hooks/autocomplete';
import {useIsTablet} from '@hooks/device';
import {makeStyleSheetFromTheme, changeOpacity} from '@utils/theme';

import SelectionSearchBar from './selection_search_bar';
import SelectionTeamBar from './selection_team_bar';
import TextItem, {TextItemType} from './text_item';

import type {SearchResult} from './invite';

const AUTOCOMPLETE_ADJUST = 5;

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

const keyExtractor = (item: SearchResult) => (
    typeof item === 'string' ? item : (item as UserProfile).id
);

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        container: {
            display: 'flex',
            flex: 1,
        },
        searchList: {
            left: 20,
            right: 20,
            position: 'absolute',
            bottom: Platform.select({ios: 'auto', default: undefined}),
        },
        searchListBorder: {
            borderWidth: 1,
            borderColor: changeOpacity(theme.centerChannelColor, 0.2),
            borderRadius: 4,
            elevation: 3,
        },
        searchListPadding: {
            paddingVertical: 8,
            flex: 1,
        },
        searchListShadow: {
            shadowColor: '#000',
            shadowOpacity: 0.12,
            shadowRadius: 6,
            shadowOffset: {
                width: 0,
                height: 6,
            },
            borderRadius: 4,
            backgroundColor: theme.centerChannelBg,
        },
        searchListFlatList: {
            backgroundColor: theme.centerChannelBg,
            borderRadius: 4,
            paddingHorizontal: 16,
        },
        selectedItems: {
            display: 'flex',
            flexGrowth: 1,
        },
        selectedItemsContainer: {
            alignItems: 'flex-start',
            flexDirection: 'row',
            flexWrap: 'wrap',
            marginHorizontal: 20,
            marginVertical: 16,
            gap: 8,
        },
    };
});

type SelectionProps = {
    teamId: string;
    teamDisplayName: string;
    teamLastIconUpdate: number;
    teamInviteId: string;
    teammateNameDisplay: string;
    serverUrl: string;
    term: string;
    searchResults: SearchResult[];
    selectedIds: {[id: string]: SearchResult};
    keyboardOverlap: number;
    wrapperHeight: number;
    loading: boolean;
    testID: string;
    onSearchChange: (text: string) => void;
    onSelectItem: (item: SearchResult) => void;
    onRemoveItem: (id: string) => void;
    onClose: () => Promise<void>;
}

export default function Selection({
    teamId,
    teamDisplayName,
    teamLastIconUpdate,
    teamInviteId,
    teammateNameDisplay,
    serverUrl,
    term,
    searchResults,
    selectedIds,
    keyboardOverlap,
    wrapperHeight,
    loading,
    testID,
    onSearchChange,
    onSelectItem,
    onRemoveItem,
    onClose,
}: SelectionProps) {
    const theme = useTheme();
    const styles = getStyleSheet(theme);
    const dimensions = useWindowDimensions();
    const isTablet = useIsTablet();

    const [teamBarHeight, setTeamBarHeight] = useState(0);
    const [searchBarHeight, setSearchBarHeight] = useState(0);

    const onLayoutSelectionTeamBar = useCallback((e: LayoutChangeEvent) => {
        setTeamBarHeight(e.nativeEvent.layout.height);
    }, []);

    const onLayoutSearchBar = useCallback((e: LayoutChangeEvent) => {
        setSearchBarHeight(e.nativeEvent.layout.height);
    }, []);

    const handleOnRemoveItem = (id: string) => {
        onRemoveItem(id);
    };

    const otherElementsSize = teamBarHeight + searchBarHeight;
    const workingSpace = wrapperHeight - keyboardOverlap;
    const spaceOnTop = otherElementsSize - AUTOCOMPLETE_ADJUST;
    const spaceOnBottom = workingSpace - otherElementsSize;
    const autocompletePosition = spaceOnBottom > spaceOnTop ? (
        otherElementsSize
    ) : (
        workingSpace - otherElementsSize
    );
    const autocompleteAvailableSpace = spaceOnBottom > spaceOnTop ? spaceOnBottom : spaceOnTop;
    const isLandscape = dimensions.width > dimensions.height;
    const maxHeightAdjust = (isTablet && isLandscape) ? MAX_LIST_TABLET_DIFF : 0;
    const defaultMaxHeight = MAX_LIST_HEIGHT - maxHeightAdjust;

    const [animatedAutocompletePosition, animatedAutocompleteAvailableSpace] = useAutocompleteDefaultAnimatedValues(autocompletePosition, autocompleteAvailableSpace);

    const maxHeight = useDerivedValue(() => {
        return Math.min(animatedAutocompleteAvailableSpace.value, defaultMaxHeight);
    }, [animatedAutocompleteAvailableSpace, defaultMaxHeight]);

    const searchListContainerAnimatedStyle = useAnimatedStyle(() => ({
        top: animatedAutocompletePosition.value,
        maxHeight: maxHeight.value,
    }), [animatedAutocompletePosition, maxHeight]);

    const searchListContainerStyle = useMemo(() => {
        const style = [];

        style.push(
            styles.searchList,
            searchListContainerAnimatedStyle,
        );

        if (Platform.OS === 'ios') {
            style.push(styles.searchListShadow);
        }

        return style;
    }, [searchResults, styles, searchListContainerAnimatedStyle]);

    const searchListFlatListStyle = useMemo(() => {
        const style = [];

        style.push(styles.searchListFlatList);

        if (searchResults.length || (term && !loading)) {
            style.push(styles.searchListBorder, styles.searchListPadding);
        }

        return style;
    }, [searchResults, styles, Boolean(term && !loading)]);

    const renderNoResults = useCallback(() => {
        if (!term || loading) {
            return null;
        }

        return (
            <TextItem
                text={term}
                type={TextItemType.SEARCH_NO_RESULTS}
                testID='invite.search_list_no_results'
            />
        );
    }, [term, loading]);

    const renderItem = useCallback(({item}: ListRenderItemInfo<SearchResult>) => {
        const key = keyExtractor(item);

        return typeof item === 'string' ? (
            <TouchableWithFeedback
                key={key}
                index={key}
                onPress={() => onSelectItem(item)}
                underlayColor={changeOpacity(theme.buttonBg, 0.08)}
                type='native'
                testID={`invite.search_list_item.${key}`}
            >
                <TextItem
                    text={item}
                    type={TextItemType.SEARCH_INVITE}
                    testID='invite.search_list_text_item'
                />
            </TouchableWithFeedback>
        ) : (
            <UserItem
                user={item}
                testID='invite.search_list_user_item'
                onUserPress={onSelectItem}
            />
        );
    }, [searchResults, onSelectItem]);

    const renderSelectedItems = useMemo(() => {
        const selectedItems = [];

        for (const id of Object.keys(selectedIds)) {
            const selectedItem = selectedIds[id];

            selectedItems.push(typeof selectedItem === 'string' ? (
                <SelectedChip
                    id={id}
                    key={id}
                    text={selectedItem}
                    onRemove={handleOnRemoveItem}
                    testID={`invite.selected_item.${selectedItem}`}
                />
            ) : (
                <SelectedUserChip
                    key={id}
                    user={selectedItem}
                    teammateNameDisplay={teammateNameDisplay}
                    onPress={handleOnRemoveItem}
                    testID='invite.selected_item'
                />
            ));
        }

        return selectedItems;
    }, [selectedIds]);

    return (
        <View
            style={styles.container}
            testID={testID}
        >
            <SelectionTeamBar
                teamId={teamId}
                teamDisplayName={teamDisplayName}
                teamLastIconUpdate={teamLastIconUpdate}
                teamInviteId={teamInviteId}
                serverUrl={serverUrl}
                onLayoutContainer={onLayoutSelectionTeamBar}
                onClose={onClose}
            />
            <SelectionSearchBar
                term={term}
                onSearchChange={onSearchChange}
                onLayoutContainer={onLayoutSearchBar}
            />
            {Object.keys(selectedIds).length > 0 && (
                <ScrollView
                    style={styles.selectedItems}
                    contentContainerStyle={styles.selectedItemsContainer}
                    testID='invite.selected_items'
                >
                    {renderSelectedItems}
                </ScrollView>
            )}
            <Animated.View style={searchListContainerStyle}>
                <FlatList
                    data={searchResults}
                    keyboardShouldPersistTaps='always'
                    {...keyboardDismissProp}
                    keyExtractor={keyExtractor}
                    initialNumToRender={INITIAL_BATCH_TO_RENDER}
                    ListEmptyComponent={renderNoResults}
                    maxToRenderPerBatch={INITIAL_BATCH_TO_RENDER + 1}
                    renderItem={renderItem}
                    scrollEventThrottle={SCROLL_EVENT_THROTTLE}
                    testID='invite.search_list'
                    style={searchListFlatListStyle}
                />
            </Animated.View>
        </View>
    );
}
