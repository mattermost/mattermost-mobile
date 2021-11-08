// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useState} from 'react';
import {View} from 'react-native';
import {TouchableOpacity} from 'react-native-gesture-handler';

import TABLET from '@constants/view';
import {useTheme} from '@context/theme';
import {useIsTablet} from '@hooks/device';
import {makeStyleSheetFromTheme} from '@utils/theme';

import Categories from './categories';
import ChannelListHeader from './header';
import LoadingError from './loading_error';
import SearchField from './search';

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
        maxWidth: TABLET.TABLET_SIDEBAR_WIDTH,
    },

}));

type ChannelListProps = {
    iconPad?: boolean;
}

const ChannelList = ({iconPad}: ChannelListProps) => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);

    // @to-do; remove after testing
    const [showCats, setShowCats] = useState<boolean>(true);

    const isTablet = useIsTablet();

    return (
        <View style={[styles.container, isTablet && styles.maxW]}>
            <TouchableOpacity onPress={() => setShowCats(!showCats)}>
                <ChannelListHeader
                    iconPad={iconPad}
                />
            </TouchableOpacity>

            {showCats && (
                <>
                    <SearchField/>
                    <Categories categories={categories}/>
                </>
            )}
            {/* <Loading/> */}
            {!showCats && (<LoadingError/>)}
        </View>
    );
};

export default ChannelList;
