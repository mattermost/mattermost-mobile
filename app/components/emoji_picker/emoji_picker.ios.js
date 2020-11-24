// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {
    KeyboardAvoidingView,
    View,
} from 'react-native';
import {KeyboardTrackingView} from 'react-native-keyboard-tracking-view';
import {SafeAreaView} from 'react-native-safe-area-context';

import SearchBar from '@components/search_bar';
import {DeviceTypes} from '@constants';
import {changeOpacity, getKeyboardAppearanceFromTheme} from '@utils/theme';

import EmojiPickerBase, {getStyleSheetFromTheme, SCROLLVIEW_NATIVE_ID} from './emoji_picker_base';

export default class EmojiPicker extends EmojiPickerBase {
    render() {
        const {formatMessage} = this.context.intl;
        const {testID, isLandscape, theme} = this.props;
        const {searchTerm} = this.state;
        const searchBarTestID = `${testID}.search_bar`;
        const styles = getStyleSheetFromTheme(theme);

        const shorten = DeviceTypes.IS_IPHONE_WITH_INSETS && isLandscape ? 6 : 2;

        let keyboardOffset = DeviceTypes.IS_IPHONE_WITH_INSETS ? 80 : 60;
        if (isLandscape) {
            keyboardOffset = DeviceTypes.IS_IPHONE_WITH_INSETS ? 0 : 10;
        }

        const searchBarInput = {
            backgroundColor: theme.centerChannelBg,
            color: theme.centerChannelColor,
            fontSize: 13,
        };

        return (
            <SafeAreaView
                style={{flex: 1}}
                edges={['left', 'right']}
            >
                <KeyboardAvoidingView
                    behavior='padding'
                    enabled={Boolean(searchTerm)}
                    keyboardVerticalOffset={keyboardOffset}
                    style={styles.flex}
                >
                    <View
                        testID={testID}
                        style={styles.searchBar}
                    >
                        <SearchBar
                            testID={searchBarTestID}
                            ref={this.setSearchBarRef}
                            placeholder={formatMessage({id: 'search_bar.search', defaultMessage: 'Search'})}
                            cancelTitle={formatMessage({id: 'mobile.post.cancel', defaultMessage: 'Cancel'})}
                            backgroundColor='transparent'
                            inputHeight={33}
                            inputStyle={searchBarInput}
                            placeholderTextColor={changeOpacity(theme.centerChannelColor, 0.5)}
                            tintColorSearch={changeOpacity(theme.centerChannelColor, 0.8)}
                            tintColorDelete={changeOpacity(theme.centerChannelColor, 0.5)}
                            titleCancelColor={theme.centerChannelColor}
                            onChangeText={this.changeSearchTerm}
                            onCancelButtonPress={this.cancelSearch}
                            autoCapitalize='none'
                            value={searchTerm}
                            keyboardAppearance={getKeyboardAppearanceFromTheme(theme)}
                            onAnimationComplete={this.setRebuiltEmojis}
                        />
                    </View>
                    <View style={[styles.container]}>
                        {this.renderListComponent(shorten)}
                        {!searchTerm &&
                        <KeyboardTrackingView
                            scrollViewNativeID={SCROLLVIEW_NATIVE_ID}
                            normalList={true}
                        >
                            <View style={styles.bottomContentWrapper}>
                                <View style={styles.bottomContent}>
                                    {this.renderSectionIcons()}
                                </View>
                            </View>
                        </KeyboardTrackingView>
                        }
                    </View>
                </KeyboardAvoidingView>
            </SafeAreaView>
        );
    }
}
