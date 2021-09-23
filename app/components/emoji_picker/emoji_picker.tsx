// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {useIntl} from 'react-intl';
import {
    KeyboardAvoidingView,
    Platform,
    useWindowDimensions,
    View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {KeyboardTrackingView} from 'react-native-ui-lib/keyboard';

import SearchBar from '@components/search_bar';
import {Device} from '@constants';
import {changeOpacity, getKeyboardAppearanceFromTheme} from '@utils/theme';

import {
    getStyleSheetFromTheme,
    SCROLLVIEW_NATIVE_ID,
} from './emoji_picker_base';

// extends EmojiPickerBase
type Props = {
    searchTerm: string;
    theme: Theme;
    testID: string;
    onChangeSearchTerm: (term: string) => void;
    onCancelSearch: (term: string) => void;
    onAnimationComplete: (searchBarAnimationComplete: boolean) => void;
    renderSectionIcons: () => void;
    renderListComponent: (margin: number) => JSX.Element;
    onSetSearchBarRef: (ref: any) => void;
};

const EmojiPicker = ({
    onAnimationComplete,
    onCancelSearch,
    onChangeSearchTerm,
    onSetSearchBarRef,
    renderListComponent,
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

    const renderSearchBar = useCallback(() => {
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
    }, []);

    const getSectionIcons = useCallback(() => {
        if (searchTerm) {
            return null;
        }

        const getSections = () => {
            return (
                <View style={styles.bottomContentWrapper}>
                    <View style={styles.bottomContent}>
                        {getSectionIcons()}
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
                scrollViewNativeID={SCROLLVIEW_NATIVE_ID}
            >
                {getSections()}
            </KeyboardTrackingView>
        );
    }, []);

    const shorten = Device.IS_IPHONE_WITH_INSETS && isLandscape ? 6 : 2;
    const marginCoeff = isAndroid ? 2 : shorten;

    const renderContent = useCallback(() => {
        return (
            <React.Fragment>
                {renderSearchBar()}
                <View style={styles.container}>
                    {renderListComponent(marginCoeff)}
                    {getSectionIcons()}
                </View>
            </React.Fragment>
        );
    }, []);

    const renderIOSContent = useCallback(() => {
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
    }, []);

    return isAndroid ? renderContent() : renderIOSContent();
};

export default EmojiPicker;
