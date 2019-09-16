// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {
    FlatList,
    SectionList,
    View,
} from 'react-native';

import SearchBar from 'app/components/search_bar';
import {changeOpacity, getKeyboardAppearanceFromTheme} from 'app/utils/theme';

import EmojiPickerBase, {getStyleSheetFromTheme, SECTION_MARGIN} from './emoji_picker_base';

export default class EmojiPicker extends EmojiPickerBase {
    render() {
        const {formatMessage} = this.context.intl;
        const {deviceWidth, theme} = this.props;
        const {emojis, filteredEmojis, searchTerm} = this.state;
        const styles = getStyleSheetFromTheme(theme);

        let listComponent;
        if (searchTerm) {
            listComponent = (
                <FlatList
                    keyboardShouldPersistTaps='always'
                    style={styles.flatList}
                    data={filteredEmojis}
                    keyExtractor={this.flatListKeyExtractor}
                    renderItem={this.flatListRenderItem}
                    pageSize={10}
                    initialListSize={10}
                    removeClippedSubviews={true}
                />
            );
        } else {
            listComponent = (
                <SectionList
                    ref={this.attachSectionList}
                    showsVerticalScrollIndicator={false}
                    style={[styles.sectionList, {width: deviceWidth - (SECTION_MARGIN * 2)}]}
                    sections={emojis}
                    renderSectionHeader={this.renderSectionHeader}
                    renderItem={this.renderItem}
                    keyboardShouldPersistTaps='always'
                    getItemLayout={this.sectionListGetItemLayout}
                    removeClippedSubviews={true}
                    onScroll={this.onScroll}
                    onScrollToIndexFailed={this.handleScrollToSectionFailed}
                    onMomentumScrollEnd={this.onMomentumScrollEnd}
                    pageSize={30}
                    ListFooterComponent={this.renderFooter}
                    onEndReached={this.loadMoreCustomEmojis}
                    onEndReachedThreshold={1}
                />
            );
        }

        const searchBarInput = {
            backgroundColor: theme.centerChannelBg,
            color: theme.centerChannelColor,
            fontSize: 13,
            marginBottom: -3,
        };

        return (
            <React.Fragment>
                <View style={styles.searchBar}>
                    <SearchBar
                        ref={this.searchBarRef}
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
                <View style={styles.container}>
                    {listComponent}
                    {!searchTerm &&
                    <View style={styles.bottomContentWrapper}>
                        <View style={styles.bottomContent}>
                            {this.renderSectionIcons()}
                        </View>
                    </View>
                    }
                </View>
            </React.Fragment>
        );
    }
}
