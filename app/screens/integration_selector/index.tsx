// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import SearchBar from '@components/search';
import { changeOpacity, getKeyboardAppearanceFromTheme, makeStyleSheetFromTheme } from '@utils/theme';
import { useTheme } from '@context/theme';

import CustomList from './custom_list';

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        container: {
            flex: 1,
        },
        searchBar: {
            marginVertical: 5,
            height: 38,
        },
        loadingContainer: {
            alignItems: 'center',
            backgroundColor: theme.centerChannelBg,
            height: 70,
            justifyContent: 'center',
        },
        loadingText: {
            color: changeOpacity(theme.centerChannelColor, 0.6),
        },
        noResultContainer: {
            flexGrow: 1,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
        },
        noResultText: {
            fontSize: 26,
            color: changeOpacity(theme.centerChannelColor, 0.5),
        },
        separator: {
            height: 1,
            flex: 0,
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.1),
        },
    };
});

function IntegrationSelector() {
    const theme = useTheme();
    const style = getStyleSheet(theme);
    const searchBarInput = ""
    const term = ""
    const listType = "FLATLIST"

    return (
        <SafeAreaView testID='integration_selector.screen'>
            <View
                testID='selector.screen'
                style={style.searchBar}
            >
                <SearchBar
                    testID='selector.search_bar'
                    // ref={this.searchBarRef}
                    // placeholder={formatMessage({ id: 'search_bar.search', defaultMessage: 'Search' })}
                    placeholder="Search"
                    // cancelTitle={formatMessage({ id: 'mobile.post.cancel', defaultMessage: 'Cancel' })}
                    // backgroundColor='transparent'
                    // inputHeight={33}
                    // inputStyle={searchBarInput}
                    placeholderTextColor={changeOpacity(theme.centerChannelColor, 0.5)}
                    // tintColorSearch={changeOpacity(theme.centerChannelColor, 0.5)}
                    // tintColorDelete={changeOpacity(theme.centerChannelColor, 0.5)}
                    // titleCancelColor={theme.centerChannelColor}
                    // onChangeText={this.onSearch}
                    // onSearchButtonPress={this.onSearch}
                    // onCancelButtonPress={this.clearSearch}
                    autoCapitalize='none'
                    keyboardAppearance={getKeyboardAppearanceFromTheme(theme)}
                    value={term}
                />
            </View>

            {/* {selectedOptionsComponent} */}

            <CustomList
            // data={data}
            // key='custom_list'
            // listType={listType}
            // loading={loading}
            // loadingComponent={this.renderLoading()}
            // noResults={this.renderNoResults()}
            // onLoadMore={this.loadMore}
            // onRowPress={this.handleSelectItem}
            // renderItem={rowComponent}
            // theme={theme}
            />
        </SafeAreaView>
    );
}

export default IntegrationSelector;
