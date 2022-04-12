// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useState} from 'react';
import {View, FlatList, Keyboard} from 'react-native';

import FormattedText from '@components/formatted_text';
import Loading from '@components/loading';
import NoResultsWithTerm from '@components/no_results_with_term';
import {useTheme} from '@context/theme';
import {
    changeOpacity,
    makeStyleSheetFromTheme,
} from '@utils/theme';

import ChannelListRow from './channel_list_row';

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
        loading: {
            height: 32,
            width: 32,
            justifyContent: 'center' as const,
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
    const [keyboardHeight, setKeyboardHeight] = useState(0);

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
            <View style={[style.noResultContainer, {paddingBottom: keyboardHeight}]}>
                <Loading
                    containerStyle={style.loadingContainer}
                    style={style.loading}
                    color={theme.buttonBg}
                />
            </View>
        );

    //Style is covered by the theme
    }, [theme, keyboardHeight]);

    const renderNoResults = useCallback(() => {
        if (term) {
            return (
                <View style={[style.noResultContainer, {paddingBottom: keyboardHeight}]}>
                    <NoResultsWithTerm term={term}/>
                </View>
            );
        }

        return (
            <View style={[style.noResultContainer, {paddingBottom: keyboardHeight}]}>
                <FormattedText
                    id='browse_channels.noMore'
                    defaultMessage='No more channels to join'
                    style={style.noResultText}
                />
            </View>
        );
    }, [style, term, keyboardHeight]);

    const renderSeparator = useCallback(() => (
        <View
            style={style.separator}
        />
    ), [theme]);

    useEffect(() => {
        const show = Keyboard.addListener('keyboardWillShow', (event) => {
            setKeyboardHeight(event.endCoordinates.height);
        });

        const hide = Keyboard.addListener('keyboardWillHide', () => {
            setKeyboardHeight(0);
        });

        return () => {
            show.remove();
            hide.remove();
        };
    }, []);

    return (
        <FlatList
            data={channels}
            renderItem={renderItem}
            testID='browse_channels.channel_list.flat_list'
            ListEmptyComponent={loading ? renderLoading : renderNoResults}
            onEndReached={onEndReached}
            contentContainerStyle={style.listContainer}
            ItemSeparatorComponent={renderSeparator}
            keyExtractor={channelKeyExtractor}
        />
    );
}
