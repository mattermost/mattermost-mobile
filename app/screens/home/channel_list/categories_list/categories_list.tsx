// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useEffect, useMemo, useState} from 'react';
import {DeviceEventEmitter, useWindowDimensions} from 'react-native';
import Animated, {useAnimatedStyle, useSharedValue, withTiming} from 'react-native-reanimated';

import DraftsButton from '@components/drafts_buttton';
import ThreadsButton from '@components/threads_button';
import {Events, Screens} from '@constants';
import {TABLET_SIDEBAR_WIDTH, TEAM_SIDEBAR_WIDTH} from '@constants/view';
import {useTheme} from '@context/theme';
import {useIsTablet} from '@hooks/device';
import PlaybooksButton from '@playbooks/components/playbooks_button';
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
    draftsCount: number;
    scheduledPostCount: number;
    scheduledPostHasError: boolean;
    lastChannelId?: string;
    scheduledPostsEnabled?: boolean;
    playbooksEnabled?: boolean;
};

const getTabletWidth = (moreThanOneTeam: boolean) => {
    return TABLET_SIDEBAR_WIDTH - (moreThanOneTeam ? TEAM_SIDEBAR_WIDTH : 0);
};

type ScreenType = typeof Screens.GLOBAL_DRAFTS | typeof Screens.GLOBAL_THREADS | typeof Screens.CHANNEL;

const CategoriesList = ({
    hasChannels,
    iconPad,
    isCRTEnabled,
    moreThanOneTeam,
    draftsCount,
    scheduledPostCount,
    scheduledPostHasError,
    lastChannelId,
    scheduledPostsEnabled,
    playbooksEnabled,
}: ChannelListProps) => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);
    const {width} = useWindowDimensions();
    const isTablet = useIsTablet();
    const tabletWidth = useSharedValue(isTablet ? getTabletWidth(moreThanOneTeam) : 0);
    const [activeScreen, setActiveScreen] = useState<ScreenType>(isTablet && lastChannelId === Screens.GLOBAL_DRAFTS ? Screens.GLOBAL_DRAFTS : Screens.CHANNEL);

    useEffect(() => {
        if (isTablet) {
            tabletWidth.value = getTabletWidth(moreThanOneTeam);
        }

        // tabletWidth is a sharedValue, so it's safe to ignore this warning
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isTablet, moreThanOneTeam]);

    useEffect(() => {
        const listener = DeviceEventEmitter.addListener(Events.ACTIVE_SCREEN, (screen: string) => {
            if (screen === Screens.GLOBAL_DRAFTS || screen === Screens.GLOBAL_THREADS) {
                setActiveScreen(screen);
            } else {
                setActiveScreen(Screens.CHANNEL);
            }
        });

        return () => {
            listener.remove();
        };
    }, []);

    const tabletStyle = useAnimatedStyle(() => {
        if (!isTablet) {
            return {
                maxWidth: width,
            };
        }

        return {maxWidth: withTiming(tabletWidth.value, {duration: 350})};
    }, [isTablet, width]);

    const threadButtonComponent = useMemo(() => {
        if (!isCRTEnabled) {
            return null;
        }

        return (
            <ThreadsButton
                isOnHome={true}
                shouldHighlightActive={activeScreen === Screens.GLOBAL_THREADS}
            />
        );
    }, [activeScreen, isCRTEnabled]);

    const draftsButtonComponent = useMemo(() => {
        if (draftsCount > 0 || (scheduledPostCount > 0 && scheduledPostsEnabled) || (isTablet && activeScreen === Screens.GLOBAL_DRAFTS)) {
            return (
                <DraftsButton
                    draftsCount={draftsCount}
                    shouldHighlightActive={activeScreen === Screens.GLOBAL_DRAFTS}
                    scheduledPostCount={scheduledPostCount}
                    scheduledPostHasError={scheduledPostHasError}
                />
            );
        }

        return null;
    }, [activeScreen, draftsCount, isTablet, scheduledPostCount, scheduledPostHasError, scheduledPostsEnabled]);

    const playbooksButtonComponent = useMemo(() => {
        if (!playbooksEnabled) {
            return null;
        }

        return (
            <PlaybooksButton/>
        );
    }, [playbooksEnabled]);

    const content = useMemo(() => {
        if (!hasChannels) {
            return (<LoadChannelsError/>);
        }

        return (
            <>
                <SubHeader/>
                {threadButtonComponent}
                {draftsButtonComponent}
                {playbooksButtonComponent}
                <Categories isTablet={isTablet}/>
            </>
        );
    }, [draftsButtonComponent, hasChannels, isTablet, playbooksButtonComponent, threadButtonComponent]);

    return (
        <Animated.View style={[styles.container, tabletStyle]}>
            <ChannelListHeader iconPad={iconPad}/>
            {content}
        </Animated.View>
    );
};

export default CategoriesList;
