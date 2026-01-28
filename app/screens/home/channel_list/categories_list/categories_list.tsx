// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import AgentsButton from '@agents/components/agents_button';
import React, {useEffect, useMemo, useState} from 'react';
import {DeviceEventEmitter, useWindowDimensions} from 'react-native';
import Animated, {useAnimatedStyle, useSharedValue, withTiming} from 'react-native-reanimated';

import DraftsButton from '@components/drafts_buttton';
import ThreadsButton from '@components/threads_button';
import {Events, Screens} from '@constants';
import {AGENTS, CHANNEL, DRAFT, THREAD} from '@constants/screens';
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
    agentsEnabled?: boolean;
    playbooksEnabled?: boolean;
};

const getTabletWidth = (moreThanOneTeam: boolean) => {
    return TABLET_SIDEBAR_WIDTH - (moreThanOneTeam ? TEAM_SIDEBAR_WIDTH : 0);
};

type ScreenType = typeof AGENTS | typeof DRAFT | typeof THREAD | typeof CHANNEL;

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
    agentsEnabled,
    playbooksEnabled,
}: ChannelListProps) => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);
    const {width} = useWindowDimensions();
    const isTablet = useIsTablet();
    const tabletWidth = useSharedValue(isTablet ? getTabletWidth(moreThanOneTeam) : 0);
    const [activeScreen, setActiveScreen] = useState<ScreenType>(isTablet && lastChannelId === Screens.GLOBAL_DRAFTS ? DRAFT : CHANNEL);

    useEffect(() => {
        if (isTablet) {
            tabletWidth.value = getTabletWidth(moreThanOneTeam);
        }

        // tabletWidth is a sharedValue, so it's safe to ignore this warning
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isTablet, moreThanOneTeam]);

    useEffect(() => {
        const listener = DeviceEventEmitter.addListener(Events.ACTIVE_SCREEN, (screen: string) => {
            if (screen === AGENTS || screen === DRAFT || screen === THREAD) {
                setActiveScreen(screen);
            } else {
                setActiveScreen(CHANNEL);
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
                shouldHighlightActive={activeScreen === THREAD}
            />
        );
    }, [activeScreen, isCRTEnabled]);

    const draftsButtonComponent = useMemo(() => {
        if (draftsCount > 0 || (scheduledPostCount > 0 && scheduledPostsEnabled) || (isTablet && activeScreen === DRAFT)) {
            return (
                <DraftsButton
                    draftsCount={draftsCount}
                    shouldHighlightActive={activeScreen === DRAFT}
                    scheduledPostCount={scheduledPostCount}
                    scheduledPostHasError={scheduledPostHasError}
                />
            );
        }

        return null;
    }, [activeScreen, draftsCount, isTablet, scheduledPostCount, scheduledPostHasError, scheduledPostsEnabled]);

    const agentsButtonComponent = useMemo(() => {
        if (!agentsEnabled) {
            return null;
        }

        return (
            <AgentsButton
                shouldHighlightActive={activeScreen === AGENTS}
            />
        );
    }, [agentsEnabled, activeScreen]);

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
                {agentsButtonComponent}
                {playbooksButtonComponent}
                <Categories isTablet={isTablet}/>
            </>
        );
    }, [agentsButtonComponent, draftsButtonComponent, hasChannels, isTablet, playbooksButtonComponent, threadButtonComponent]);

    return (
        <Animated.View style={[styles.container, tabletStyle]}>
            <ChannelListHeader iconPad={iconPad}/>
            {content}
        </Animated.View>
    );
};

export default CategoriesList;
