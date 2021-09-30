// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {useIntl} from 'react-intl';
import {
    KeyboardAvoidingView,
    NativeScrollEvent,
    NativeSyntheticEvent,
    Platform,
    useWindowDimensions,
    View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {KeyboardTrackingView} from 'react-native-ui-lib/keyboard';

import EmojiFlatList from '@components/emoji_picker/components/emoji_flatlist';
import EmojiSectionList from '@components/emoji_picker/components/emoji_sectionlist';
import SectionIcons from '@components/emoji_picker/components/section_icons';
import SearchBar from '@components/search_bar';
import {Device} from '@constants';
import {changeOpacity, getKeyboardAppearanceFromTheme, makeStyleSheetFromTheme} from '@utils/theme';

import {SCROLL_VIEW_NATIVE_ID} from '../index';

type Props = {
    currentSectionIndex: number;
    deviceWidth: number;
    emojis: RenderableEmojis[];
    filteredEmojis: string[];
    itemLayout: any;
    missingPages: boolean;
    onAnimationComplete: (searchBarAnimationComplete: boolean) => void;
    onCancelSearch: (term: string) => void;
    onChangeSearchTerm: (term: string) => void;
    onEmojiPress: (emoji: string) => void;
    onHandleScrollToSectionFailed: ({index}: {index: number}) => void;
    onHandleSectionIconPress: (index: number, isCustomSection: boolean) => void;
    onLoadMoreCustomEmojis: () => void;
    onMomentumScrollEnd: () => void;
    onScroll: (e: NativeSyntheticEvent<NativeScrollEvent>) => void;
    onSetSearchBarRef: (ref: any) => void;
    onSetSectionListRef: (ref: any) => void;
    searchTerm: string | undefined;
    testID: string;
    theme: Theme;
};

const EmojiPicker = ({
    currentSectionIndex,
    deviceWidth,
    emojis,
    filteredEmojis,
    itemLayout,
    missingPages,
    onAnimationComplete,
    onCancelSearch,
    onChangeSearchTerm,
    onEmojiPress,
    onHandleScrollToSectionFailed,
    onHandleSectionIconPress,
    onLoadMoreCustomEmojis,
    onMomentumScrollEnd,
    onScroll,
    onSetSearchBarRef,
    onSetSectionListRef,
    searchTerm,
    testID,
    theme,
}: Props) => {
    const {formatMessage} = useIntl();
    const {height, width} = useWindowDimensions();

    const isLandscape = width > height;
    const isAndroid = Platform.OS === 'android';

    const searchBarTestID = `${testID}.search_bar`;
    const styles = getStyleSheetFromTheme(theme);

    const renderSearchBar = () => {
        const searchBarInput = {
            backgroundColor: theme.centerChannelBg,
            color: theme.centerChannelColor,
            fontSize: 13,
        };

        return (
            <View
                style={styles.searchBar}
                testID={testID}
            >
                <SearchBar
                    autoCapitalize='none'
                    backgroundColor='transparent'
                    cancelTitle={formatMessage({id: 'mobile.post.cancel', defaultMessage: 'Cancel'})}
                    inputHeight={33}
                    inputStyle={searchBarInput}
                    keyboardAppearance={getKeyboardAppearanceFromTheme(theme)}
                    onAnimationComplete={onAnimationComplete}
                    onCancelButtonPress={onCancelSearch}
                    onChangeText={onChangeSearchTerm}
                    placeholder={formatMessage({id: 'search_bar.search', defaultMessage: 'Search'})}
                    placeholderTextColor={changeOpacity(theme.centerChannelColor, 0.5)}
                    ref={onSetSearchBarRef}
                    testID={searchBarTestID}
                    tintColorDelete={changeOpacity(theme.centerChannelColor, 0.5)}
                    tintColorSearch={changeOpacity(theme.centerChannelColor, 0.8)}
                    titleCancelColor={theme.centerChannelColor}
                    value={searchTerm}
                />
            </View>
        );
    };

    const renderSectionIcons = () => {
        return (
            <SectionIcons
                currentSectionIndex={currentSectionIndex}
                emojis={emojis}
                onHandleSectionIconPress={onHandleSectionIconPress}
            />
        );
    };

    const getSectionIcons = () => {
        const getSections = () => {
            return (
                <View style={styles.bottomContentWrapper}>
                    <View style={styles.bottomContent}>
                        {renderSectionIcons()}
                    </View>
                </View>
            );
        };

        if (isAndroid) {
            return getSections();
        }

        return (
            <KeyboardTrackingView
                normalList={true}
                scrollViewNativeID={SCROLL_VIEW_NATIVE_ID}
            >
                {getSections()}
            </KeyboardTrackingView>
        );
    };

    const renderListComponent = (margin: number) => {
        if (searchTerm) {
            return (
                <EmojiFlatList
                    filteredEmojis={filteredEmojis}
                    searchTerm={searchTerm}
                    onEmojiPress={onEmojiPress}
                />
            );
        }

        return (
            <EmojiSectionList
                deviceWidth={deviceWidth}
                emojis={emojis}
                itemLayout={itemLayout}
                missingPages={missingPages}
                onEmojiPress={onEmojiPress}
                onHandleScrollToSectionFailed={onHandleScrollToSectionFailed}
                onLoadMoreCustomEmojis={onLoadMoreCustomEmojis}
                onMomentumScrollEnd={onMomentumScrollEnd}
                onScroll={onScroll}
                onSetSectionListRef={onSetSectionListRef}
                margin={margin}
            />
        );
    };

    const renderContent = () => {
        const shorten = Device.IS_IPHONE_WITH_INSETS && isLandscape ? 6 : 2;
        return (
            <React.Fragment>
                {renderSearchBar()}
                <View style={styles.container}>
                    {renderListComponent(isAndroid ? 2 : shorten)}
                    {!searchTerm && getSectionIcons()}
                </View>
            </React.Fragment>
        );
    };

    const renderIOSContent = () => {
        let keyboardOffset = Device.IS_IPHONE_WITH_INSETS ? 80 : 60;
        if (isLandscape) {
            keyboardOffset = Device.IS_IPHONE_WITH_INSETS ? 0 : 10;
        }

        return (
            <SafeAreaView
                edges={['left', 'right']}
                style={{flex: 1}}
            >
                <KeyboardAvoidingView
                    behavior='padding'
                    enabled={Boolean(searchTerm)}
                    keyboardVerticalOffset={keyboardOffset}
                    style={styles.flex}
                >
                    {renderContent()}
                </KeyboardAvoidingView>
            </SafeAreaView>
        );
    };

    return isAndroid ? renderContent() : renderIOSContent();
};

const getStyleSheetFromTheme = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        flex: {
            flex: 1,
        },
        container: {
            alignItems: 'center',
            backgroundColor: theme.centerChannelBg,
            flex: 1,
        },
        searchBar: {
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.2),
            paddingVertical: 5,
            ...Platform.select({
                ios: {
                    paddingLeft: 8,
                },
            }),
            height: 50,
        },
        bottomContentWrapper: {
            ...Platform.select({
                android: {
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                },
                ios: {
                    width: '100%',
                    flexDirection: 'row',
                },
            }),
            backgroundColor: theme.centerChannelBg,
            height: 35,
        },
        bottomContent: {
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.1),
            borderTopColor: changeOpacity(theme.centerChannelColor, 0.3),
            borderTopWidth: 1,
            flexDirection: 'row',
            justifyContent: 'space-between',
            width: '100%',
        },
    };
});

export default EmojiPicker;
