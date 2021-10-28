// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {View} from 'react-native';

import {Device} from '@app/constants';
import {TABLET} from '@app/constants/view';
import {useSplitView} from '@app/hooks/device';
import {useTheme} from '@context/theme';
import {makeStyleSheetFromTheme} from '@utils/theme';

import Categories from './categories';
import ChannelListHeader from './header';
import SearchField from './search';

// import LoadingError from './loading_error';
// import Loading from './loading';

const channels: TempoChannel[] = [
    {id: '1', name: 'Just a channel'},
    {id: '2', name: 'A Highlighted Channel!!!', highlight: true},
    {id: '3', name: 'And a longer channel name.'},
];

const categories: TempoCategory[] = [
    {id: '1', title: 'My first Category', channels},
    {id: '2', title: 'Another Cat', channels},
];

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {
        flex: 1,
        backgroundColor: theme.sidebarBg,
        paddingHorizontal: 20,
        paddingVertical: 10,
    },
    maxW: {
        maxWidth: TABLET.SIDEBAR_WIDTH,
    },

}));

type ChannelListProps = {
    iconPad?: boolean;
}

const ChannelList = ({iconPad}: ChannelListProps) => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);

    const isSplitView = useSplitView();
    const showTabletLayout = Device.IS_TABLET && !isSplitView;

    return (
        <View style={[styles.container, showTabletLayout && styles.maxW]} >
            <ChannelListHeader
                heading='Contributors'
                subheading='Community TEST'
                iconPad={iconPad}
            />
            <SearchField/>
            <Categories categories={categories}/>
            {/* <Loading/> */}
            {/* <LoadingError/> */}
        </View>
    );
};

export default ChannelList;
