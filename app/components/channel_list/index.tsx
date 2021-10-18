// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {ScrollView} from 'react-native';

import {useTheme} from '@context/theme';
import {makeStyleSheetFromTheme} from '@utils/theme';

import {COMPASS_ICONS} from '../compass_icon';

import ChannelListItemComponent from './categories/body/channel';
import CategoriesHeader from './categories/header';
import ErrorComponent from './error';
import ChannelListHeader from './header';
import LoadingSpinner from './loading';
import SearchField from './search';
import ThreadsComponent from './threads';

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {
        flex: 1,
        backgroundColor: theme.sidebarBg,
        paddingHorizontal: 20,
        paddingVertical: 10,
    },
}));

const ChannelListComponent = () => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);

    return (
        <ScrollView style={styles.container} >
            <ChannelListHeader
                heading='Contributors'
                subheading='Community'
            />
            <SearchField/>
            <ThreadsComponent/>
            <CategoriesHeader heading='Category Heading'/>
            <ChannelListItemComponent
                name='Just a Channel'
                leftIcon={COMPASS_ICONS.globe}
            />
            <ChannelListItemComponent
                name='And another Channel'
                unreadCount={5}
                leftIcon={COMPASS_ICONS.globe}
            />
            <LoadingSpinner/>
            <ErrorComponent/>
        </ScrollView>
    );
};

export default ChannelListComponent;
