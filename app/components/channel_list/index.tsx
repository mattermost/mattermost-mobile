// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useEffect} from 'react';
import Animated, {useAnimatedStyle, useSharedValue, withTiming} from 'react-native-reanimated';

import {TABLET_SIDEBAR_WIDTH, TEAM_SIDEBAR_WIDTH} from '@constants/view';
import {useTheme} from '@context/theme';
import {makeStyleSheetFromTheme} from '@utils/theme';

import Categories from './categories';
import ChannelListHeader from './header';
import LoadChannelsError from './load_channels_error';
import LoadTeamsError from './load_teams_error';
import SearchField from './search';
import Threads from './threads';

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {
        flex: 1,
        backgroundColor: theme.sidebarBg,
        paddingLeft: 18,
        paddingRight: 20,
        paddingTop: 10,
    },

}));

type ChannelListProps = {
    channelsCount: number;
    currentTeamId?: string;
    iconPad?: boolean;
    isTablet: boolean;
    teamsCount: number;
}

const ChannelList = ({channelsCount, currentTeamId, iconPad, isTablet, teamsCount}: ChannelListProps) => {
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

    let content;

    if (!currentTeamId) {
        content = (<LoadTeamsError/>);
    } else if (channelsCount < 1) {
        content = (<LoadChannelsError teamId={currentTeamId}/>);
    } else {
        content = (
            <>
                <SearchField/>
                <Threads/>
                <Categories
                    currentTeamId={currentTeamId}
                />
            </>
        );
    }

    return (
        <Animated.View style={[styles.container, tabletStyle]}>
            <ChannelListHeader
                iconPad={iconPad}
            />
            {content}
        </Animated.View>
    );
};

export default ChannelList;
