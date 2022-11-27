// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useEffect} from 'react';
import Animated, {useAnimatedStyle, useSharedValue, withTiming} from 'react-native-reanimated';

import ThreadsButton from '@components/threads_button';
import {TABLET_SIDEBAR_WIDTH, TEAM_SIDEBAR_WIDTH} from '@constants/view';
import {useTheme} from '@context/theme';
import {makeStyleSheetFromTheme} from '@utils/theme';

import Categories from './categories';
import ChannelListHeader from './header';
import LoadChannelsError from './load_channels_error';
import SubHeader from './subheader';

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
    iconPad?: boolean;
    isCRTEnabled?: boolean;
    isTablet: boolean;
    teamsCount: number;
};

const getTabletWidth = (teamsCount: number) => {
    return TABLET_SIDEBAR_WIDTH - (teamsCount > 1 ? TEAM_SIDEBAR_WIDTH : 0);
};

const CategoriesList = ({channelsCount, iconPad, isCRTEnabled, isTablet, teamsCount}: ChannelListProps) => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);
    const tabletWidth = useSharedValue(isTablet ? getTabletWidth(teamsCount) : 0);

    useEffect(() => {
        if (isTablet) {
            tabletWidth.value = getTabletWidth(teamsCount);
        }
    }, [isTablet && teamsCount]);

    const tabletStyle = useAnimatedStyle(() => {
        if (!isTablet) {
            return {
                maxWidth: '100%',
            };
        }

        return {maxWidth: withTiming(tabletWidth.value, {duration: 350})};
    }, [isTablet]);

    let content;

    if (channelsCount < 1) {
        content = (<LoadChannelsError/>);
    } else {
        content = (
            <>
                <SubHeader/>
                {isCRTEnabled && <ThreadsButton/>}
                <Categories/>
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

export default CategoriesList;
