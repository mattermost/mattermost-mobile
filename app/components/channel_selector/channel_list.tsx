// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useMemo} from 'react';
import {useIntl} from 'react-intl';
import {View, FlatList, Text} from 'react-native';

import ChannelListRow from '@components/channel_list_row';
import Loading from '@components/loading';
import NoResultsWithTerm from '@components/no_results_with_term';
import {useTheme} from '@context/theme';
import {useKeyboardHeight} from '@hooks/device';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

type Props = {
    onEndReached: () => void;
    loading: boolean;
    channels: Channel[];
    selectedChannels?: Channel[];
    onSelectChannel: (channel: Channel) => void;
    term?: string;
    itemSeparator?: boolean;
    itemSelectable?: boolean;
    noResultsWithoutTerm?: string;
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
        noResultText: {
            color: changeOpacity(theme.centerChannelColor, 0.5),
            ...typography('Body', 600, 'Regular'),
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
    selectedChannels = [],
    itemSeparator = true,
    itemSelectable,
    noResultsWithoutTerm,
}: Props) {
    const {formatMessage} = useIntl();
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
                selectable={itemSelectable}
                selected={selectedChannels.findIndex(({id}) => id === item.id) !== -1}
                testID='browse_channels.custom_list.channel_item'
                onPress={onSelectChannel}
            />
        );
    }, [onSelectChannel, itemSelectable, selectedChannels]);

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
                <Text style={style.noResultText}>
                    {noResultsWithoutTerm || formatMessage({id: 'channel_selector.noMore', defaultMessage: 'No channels available'})}
                </Text>
            </View>
        );
    }, [style, term, noResutsStyle, noResultsWithoutTerm]);

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
            ItemSeparatorComponent={itemSeparator ? renderSeparator : undefined}
            keyExtractor={channelKeyExtractor}
        />
    );
}
