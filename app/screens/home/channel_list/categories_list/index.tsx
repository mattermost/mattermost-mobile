// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useEffect, useMemo} from 'react';
import {useWindowDimensions} from 'react-native';
import Animated, {useAnimatedStyle, useSharedValue, withTiming} from 'react-native-reanimated';

import ThreadsButton from '@components/threads_button';
import {TABLET_SIDEBAR_WIDTH, TEAM_SIDEBAR_WIDTH} from '@constants/view';
import {useTheme} from '@context/theme';
import {useIsTablet} from '@hooks/device';
import {makeStyleSheetFromTheme} from '@utils/theme';

import Categories from './categories';
import ChannelListHeader from './header';
import LoadChannelsError from './load_channels_error';
import SubHeader from './subheader';

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {
        flex: 1,
        backgroundColor: theme.sidebarBg,
        paddingTop: 10,
    },
}));

type ChannelListProps = {
    hasChannels: boolean;
    iconPad?: boolean;
    isCRTEnabled?: boolean;
    moreThanOneTeam: boolean;
};

const getTabletWidth = (moreThanOneTeam: boolean) => {
    return TABLET_SIDEBAR_WIDTH - (moreThanOneTeam ? TEAM_SIDEBAR_WIDTH : 0);
};

const CategoriesList = ({hasChannels, iconPad, isCRTEnabled, moreThanOneTeam}: ChannelListProps) => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);
    const {width} = useWindowDimensions();
    const isTablet = useIsTablet();
    const tabletWidth = useSharedValue(isTablet ? getTabletWidth(moreThanOneTeam) : 0);

    useEffect(() => {
        if (isTablet) {
            tabletWidth.value = getTabletWidth(moreThanOneTeam);
        }
    }, [isTablet, moreThanOneTeam]);

    const tabletStyle = useAnimatedStyle(() => {
        if (!isTablet) {
            return {
                maxWidth: width,
            };
        }

        return {maxWidth: withTiming(tabletWidth.value, {duration: 350})};
    }, [isTablet, width]);

    const content = useMemo(() => {
        if (!hasChannels) {
            return (<LoadChannelsError/>);
        }

        return (
            <>
                <SubHeader/>
                {isCRTEnabled &&
                    <ThreadsButton
                        isOnHome={true}
                        shouldHighlighActive={true}
                    />
                }
                <Categories/>
            </>
        );
    }, [isCRTEnabled]);

    return (
        <Animated.View style={[styles.container, tabletStyle]}>
            <ChannelListHeader iconPad={iconPad}/>
            {content}
        </Animated.View>
    );
};

export default CategoriesList;
