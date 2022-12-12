// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useState, useMemo} from 'react';
import {useIntl} from 'react-intl';
import {Keyboard, Platform, View, Text, TouchableOpacity, LayoutChangeEvent, useWindowDimensions, FlatList, ListRenderItemInfo, ScrollView} from 'react-native';
import Animated, {useDerivedValue} from 'react-native-reanimated';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import Share from 'react-native-share';
import {ShareOptions} from 'react-native-share/lib/typescript/types';

import CompassIcon from '@components/compass_icon';
import FloatingTextInput from '@components/floating_text_input_label';
import FormattedText from '@components/formatted_text';
import SelectedUser from '@components/selected_users/selected_user';
import TeamIcon from '@components/team_sidebar/team_list/team_item/team_icon';
import TouchableWithFeedback from '@components/touchable_with_feedback';
import UserItem from '@components/user_item';
import {MAX_LIST_HEIGHT, MAX_LIST_TABLET_DIFF} from '@constants/autocomplete';
import {useServerDisplayName} from '@context/server';
import {useTheme} from '@context/theme';
import {useAutocompleteDefaultAnimatedValues} from '@hooks/autocomplete';
import {useIsTablet, useKeyboardHeight} from '@hooks/device';
import {preventDoubleTap} from '@utils/tap';
import {makeStyleSheetFromTheme, changeOpacity, getKeyboardAppearanceFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import {SearchResult} from './invite';
import TextItem, {TextItemType} from './text_item';

const AUTOCOMPLETE_ADJUST = 5;
const BOTTOM_AUTOCOMPLETE_SEPARATION = 10;
const SEARCH_BAR_TITLE_MARGIN_TOP = 24;
const SEARCH_BAR_MARGIN_TOP = 16;
const SEARCH_BAR_BORDER = 2;

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
        teamContainer: {
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            width: '100%',
            paddingVertical: 16,
            paddingHorizontal: 20,
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.04),
        },
        iconContainer: {
            width: 40,
            height: 40,
        },
        textContainer: {
            display: 'flex',
            flexDirection: 'column',
        },
        teamText: {
            color: theme.centerChannelColor,
            marginLeft: 12,
            ...typography('Body', 200, 'SemiBold'),
        },
        serverText: {
            color: changeOpacity(theme.centerChannelColor, 0.72),
            marginLeft: 12,
            ...typography('Body', 75, 'Regular'),
        },
        shareLink: {
            display: 'flex',
            marginLeft: 'auto',
        },
        shareLinkButton: {
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            height: 40,
            paddingHorizontal: 20,
            backgroundColor: changeOpacity(theme.buttonBg, 0.08),
            borderRadius: 4,
        },
        shareLinkText: {
            color: theme.buttonBg,
            ...typography('Body', 100, 'SemiBold'),
            paddingLeft: 7,
        },
        shareLinkIcon: {
            color: theme.buttonBg,
        },
        searchBarTitleText: {
            marginHorizontal: 20,
            marginTop: SEARCH_BAR_TITLE_MARGIN_TOP,
            color: theme.centerChannelColor,
            ...typography('Heading', 700, 'SemiBold'),
        },
        searchBar: {
            marginHorizontal: 20,
            marginTop: SEARCH_BAR_MARGIN_TOP,
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
            overflow: 'hidden',
            borderRadius: 4,
            elevation: 3,
        },
        searchListShadow: {
            shadowColor: '#000',
            shadowOpacity: 0.12,
            shadowRadius: 6,
            shadowOffset: {
                width: 0,
                height: 6,
            },
        },
        searchListFlatList: {
            backgroundColor: theme.centerChannelBg,
            borderRadius: 4,
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
    modalPosition,
    wrapperHeight,
    loading,
    testID,
    onSearchChange,
    onSelectItem,
    onRemoveItem,
    onClose,
}: SelectionProps) {
    const {formatMessage} = useIntl();
    const theme = useTheme();
    const styles = getStyleSheet(theme);
    const serverDisplayName = useServerDisplayName();
    const dimensions = useWindowDimensions();
    const insets = useSafeAreaInsets();
    const isTablet = useIsTablet();
    const keyboardHeight = useKeyboardHeight();

    const [headerFieldHeight, setHeaderFieldHeight] = useState(0);
    const [searchBarHeight, setSearchBarHeight] = useState(0);
    const [searchBarTitleHeight, setSearchBarTitleHeight] = useState(0);

    const onLayoutHeader = useCallback((e: LayoutChangeEvent) => {
        setHeaderFieldHeight(e.nativeEvent.layout.height);
    }, []);

    const onLayoutSearchBar = useCallback((e: LayoutChangeEvent) => {
        setSearchBarHeight(e.nativeEvent.layout.height);
    }, []);

    const onLayoutSearchBarTitle = useCallback((e: LayoutChangeEvent) => {
        setSearchBarTitleHeight(e.nativeEvent.layout.height);
    }, []);

    const handleSearchChange = (text: string) => {
        onSearchChange(text);
    };

    const handleOnRemoveItem = (id: string) => {
        onRemoveItem(id);
    };

    const handleOnShareLink = async () => {
        const url = `${serverUrl}/signup_user_complete/?id=${teamInviteId}`;
        const title = formatMessage({id: 'invite_people_to_team.title', defaultMessage: 'Join the {team} team'}, {team: teamDisplayName});
        const message = formatMessage({id: 'invite_people_to_team.message', defaultMessage: 'Here’s a link to collaborate and communicate with us on Mattermost.'});
        const icon = 'data:<data_type>/<file_extension>;base64,<base64_data>';

        const options: ShareOptions = Platform.select({
            ios: {
                activityItemSources: [
                    {
                        placeholderItem: {
                            type: 'url',
                            content: url,
                        },
                        item: {
                            default: {
                                type: 'text',
                                content: `${message} ${url}`,
                            },
                            copyToPasteBoard: {
                                type: 'url',
                                content: url,
                            },
                        },
                        subject: {
                            default: title,
                        },
                        linkMetadata: {
                            originalUrl: url,
                            url,
                            title,
                            icon,
                        },
                    },
                ],
            },
            default: {
                title,
                subject: title,
                url,
                showAppsToView: true,
            },
        });

        await onClose();

        Share.open(
            options,
        ).catch(() => {
            // do nothing
        });
    };

    const handleShareLink = useCallback(preventDoubleTap(() => handleOnShareLink()), []);

    const bottomSpace = dimensions.height - wrapperHeight - modalPosition;
    const otherElementsSize = headerFieldHeight + searchBarHeight + searchBarTitleHeight +
        SEARCH_BAR_MARGIN_TOP + SEARCH_BAR_TITLE_MARGIN_TOP + SEARCH_BAR_BORDER;
    const insetsAdjust = keyboardHeight || insets.bottom;

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
    const spaceOnBottom = workingSpace - (otherElementsSize + BOTTOM_AUTOCOMPLETE_SEPARATION);
    const autocompletePosition = spaceOnBottom > spaceOnTop ? (
        otherElementsSize
    ) : (
        (workingSpace + AUTOCOMPLETE_ADJUST + keyboardAdjust) - otherElementsSize
    );
    const autocompleteAvailableSpace = spaceOnBottom > spaceOnTop ? spaceOnBottom : spaceOnTop;
    const isLandscape = dimensions.width > dimensions.height;
    const maxHeightAdjust = (isTablet && isLandscape) ? MAX_LIST_TABLET_DIFF : 0;
    const defaultMaxHeight = MAX_LIST_HEIGHT - maxHeightAdjust;

    const [animatedAutocompletePosition, animatedAutocompleteAvailableSpace] = useAutocompleteDefaultAnimatedValues(autocompletePosition, autocompleteAvailableSpace);

    const maxHeight = useDerivedValue(() => {
        return Math.min(animatedAutocompleteAvailableSpace.value, defaultMaxHeight);
    }, [defaultMaxHeight]);

    const searchListContainerStyle = useMemo(() => {
        const style = [];

        style.push(
            styles.searchList,
            {
                top: animatedAutocompletePosition.value,
                maxHeight: maxHeight.value,
            },
        );

        if (searchResults.length) {
            style.push(styles.searchListBorder);
        }

        if (Platform.OS === 'ios') {
            style.push(styles.searchListShadow);
        }

        return style;
    }, [searchResults, styles]);

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
            selectedItems.push(
                <SelectedUser
                    key={id}
                    user={selectedIds[id]}
                    teammateNameDisplay={teammateNameDisplay}
                    onRemove={handleOnRemoveItem}
                    testID='invite.selected_item'
                />,
            );
        }

        return selectedItems;
    }, [selectedIds]);

    return (
        <View
            style={styles.container}
            testID={testID}
        >
            <View
                style={styles.teamContainer}
                onLayout={onLayoutHeader}
            >
                <View style={styles.iconContainer}>
                    <TeamIcon
                        id={teamId}
                        displayName={teamDisplayName}
                        lastIconUpdate={teamLastIconUpdate}
                        selected={false}
                        textColor={theme.centerChannelColor}
                        backgroundColor={changeOpacity(theme.centerChannelColor, 0.16)}
                        testID='invite.team_icon'
                    />
                </View>
                <View style={styles.textContainer}>
                    <Text
                        style={styles.teamText}
                        numberOfLines={1}
                        testID='invite.team_display_name'
                    >
                        {teamDisplayName}
                    </Text>
                    <Text
                        style={styles.serverText}
                        numberOfLines={1}
                        testID='invite.server_display_name'
                    >
                        {serverDisplayName}
                    </Text>
                </View>
                <TouchableOpacity
                    onPress={handleShareLink}
                    style={styles.shareLink}
                >
                    <View
                        style={styles.shareLinkButton}
                        testID='invite.share_link.button'
                    >
                        <CompassIcon
                            name='export-variant'
                            size={18}
                            style={styles.shareLinkIcon}
                        />
                        <FormattedText
                            id='invite.shareLink'
                            defaultMessage='Share link'
                            style={styles.shareLinkText}
                        />
                    </View>
                </TouchableOpacity>
            </View>
            <FormattedText
                id='invite.sendInvitationsTo'
                defaultMessage='Send invitations to…'
                style={styles.searchBarTitleText}
                onLayout={onLayoutSearchBarTitle}
                testID='invite.search_bar_title'
            />
            <View
                style={styles.searchBar}
                onLayout={onLayoutSearchBar}
            >
                <FloatingTextInput
                    autoCorrect={false}
                    autoCapitalize={'none'}
                    blurOnSubmit={false}
                    disableFullscreenUI={true}
                    enablesReturnKeyAutomatically={true}
                    placeholder={formatMessage({id: 'invite.searchPlaceholder', defaultMessage: 'Type a name or email address…'})}
                    onChangeText={handleSearchChange}
                    keyboardAppearance={getKeyboardAppearanceFromTheme(theme)}
                    returnKeyType='search'
                    value={term}
                    theme={theme}
                    testID='invite.search_bar_input'
                />
            </View>
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
                    style={styles.searchListFlatList}
                    testID='invite.search_list'
                />
            </Animated.View>
        </View>
    );
}
