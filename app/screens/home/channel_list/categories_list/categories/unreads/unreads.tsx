// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {useIntl} from 'react-intl';
import {FlatList, Text} from 'react-native';

import ChannelItem from '@components/channel_item';
import {useTheme} from '@context/theme';
import {useIsTablet} from '@hooks/device';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import Empty from './empty_state';

import type ChannelModel from '@typings/database/models/servers/channel';

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    empty: {
        alignItems: 'center',
        flexGrow: 1,
        justifyContent: 'center',
    },
    heading: {
        color: changeOpacity(theme.sidebarText, 0.64),
        ...typography('Heading', 75),
        textTransform: 'uppercase',
        paddingLeft: 18,
        paddingVertical: 8,
        marginTop: 12,
    },
}));

type UnreadCategoriesProps = {
    onChannelSwitch: (channelId: string) => void;
    onlyUnreads: boolean;
    unreadChannels: ChannelModel[];
    unreadThreads: {unreads: boolean; mentions: number};
}

const extractKey = (item: ChannelModel) => item.id;

const UnreadCategories = ({onChannelSwitch, onlyUnreads, unreadChannels, unreadThreads}: UnreadCategoriesProps) => {
    const intl = useIntl();
    const theme = useTheme();
    const isTablet = useIsTablet();
    const styles = getStyleSheet(theme);

    const renderItem = useCallback(({item}: {item: ChannelModel}) => {
        return (
            <ChannelItem
                channel={item}
                onPress={onChannelSwitch}
                testID='channel_list.category.unreads.channel_item'
            />
        );
    }, [onChannelSwitch]);

    const showEmptyState = onlyUnreads && !unreadChannels.length;
    const showTitle = !onlyUnreads || (onlyUnreads && !showEmptyState);
    const EmptyState = showEmptyState && !isTablet ? (
        <Empty onlyUnreads={onlyUnreads}/>
    ) : undefined;

    if (!unreadChannels.length && !unreadThreads.mentions && !unreadThreads.unreads && !onlyUnreads) {
        return null;
    }

    return (
        <>
            {showTitle &&
            <Text
                style={styles.heading}
            >
                {intl.formatMessage({id: 'mobile.channel_list.unreads', defaultMessage: 'UNREADS'})}
            </Text>
            }
            <FlatList
                contentContainerStyle={showEmptyState && !isTablet && styles.empty}
                data={unreadChannels}
                renderItem={renderItem}
                keyExtractor={extractKey}
                ListEmptyComponent={EmptyState}
                removeClippedSubviews={true}
            />
        </>
    );
};

export default UnreadCategories;
