// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useState, useMemo} from 'react';
import {useIntl} from 'react-intl';
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
import {KeyboardAwareScrollView} from 'react-native-keyboard-controller';
import Animated, {useAnimatedStyle, useDerivedValue} from 'react-native-reanimated';

import SelectedChip from '@components/chips/selected_chip';
import SelectedUserChip from '@components/chips/selected_user_chip';
import FloatingTextInput from '@components/floating_input/floating_text_input_label';
import OptionItem from '@components/option_item';
import TouchableWithFeedback from '@components/touchable_with_feedback';
import UserItem from '@components/user_item';
import {Screens} from '@constants';
import {MAX_LIST_HEIGHT, MAX_LIST_TABLET_DIFF} from '@constants/autocomplete';
import {useTheme} from '@context/theme';
import {useAutocompleteDefaultAnimatedValues} from '@hooks/autocomplete';
import {useIsTablet} from '@hooks/device';
import {navigateToScreen} from '@screens/navigation';
import SettingsStore from '@store/settings_store';
import {makeStyleSheetFromTheme, changeOpacity} from '@utils/theme';

import SelectionSearchBar from './selection_search_bar';
import SelectionTeamBar from './selection_team_bar';
import TextItem from './text_item';
import {TextItemType, type SearchResult, type SendOptions} from './types';

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
        },
        selectedItemsContainer: {
            alignItems: 'flex-start',
            flexDirection: 'row',
            flexWrap: 'wrap',
            marginVertical: 16,
            gap: 8,
        },
        contentContainer: {
            paddingHorizontal: 20,
        },
        optionsContainer: {
            marginTop: 16,
            gap: 8,
        },
    };
});

