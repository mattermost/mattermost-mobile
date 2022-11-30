// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useMemo} from 'react';
import {View, FlatList} from 'react-native';

import ChannelListRow from '@components/channel_list_row';
import FormattedText from '@components/formatted_text';
import Loading from '@components/loading';
import NoResultsWithTerm from '@components/no_results_with_term';
import {useTheme} from '@context/theme';
import {useKeyboardHeight} from '@hooks/device';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

type Props = {
    onEndReached: () => void;
    loading: boolean;
    channels: Channel[];
    onSelectChannel: (channel: Channel) => void;
    term?: string;
}

const channelKeyExtractor = (channel: Channel) => {
    return channel.id;
};

const getStyleFromTheme = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        loadingContainer: {
            flex: 1,
            justifyContent: 'center' as const,
            alignItems: 'center' as const,
        },
        listContainer: {
            paddingHorizontal: 20,
            flexGrow: 1,
        },
        noResultContainer: {
            flexGrow: 1,
            alignItems: 'center' as const,
            justifyContent: 'center' as const,
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
    term,
    channels,
}: Props) {
    const theme = useTheme();

    const style = getStyleFromTheme(theme);
    const keyboardHeight = useKeyboardHeight();
    const noResutsStyle = useMemo(() => [
        style.noResultContainer,
        {paddingBottom: keyboardHeight},
    ], [style, keyboardHeight]);

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
        if (!loading) {
            return null;
        }

        return (
            <Loading
                color={theme.buttonBg}
                containerStyle={style.loadingContainer}
                size='large'
            />
        );

    //Style is covered by the theme
    }, [loading, theme]);

    const renderNoResults = useCallback(() => {
        if (term) {
            return (
                <View style={noResutsStyle}>
                    <NoResultsWithTerm term={term}/>
                </View>
            );
        }

        return (
            <View style={noResutsStyle}>
                <FormattedText
                    id='browse_channels.noMore'
                    defaultMessage='No more channels to join'
                    style={style.noResultText}
                />
            </View>
        );
    }, [style, term, noResutsStyle]);

    const renderSeparator = useCallback(() => (
        <View
            style={style.separator}
        />
    ), [theme]);

    return (
        <FlatList
            data={channels}
            renderItem={renderItem}
            testID='browse_channels.channel_list.flat_list'
            ListEmptyComponent={renderNoResults}
            ListFooterComponent={renderLoading}
            onEndReached={onEndReached}
            contentContainerStyle={style.listContainer}
            ItemSeparatorComponent={renderSeparator}
            keyExtractor={channelKeyExtractor}
        />
    );
}
