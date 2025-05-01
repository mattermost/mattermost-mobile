// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useNavigation} from '@react-navigation/native';
import React, {useCallback, useMemo} from 'react';
import {useIntl} from 'react-intl';
import {FlatList, type ListRenderItemInfo, Platform, StyleSheet, View} from 'react-native';
import Animated, {FadeInDown, FadeOutUp} from 'react-native-reanimated';

import NoResultsWithTerm from '@components/no_results_with_term';
import ChannelItem from '@share/components/channel_item';
import {setShareExtensionChannelId} from '@share/state';
import {sortChannelsByDisplayName} from '@utils/channel';

import type ChannelModel from '@typings/database/models/servers/channel';
import type UserModel from '@typings/database/models/servers/user';

type Props = {
    archivedChannels: ChannelModel[];
    channelsMatch: ChannelModel[];
    channelsMatchStart: ChannelModel[];
    showTeamName: boolean;
    term: string;
    theme: Theme;
}

const style = StyleSheet.create({
    flex: {flex: 1},
    noResultContainer: {
        flexGrow: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    list: {
        flexGrow: 1,
    },
});

export const MAX_RESULTS = 20;

const SearchChannels = ({
    archivedChannels, channelsMatch, channelsMatchStart,
    showTeamName, term, theme,
}: Props) => {
    const navigation = useNavigation();
    const {locale} = useIntl();

    const onPress = useCallback((channelId: string) => {
        setShareExtensionChannelId(channelId);
        navigation.goBack();
    }, []);

    const renderEmpty = useCallback(() => {
        if (term) {
            return (
                <View style={style.noResultContainer}>
                    <NoResultsWithTerm term={term}/>
                </View>
            );
        }

        return null;
    }, [term, theme]);

    const renderItem = useCallback(({item}: ListRenderItemInfo<ChannelModel>) => {
        return (
            <ChannelItem
                channel={item}
                onPress={onPress}
                showTeamName={showTeamName}
                theme={theme}
            />
        );
    }, [showTeamName]);

    const data = useMemo(() => {
        const items: Array<ChannelModel|Channel|UserModel> = [...channelsMatchStart];

        // Channels that matches
        if (items.length < MAX_RESULTS) {
            items.push(...channelsMatch);
        }

        // Archived channels local
        if (items.length < MAX_RESULTS) {
            const archivedAlpha = archivedChannels.
                sort(sortChannelsByDisplayName.bind(null, locale));
            items.push(...archivedAlpha.slice(0, MAX_RESULTS + 1));
        }

        return [...new Set(items)].slice(0, MAX_RESULTS + 1);
    }, [archivedChannels, channelsMatchStart, channelsMatch, locale]);

    return (
        <Animated.View
            entering={FadeInDown.duration(100)}
            exiting={Platform.select({ios: FadeOutUp.duration(100)}) /* https://mattermost.atlassian.net/browse/MM-63814?focusedCommentId=178584 */}
            style={style.flex}
        >
            <FlatList
                contentContainerStyle={style.list}
                keyboardDismissMode='interactive'
                keyboardShouldPersistTaps='handled'
                ListEmptyComponent={renderEmpty}
                renderItem={renderItem}
                data={data}
                showsVerticalScrollIndicator={false}
            />
        </Animated.View>
    );
};

export default SearchChannels;