function extractChannelId(channelId: Channel) {
    return channelId.id;
}

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
    sendOptions: SendOptions;
    onSendOptionsChange: React.Dispatch<React.SetStateAction<SendOptions>>;
    onSearchChange: (text: string) => void;
    onSelectItem: (item: SearchResult) => void;
    onRemoveItem: (id: string) => void;
    onClose: () => Promise<void>;
    canInviteGuests: boolean;
    allowGuestMagicLink: boolean;
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
    sendOptions: {
        inviteAsGuest,
        includeCustomMessage,
        customMessage,
        selectedChannels,
        guestMagicLink,
    },
    onSendOptionsChange,
    canInviteGuests,
    allowGuestMagicLink,
}: SelectionProps) {
    const theme = useTheme();
    const styles = getStyleSheet(theme);
    const dimensions = useWindowDimensions();
    const isTablet = useIsTablet();
    const intl = useIntl();

    const [teamBarHeight, setTeamBarHeight] = useState(0);
    const [searchBarHeight, setSearchBarHeight] = useState(0);

    const hasChannelsSelected = selectedChannels.length > 0;

    const onLayoutSelectionTeamBar = useCallback((e: LayoutChangeEvent) => {
        setTeamBarHeight(e.nativeEvent.layout.height);
    }, []);

    const onLayoutSearchBar = useCallback((e: LayoutChangeEvent) => {
        setSearchBarHeight(e.nativeEvent.layout.height);
    }, []);

    const handleOnRemoveItem = useCallback((id: string) => {
        onRemoveItem(id);
    }, [onRemoveItem]);

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
    }, [styles, searchListContainerAnimatedStyle]);

    const searchListFlatListStyle = useMemo(() => {
        const style = [];

        style.push(styles.searchListFlatList);

        if (searchResults.length || (term && !loading)) {
            style.push(styles.searchListBorder, styles.searchListPadding);
        }

        return style;
    }, [loading, searchResults.length, styles, term]);

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
    }, [theme.buttonBg, onSelectItem]);

    const goToSelectorScreen = useCallback((() => {
        const title = intl.formatMessage({id: 'invite.selected_channels', defaultMessage: 'Selected channels'});

        const handleSelectChannels = (channels: Channel[]) => {
            SettingsStore.removeIntegrationsSelectCallback();
            onSendOptionsChange((options) => ({
                ...options,
                selectedChannels: channels.map(extractChannelId),
            }));
        };

        SettingsStore.setIntegrationsSelectCallback(handleSelectChannels);
        navigateToScreen(Screens.INTEGRATION_SELECTOR, {title, dataSource: 'channels', selected: selectedChannels, isMultiselect: true});
    }), [intl, selectedChannels, onSendOptionsChange]);

    const handleInviteAsGuestChange = useCallback(() => {
        onSendOptionsChange((options) => ({
            ...options,
            inviteAsGuest: !options.inviteAsGuest,
        }));
    }, [onSendOptionsChange]);

    const handleIncludeCustomMessageChange = useCallback(() => {
        onSendOptionsChange((options) => ({
            ...options,
            includeCustomMessage: !options.includeCustomMessage,
        }));
    }, [onSendOptionsChange]);

    const handleCustomMessageChange = useCallback((text: string) => {
        onSendOptionsChange((options) => ({
            ...options,
            customMessage: text,
        }));
    }, [onSendOptionsChange]);

    const handlePasswordlessInvitesChange = useCallback(() => {
        onSendOptionsChange((options) => ({
            ...options,
            guestMagicLink: !options.guestMagicLink,
        }));
    }, [onSendOptionsChange]);

    const renderSelectedItems = () => {
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
    };

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
            <KeyboardAwareScrollView
                contentContainerStyle={styles.contentContainer}
            >
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
                        {renderSelectedItems()}
                    </ScrollView>
                )}
                <View style={styles.optionsContainer}>
                    {canInviteGuests && (
                        <OptionItem
                            label={intl.formatMessage({id: 'invite.invite_as_guest', defaultMessage: 'Invite as guest'})}
                            description={intl.formatMessage({id: 'invite.invite_as_guest_description', defaultMessage: 'Guests are limited to selected channels'})}
                            type='toggle'
                            selected={inviteAsGuest}
                            action={handleInviteAsGuestChange}
                            testID='invite.invite_as_guest'
                        />
                    )}
                    {inviteAsGuest && (
                        <>
                            <OptionItem
                                label={intl.formatMessage({id: 'invite.selected_channels', defaultMessage: 'Selected channels'})}
                                type='arrow'
                                action={goToSelectorScreen}
                                info={hasChannelsSelected ? intl.formatMessage({id: 'invite.selected_channels_count', defaultMessage: '{count} {count, plural, one{channel} other{channels}}'}, {count: selectedChannels.length}) : intl.formatMessage({id: 'invite.no_channels_selected', defaultMessage: 'Required for guests'})}
                                isInfoDestructive={!hasChannelsSelected}
                                testID='invite.selected_channels'
                                icon={'globe'}
                            />
                            <OptionItem
                                label={intl.formatMessage({id: 'invite.set_custom_message', defaultMessage: 'Set a custom message'})}
                                type='toggle'
                                selected={includeCustomMessage}
                                action={handleIncludeCustomMessageChange}
                                testID='invite.include_custom_message'
                            />
                            {includeCustomMessage && (
                                <FloatingTextInput
                                    label={intl.formatMessage({id: 'invite.custom_message', defaultMessage: 'Enter a custom message'})}
                                    value={customMessage}
                                    onChangeText={handleCustomMessageChange}
                                    testID='invite.custom_message'
                                    theme={theme}
                                    multiline={true}
                                />
                            )}
                            {allowGuestMagicLink && (
                                <OptionItem
                                    label={intl.formatMessage({id: 'invite.guest_magic_link', defaultMessage: 'Use magic link'})}
                                    description={intl.formatMessage({id: 'invite.guest_magic_link_description', defaultMessage: 'Newly created guests will join and log in without a password, using a magic link sent to their email address'})}
                                    type='toggle'
                                    selected={guestMagicLink}
                                    action={handlePasswordlessInvitesChange}
                                    testID='invite.guest_magic_link'
                                />
                            )}
                        </>
                    )}
                </View>
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
        </View>
    );
}
