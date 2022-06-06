// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {useIntl} from 'react-intl';
import {FlatList, Text} from 'react-native';

import ChannelItem from '@components/channel_item';
import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import type ChannelModel from '@typings/database/models/servers/channel';

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
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
    unreadChannels: ChannelModel[];
    onChannelSwitch: (channelId: string) => void;
}

const extractKey = (item: ChannelModel) => item.id;

const UnreadCategories = ({onChannelSwitch, unreadChannels}: UnreadCategoriesProps) => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);
    const intl = useIntl();

    const renderItem = useCallback(({item}: {item: ChannelModel}) => {
        return (
            <ChannelItem
                channel={item}
                onPress={onChannelSwitch}
            />
        );
    }, [onChannelSwitch]);

    if (!unreadChannels.length) {
        return null;
    }
    return (
        <>
            <Text
                style={styles.heading}
            >
                {intl.formatMessage({id: 'mobile.channel_list.unreads', defaultMessage: 'UNREADS'})}
            </Text>
            <FlatList
                data={unreadChannels}
                renderItem={renderItem}
                keyExtractor={extractKey}
                removeClippedSubviews={true}
            />
        </>
    );
};

export default UnreadCategories;
