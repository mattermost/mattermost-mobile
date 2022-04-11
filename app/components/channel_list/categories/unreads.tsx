// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {useIntl} from 'react-intl';
import {FlatList, Text} from 'react-native';

import {changeOpacity, makeStyleSheetFromTheme} from '@app/utils/theme';
import {useTheme} from '@context/theme';
import {typography} from '@utils/typography';

import ChannelListItem from './body/channel';

import type ChannelModel from '@typings/database/models/servers/channel';

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    heading: {
        color: changeOpacity(theme.sidebarText, 0.64),
        ...typography('Heading', 75),
        paddingLeft: 5,
        paddingTop: 10,
    },
}));

const renderItem = ({item}: {item: ChannelModel}) => {
    return (
        <ChannelListItem
            channel={item}
            isActive={true}
            collapsed={false}
        />
    );
};

const UnreadCategories = ({unreadChannels}: {unreadChannels: ChannelModel[]}) => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);
    const intl = useIntl();

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
            />
        </>
    );
};

export default UnreadCategories;
