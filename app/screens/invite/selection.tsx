// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useState, useMemo, useEffect, useRef} from 'react';
import {useIntl} from 'react-intl';
import {
    Keyboard,
    Platform,
    View,
    type LayoutChangeEvent,
    useWindowDimensions,
    FlatList,
    type ListRenderItemInfo,
    type NativeScrollEvent,
    type NativeSyntheticEvent,
} from 'react-native';
import {KeyboardAwareScrollView} from 'react-native-keyboard-aware-scroll-view';
import Animated, {useAnimatedStyle, useDerivedValue} from 'react-native-reanimated';

import Button from '@components/button';
import SelectedChip from '@components/selected_chip';
import SelectedUser from '@components/selected_users/selected_user';
import TouchableWithFeedback from '@components/touchable_with_feedback';
import UserItem from '@components/user_item';
import {MAX_LIST_HEIGHT, MAX_LIST_TABLET_DIFF} from '@constants/autocomplete';
import {useTheme} from '@context/theme';
import {useAutocompleteDefaultAnimatedValues} from '@hooks/autocomplete';
import {useIsTablet} from '@hooks/device';
import {makeStyleSheetFromTheme, changeOpacity} from '@utils/theme';

import SelectionInviteAs from './selection_invite_as';
import SelectionSearchBar from './selection_search_bar';
import SelectionTeamBar from './selection_team_bar';
import TextItem, {TextItemType} from './text_item';

import type {SearchResult} from './invite_types';
import type UserModel from '@typings/database/models/servers/user';

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
    keyboardOverlap: number;
    wrapperHeight: number;
    loading: boolean;
    canInviteUser: boolean;
    canInviteGuest: boolean;
    guestEnabled: boolean;
    emailEnabled?: boolean;
    customMessageEnabled?: boolean;
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
    onCustomMessageToggleChange: (enabled: boolean) => void;
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
    keyboardOverlap,
    wrapperHeight,
    loading,
    canInviteUser,
    canInviteGuest,
    guestEnabled,
    emailEnabled,
    customMessageEnabled,
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
    onCustomMessageToggleChange,
    onCustomMessageChange,
}: SelectionProps) {
    const {formatMessage, locale} = useIntl();
    const theme = useTheme();
    const styles = getStyleSheet(theme);
    const dimensions = useWindowDimensions();
    const isTablet = useIsTablet();

    const scrollViewRef = useRef<KeyboardAwareScrollView>(null);
    const updateScrollTimeout = useRef<NodeJS.Timeout>();
    const scrollToBottomTimeout = useRef<NodeJS.Timeout>();

    const [teamBarHeight, setTeamBarHeight] = useState(0);
    const [searchBarHeight, setSearchBarHeight] = useState(0);
    const [scrollPosition, setScrollPosition] = useState(0);

    const selectedCount = Object.keys(selectedIds).length;

    useEffect(() => {
        const isDisabled = !selectedCount || (selectedCount !== 0 && guestEnabled && !selectedChannelsCount);

        onGetFooterButton(
            <Button
                theme={theme}
                size='lg'
                emphasis='primary'
                text={formatMessage({id: 'invite.selection.send_invitations', defaultMessage: 'Send invitations'})}
                buttonType={isDisabled ? 'disabled' : 'default'}
                backgroundStyle={{flex: 1}}
                onPress={onSend}
                testID='invite.footer_button.send_invite'
            />,
        );
    }, [selectedCount, guestEnabled, selectedChannelsCount, onSend, locale]);

    useEffect(() => {
        return () => {
            if (updateScrollTimeout.current) {
                clearTimeout(updateScrollTimeout.current);
            }

            if (scrollToBottomTimeout.current) {
                clearTimeout(scrollToBottomTimeout.current);
            }
        };
    }, []);

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
        otherElementsSize - scrollPosition
    ) : (
        (workingSpace + scrollPosition) - otherElementsSize
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

    const scrollToBottom = useCallback(() => {
        if (scrollToBottomTimeout.current) {
            clearTimeout(scrollToBottomTimeout.current);
        }

        scrollToBottomTimeout.current = setTimeout(() => {
            scrollViewRef.current?.scrollToEnd();
            scrollToBottomTimeout.current = undefined;
        }, 200);
    }, []);

    const handleOnScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
        onSearchChange('');
        const pos = e.nativeEvent.contentOffset.y;

        if (updateScrollTimeout.current) {
            clearTimeout(updateScrollTimeout.current);
        }

        updateScrollTimeout.current = setTimeout(() => {
            setScrollPosition(pos);
            updateScrollTimeout.current = undefined;
        }, 100);
    }, []);

    const handleOnGuestChange = (enabled: boolean) => {
        onGuestChange(enabled);

        if (enabled) {
            scrollToBottom();
        }
    };

    const handleOnCustomMessageInputFocus = () => {
        onSearchChange('');
        scrollToBottom();
    };

    const handleOnCustomMessageToggleChange = (enabled: boolean) => {
        onCustomMessageToggleChange(enabled);

        if (enabled) {
            scrollToBottom();
        }
    };

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

    const onSelect = useCallback((user: UserProfile | UserModel) => {
        if ('create_at' in user) {
            onSelectItem(user);
            return;
        }

        onSelectItem(user.toApi());
    }, [onSelectItem]);

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
                onUserPress={onSelect}
            />
        );
    }, [searchResults, onSelectItem, onSelect]);

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
            <KeyboardAwareScrollView
                style={styles.container}
                ref={scrollViewRef}
                keyboardShouldPersistTaps={'always'}
                onScroll={handleOnScroll}
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
                    emailEnabled={emailEnabled}
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
                        {canInviteGuest && (
                            <SelectionInviteAs
                                guestEnabled={guestEnabled}
                                selectedChannelsCount={selectedChannelsCount}
                                customMessageEnabled={customMessageEnabled}
                                customMessage={customMessage}
                                canChange={canInviteUser}
                                onGuestChange={handleOnGuestChange}
                                onSelectChannels={onOpenSelectChannels}
                                onCustomMessageToggleChange={handleOnCustomMessageToggleChange}
                                onCustomMessageInputFocus={handleOnCustomMessageInputFocus}
                                onCustomMessageChange={onCustomMessageChange}
                            />
                        )}
                    </>
                )}
            </KeyboardAwareScrollView>
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
