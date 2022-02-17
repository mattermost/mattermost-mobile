// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {View, FlatList} from 'react-native';

import FormattedText from '@components/formatted_text';
import Loading from '@components/loading';
import {useTheme} from '@context/theme';
import {
    changeOpacity,
    makeStyleSheetFromTheme,
} from '@utils/theme';

import ChannelListRow from './channel_list_row';

type Props = {
    onEndReached: () => void;
    loading: boolean;
    isSearch: boolean;
    channels: Channel[];
    onSelectChannel: (channel: Channel) => void;
}

const channelKeyExtractor = (channel: Channel) => {
    return channel.id;
};

const getStyleFromTheme = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        noResultContainer: {
            flexGrow: 1,
            alignItems: 'center' as const,
            justifyContent: 'center' as const,
        },
        noResultText: {
            fontSize: 26,
            color: changeOpacity(theme.centerChannelColor, 0.5),
        },
        loadingContainer: {
            flex: 1,
            justifyContent: 'center' as const,
            alignItems: 'center' as const,
        },
        loading: {
            height: 32,
            width: 32,
            justifyContent: 'center' as const,
        },
        listContainer: {
            paddingHorizontal: 20,
            flexGrow: 1,
        },
        separator: {
            height: 1,
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.08),
            width: '100%',
        },
    };
});

export default function ChannelList({
    onEndReached,
    onSelectChannel,
    loading,
    isSearch,
    channels,
}: Props) {
    const theme = useTheme();
    const style = getStyleFromTheme(theme);

    const renderItem = useCallback(({item}: {item: Channel}) => {
        return (
            <ChannelListRow
                channel={item}
                testID='browse_channels.custom_list.channel_item'
                onPress={onSelectChannel}
            />
        );
    }, [onSelectChannel]);

    const renderLoading = useCallback(() => {
        return (
            <Loading
                containerStyle={style.loadingContainer}
                style={style.loading}
                color={theme.buttonBg}
            />
        );

    //Style is covered by the theme
    }, [theme]);

    const renderNoResults = useCallback(() => {
        if (isSearch) {
            return (
                <View style={style.noResultContainer}>
                    <FormattedText
                        id='mobile.custom_list.no_results'
                        defaultMessage='No Results'
                        style={style.noResultText}
                    />
                </View>
            );
        }

        return (
            <View style={style.noResultContainer}>
                <FormattedText
                    id='browse_channels.noMore'
                    defaultMessage='No more channels to join'
                    style={style.noResultText}
                />
            </View>
        );
    }, [style, isSearch]);

    const renderSeparator = useCallback(() => (
        <View
            style={style.separator}
        />
    ), [theme]);

    return (
        <FlatList
            data={channels}
            renderItem={renderItem}
            testID='browse_channels.flat_list'
            ListEmptyComponent={loading ? renderLoading : renderNoResults}
            onEndReached={onEndReached}
            ListFooterComponent={loading && channels.length ? renderLoading : null}
            contentContainerStyle={style.listContainer}
            ItemSeparatorComponent={renderSeparator}
            keyExtractor={channelKeyExtractor}
        />
    );
}
