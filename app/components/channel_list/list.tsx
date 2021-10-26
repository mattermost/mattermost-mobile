// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {View} from 'react-native';

import {useTheme} from '@context/theme';
import {makeStyleSheetFromTheme} from '@utils/theme';

import Categories from './categories';
import ChannelListHeader from './header';
import SearchField from './search';

// import Loading from './loading';
// import LoadingError from './loading_error';

const channels: TempoChannel[] = [
    {id: '1', name: 'Just a channel'},
    {id: '2', name: 'Highlighted!!!', highlight: true},
];

const categories: TempoCategory[] = [
    {id: '1', title: 'My first Category', channels},
    {id: '2', title: 'Another cat', channels},
];

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {
        flex: 1,
        backgroundColor: theme.sidebarBg,
        paddingHorizontal: 20,
        paddingVertical: 10,
    },
}));

type ChannelListProps = {
    currentTeamId: string;
}

const ChannelList = (props: ChannelListProps) => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);

    return (
        <View style={styles.container} >
            <ChannelListHeader teamId={props.currentTeamId}/>
            <SearchField/>
            <Categories categories={categories}/>
            {/* <Loading/> */}
            {/* <LoadingError/> */}
        </View>
    );
};

export default ChannelList;
