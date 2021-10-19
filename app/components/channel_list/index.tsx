// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {ScrollView} from 'react-native';

import {useTheme} from '@context/theme';
import {makeStyleSheetFromTheme} from '@utils/theme';

import {COMPASS_ICONS} from '../compass_icon';

import ChannelListItem from './categories/body/channel';
import CategoriesHeader from './categories/header';
import ChannelListHeader from './header';
import Loading from './loading';
import LoadingError from './loading_error';
import SearchField from './search';
import ThreadsButton from './threads';

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {
        flex: 1,
        backgroundColor: theme.sidebarBg,
        paddingHorizontal: 20,
        paddingVertical: 10,
    },
}));

const ChannelList = () => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);

    return (
        <ScrollView style={styles.container} >
            <ChannelListHeader
                heading='Contributors'
                subheading='Community'
            />
            <SearchField/>
            <ThreadsButton/>
            <CategoriesHeader heading='Category Heading'/>
            <ChannelListItem
                name='Just a Channel'
                leftIcon={COMPASS_ICONS.globe}
            />
            <ChannelListItem
                name='And another Channel'
                unreadCount={5}
                leftIcon={COMPASS_ICONS.globe}
            />
            <Loading/>
            <LoadingError/>
        </ScrollView>
    );
};

export default ChannelList;
