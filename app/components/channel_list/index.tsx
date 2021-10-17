// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {ScrollView} from 'react-native';

import {useTheme} from '@context/theme';
import {makeStyleSheetFromTheme} from '@utils/theme';

import ChannelListItemComponent from './categories/body/channel';
import CategoriesHeader from './categories/header';
import ChannelListHeader from './header';
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
            <ChannelListItemComponent name='Just a Channel'/>
            <ChannelListItemComponent name='And another Channel'/>
        </ScrollView>
    );
};

export default ChannelListComponent;
