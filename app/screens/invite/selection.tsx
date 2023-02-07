// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useState, useMemo, useEffect} from 'react';
import {useIntl} from 'react-intl';
import {
    Keyboard,
    Platform,
    View,
    LayoutChangeEvent,
    useWindowDimensions,
    FlatList,
    ListRenderItemInfo,
    ScrollView,
} from 'react-native';
import Animated, {useAnimatedStyle, useDerivedValue} from 'react-native-reanimated';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import SelectedChip from '@components/selected_chip';
import SelectedUser from '@components/selected_users/selected_user';
import TouchableWithFeedback from '@components/touchable_with_feedback';
import UserItem from '@components/user_item';
import {MAX_LIST_HEIGHT, MAX_LIST_TABLET_DIFF} from '@constants/autocomplete';
import {useTheme} from '@context/theme';
import {useAutocompleteDefaultAnimatedValues} from '@hooks/autocomplete';
import {useIsTablet, useKeyboardHeight} from '@hooks/device';
import {makeStyleSheetFromTheme, changeOpacity} from '@utils/theme';

import FooterButton from './footer_button';
import SelectionInviteAs from './selection_invite_as';
import SelectionSearchBar from './selection_search_bar';
import SelectionTeamBar from './selection_team_bar';
import TextItem, {TextItemType} from './text_item';

import type {SearchResult} from './invite_types';

const AUTOCOMPLETE_ADJUST = 5;
const KEYBOARD_HEIGHT_ADJUST = 3;

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
        selection: {
            display: 'flex',
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
        },
        selectedItems: {
            alignItems: 'flex-start',
            flexDirection: 'row',
            flexWrap: 'wrap',
            marginHorizontal: 20,
            marginTop: 16,
            marginBottom: 8,
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
    modalPosition: number;
    wrapperHeight: number;
    loading: boolean;
    guestEnabled: boolean;
    customMessage: string;
    selectedChannelsCount: number;
    testID: string;
    onSearchChange: (text: string) => void;
    onSelectItem: (item: SearchResult) => void;
    onRemoveItem: (id: string) => void;
    onClose: () => Promise<void>;
    onSend: () => Promise<void>;
    onGetFooterButton: (button: React.ReactNode) => void;
    onOpenSelectChannels: () => void;
    onGuestChange: (enabled: boolean) => void;
    onCustomMessageChange: (text: string) => void;
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
    modalPosition,
    wrapperHeight,
    loading,
    guestEnabled,
    customMessage,
    selectedChannelsCount,
    testID,
    onSearchChange,
    onSelectItem,
    onRemoveItem,
    onClose,
    onSend,
    onGetFooterButton,
    onOpenSelectChannels,
    onGuestChange,
    onCustomMessageChange,
}: SelectionProps) {
    const {formatMessage, locale} = useIntl();
    const theme = useTheme();
    const styles = getStyleSheet(theme);
    const dimensions = useWindowDimensions();
    const insets = useSafeAreaInsets();
    const isTablet = useIsTablet();
    const keyboardHeight = useKeyboardHeight();

    const [teamBarHeight, setTeamBarHeight] = useState(0);
    const [searchBarHeight, setSearchBarHeight] = useState(0);

    const selectedCount = Object.keys(selectedIds).length;

    useEffect(() => {
        onGetFooterButton(
            <FooterButton
                text={formatMessage({id: 'invite.selection.send_invitations', defaultMessage: 'Send invitations'})}
                disabled={!selectedCount || (selectedCount !== 0 && guestEnabled && !selectedChannelsCount)}
                onPress={onSend}
                testID='send_invite'
            />,
        );
    }, [selectedCount, guestEnabled, selectedChannelsCount, locale]);

    const onLayoutSelectionTeamBar = useCallback((e: LayoutChangeEvent) => {
        setTeamBarHeight(e.nativeEvent.layout.height);
    }, []);

    const onLayoutSearchBar = useCallback((e: LayoutChangeEvent) => {
        setSearchBarHeight(e.nativeEvent.layout.height);
    }, []);

    const handleOnRemoveItem = (id: string) => {
        onRemoveItem(id);
    };

    const bottomSpace = dimensions.height - wrapperHeight - modalPosition;
    const otherElementsSize = teamBarHeight + searchBarHeight;
    const insetsAdjust = (keyboardHeight + KEYBOARD_HEIGHT_ADJUST) || insets.bottom;

    const keyboardOverlap = Platform.select({
        ios: isTablet ? (
            Math.max(0, keyboardHeight - bottomSpace)
        ) : (
            insetsAdjust
        ),
        default: 0,
    });
    const keyboardAdjust = Platform.select({
        ios: isTablet ? keyboardOverlap : insetsAdjust,
        default: 0,
    });

    const workingSpace = wrapperHeight - keyboardOverlap;
    const spaceOnTop = otherElementsSize - AUTOCOMPLETE_ADJUST;
    const spaceOnBottom = workingSpace - (otherElementsSize + keyboardAdjust);
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

        if (searchResults.length) {
            style.push(styles.searchListBorder, styles.searchListPadding);
        }

        return style;
    }, [searchResults, styles]);

    const renderNoResults = useCallback(() => {
        if (!term || loading) {
            return null;
        }

        return (
            <View style={[styles.searchListBorder, styles.searchListPadding]}>
                <TextItem
                    text={term}
                    type={TextItemType.SEARCH_NO_RESULTS}
                    testID='invite.search_list_no_results'
                />
            </View>
        );
    }, [term, loading]);

    const renderItem = useCallback(({item}: ListRenderItemInfo<SearchResult>) => {
        const key = keyExtractor(item);

        return (
            <TouchableWithFeedback
                key={key}
                index={key}
                onPress={() => onSelectItem(item)}
                underlayColor={changeOpacity(theme.buttonBg, 0.08)}
                type='native'
                testID={`invite.search_list_item.${key}`}
            >
                {typeof item === 'string' ? (
                    <TextItem
                        text={item}
                        type={TextItemType.SEARCH_INVITE}
                        testID='invite.search_list_text_item'
                    />
                ) : (
                    <UserItem
                        user={item}
                        testID='invite.search_list_user_item'
                    />
                )}
            </TouchableWithFeedback>
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
                <SelectedUser
                    key={id}
                    user={selectedItem}
                    teammateNameDisplay={teammateNameDisplay}
                    onRemove={handleOnRemoveItem}
                    testID='invite.selected_item'
                />
            ));
        }

        return selectedItems;
    }, [selectedIds]);

    return (
        <>
            <ScrollView
                style={styles.selection}
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
                {selectedCount > 0 && (
                    <>
                        <View
                            style={styles.selectedItems}
                            testID='invite.selected_items'
                        >
                            {renderSelectedItems}
                        </View>
                        <SelectionInviteAs
                            guestEnabled={guestEnabled}
                            selectedChannelsCount={selectedChannelsCount}
                            customMessage={customMessage}
                            onGuestChange={onGuestChange}
                            onSelectChannels={onOpenSelectChannels}
                            onCustomMessageChange={onCustomMessageChange}
                        />
                    </>
                )}
            </ScrollView>
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
        </>
    );
}
