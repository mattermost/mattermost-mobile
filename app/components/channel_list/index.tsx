// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useEffect, useState} from 'react';
import Animated, {useAnimatedStyle, useSharedValue, withTiming} from 'react-native-reanimated';

import {TABLET_SIDEBAR_WIDTH, TEAM_SIDEBAR_WIDTH} from '@constants/view';
import {useTheme} from '@context/theme';
import {makeStyleSheetFromTheme} from '@utils/theme';

import Categories from './categories';
import ChannelListHeader from './header';
import LoadChannelsError from './load_channels_error';
import LoadTeamsError from './load_teams_error';
import SearchField from './search';

// import Loading from '@components/loading';

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

}));

type ChannelListProps = {
    currentTeamId?: string;
    iconPad?: boolean;
    isTablet: boolean;
    teamsCount: number;
}

const ChannelList = ({currentTeamId, iconPad, isTablet, teamsCount}: ChannelListProps) => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);
    const tabletWidth = useSharedValue(TABLET_SIDEBAR_WIDTH);
    const tabletStyle = useAnimatedStyle(() => {
        if (!isTablet) {
            return {
                maxWidth: '100%',
            };
        }

        return {maxWidth: withTiming(tabletWidth.value, {duration: 350})};
    }, [isTablet]);

    useEffect(() => {
        if (isTablet) {
            tabletWidth.value = TABLET_SIDEBAR_WIDTH - (teamsCount > 1 ? TEAM_SIDEBAR_WIDTH : 0);
        }
    }, [isTablet, teamsCount]);

    const [showCats, setShowCats] = useState<boolean>(true);
    let content;
    if (!currentTeamId) {
        content = (<LoadTeamsError/>);
    } else if (showCats) {
        content = (
            <>
                <SearchField/>
                <Categories categories={categories}/>
            </>
        );
    } else {
        content = (<LoadChannelsError teamId={currentTeamId}/>);
    }

    return (
        <Animated.View style={[styles.container, tabletStyle]}>
            <ChannelListHeader
                iconPad={iconPad}
                onHeaderPress={() => setShowCats(!showCats)}
            />
            {content}
        </Animated.View>
    );
};

export default ChannelList;
