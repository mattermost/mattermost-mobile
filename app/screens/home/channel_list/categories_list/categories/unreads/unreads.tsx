// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {useIntl} from 'react-intl';
import {FlatList, Text} from 'react-native';

import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import ChannelItem from '../body/channel_item';

import type ChannelModel from '@typings/database/models/servers/channel';

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    heading: {
        color: changeOpacity(theme.sidebarText, 0.64),
        ...typography('Heading', 75),
        paddingLeft: 18,
        paddingVertical: 8,
        marginTop: 12,
    },
}));

const renderItem = ({item}: {item: ChannelModel}) => {
    return (
        <ChannelItem
            channel={item}
            collapsed={false}
            isUnreads={true}
        />
    );
};
type UnreadCategoriesProps = {
    unreadChannels: ChannelModel[];
}

const UnreadCategories = ({unreadChannels}: UnreadCategoriesProps) => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);
    const intl = useIntl();

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
            />
        </>
    );
};

export default UnreadCategories;
