// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useEffect, useMemo, useRef, useState} from 'react';
import {DeviceEventEmitter, useWindowDimensions} from 'react-native';
import Animated, {useAnimatedStyle, useSharedValue, withTiming} from 'react-native-reanimated';
import {SafeAreaView, type Edge} from 'react-native-safe-area-context';

import {handleTeamChange} from '@actions/remote/team';
import AgentsButton from '@agents/components/agents_button';
import DraftsButton from '@components/drafts_buttton';
import Loading from '@components/loading';
import ThreadsButton from '@components/threads_button';
import {Events, Screens} from '@constants';
import {TABLET_SIDEBAR_WIDTH, TEAM_SIDEBAR_WIDTH} from '@constants/view';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import DatabaseManager from '@database/manager';
import {useIsTablet} from '@hooks/device';
import {useTeamsLoading} from '@hooks/teams_loading';
import PlaybooksButton from '@playbooks/components/playbooks_button';
import {getDefaultTeamId} from '@queries/servers/team';
import {logDebug} from '@utils/log';
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
    flex: {
        flex: 1,
    },
}));

type ScreenType = typeof Screens.GLOBAL_DRAFTS | typeof Screens.GLOBAL_THREADS | typeof Screens.CHANNEL | typeof Screens.PARTICIPANT_PLAYBOOKS | typeof Screens.AGENT_CHAT;

type ChannelListProps = {
    hasChannels: boolean;
    iconPad?: boolean;
    isCRTEnabled?: boolean;
    moreThanOneTeam: boolean;
    draftsCount?: number;
    scheduledPostCount?: number;
    scheduledPostHasError?: boolean;
    lastChannelId?: ScreenType;
    scheduledPostsEnabled?: boolean;
    agentsEnabled?: boolean;
    showPlaybooksButton?: boolean;
};

const getTabletWidth = (moreThanOneTeam: boolean) => {
    return TABLET_SIDEBAR_WIDTH - (moreThanOneTeam ? TEAM_SIDEBAR_WIDTH : 0);
};

const edges: Edge[] = ['right'];

const CategoriesList = ({
    hasChannels,
    iconPad,
    isCRTEnabled,
    moreThanOneTeam,
    draftsCount = 0,
    scheduledPostCount = 0,
    scheduledPostHasError = false,
    lastChannelId,
    scheduledPostsEnabled,
    agentsEnabled,
    showPlaybooksButton,
}: ChannelListProps) => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);
    const {width} = useWindowDimensions();
    const isTablet = useIsTablet();
    const serverUrl = useServerUrl();
    const isTeamLoading = useTeamsLoading(serverUrl);
    const tabletWidth = useSharedValue(isTablet ? getTabletWidth(moreThanOneTeam) : 0);
    const [activeScreen, setActiveScreen] = useState<ScreenType>(isTablet && lastChannelId ? lastChannelId : Screens.CHANNEL);

    const healedRef = useRef(false);
    useEffect(() => {
        if (hasChannels) {
            healedRef.current = false; // reset on recovery
            return;
        }
        if (isTeamLoading || healedRef.current) {
            return;
        }
        healedRef.current = true;
        (async () => {
            try {
                const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
                const defaultTeamId = await getDefaultTeamId(database);
                if (defaultTeamId) {
                    logDebug('CategoriesList: self-healing missing currentTeamId', {serverUrl, defaultTeamId});
                    await handleTeamChange(serverUrl, defaultTeamId);
                }
            } catch (e) {
                logDebug('CategoriesList: self-heal failed', e);
                healedRef.current = false; // allow another attempt
            }
        })();
    }, [hasChannels, isTeamLoading, serverUrl]);

    useEffect(() => {
        if (isTablet) {
            tabletWidth.value = getTabletWidth(moreThanOneTeam);
        }

        // tabletWidth is a sharedValue, so it's safe to ignore this warning
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isTablet, moreThanOneTeam]);

    useEffect(() => {
        const listener = DeviceEventEmitter.addListener(Events.ACTIVE_SCREEN, (screen: string) => {
            if (screen === Screens.GLOBAL_DRAFTS || screen === Screens.GLOBAL_THREADS || screen === Screens.PARTICIPANT_PLAYBOOKS || screen === Screens.AGENT_CHAT) {
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
                key='thread_button'
                isOnHome={true}
                shouldHighlightActive={activeScreen === Screens.GLOBAL_THREADS}
            />
        );
    }, [activeScreen, isCRTEnabled]);

    const draftsButtonComponent = useMemo(() => {
        if (draftsCount > 0 || (scheduledPostCount > 0 && scheduledPostsEnabled) || (isTablet && activeScreen === Screens.GLOBAL_DRAFTS)) {
            return (
                <DraftsButton
                    key='draft_button'
                    draftsCount={draftsCount}
                    shouldHighlightActive={activeScreen === Screens.GLOBAL_DRAFTS}
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
                key='agent_button'
                shouldHighlightActive={activeScreen === Screens.AGENT_CHAT}
            />
        );
    }, [agentsEnabled, activeScreen]);

    const playbooksButtonComponent = useMemo(() => {
        if (!showPlaybooksButton) {
            return null;
        }

        const shouldHighlightActive = activeScreen === Screens.PARTICIPANT_PLAYBOOKS && activeScreen === lastChannelId && isTablet;
        return (
            <PlaybooksButton
                key='playbooks_button'
                shouldHighlightActive={shouldHighlightActive}
            />
        );
    }, [activeScreen, isTablet, lastChannelId, showPlaybooksButton]);

    const headerButtons = useMemo(() => [
        threadButtonComponent,
        draftsButtonComponent,
        agentsButtonComponent,
        playbooksButtonComponent,
    ], [agentsButtonComponent, draftsButtonComponent, playbooksButtonComponent, threadButtonComponent]);

    const content = useMemo(() => {
        if (!hasChannels) {
            if (isTeamLoading) {
                return (
                    <Loading
                        containerStyle={styles.flex}
                        themeColor='sidebarText'
                    />
                );
            }
            return (<LoadChannelsError/>);
        }

        return (
            <SafeAreaView
                edges={edges}
                style={styles.flex}
            >
                <SubHeader/>
                <Categories
                    isTablet={isTablet}
                    headerButtons={headerButtons}
                />
            </SafeAreaView>
        );
    }, [hasChannels, headerButtons, isTablet, isTeamLoading, styles.flex]);

    return (
        <Animated.View style={[styles.container, tabletStyle]}>
            <ChannelListHeader iconPad={iconPad}/>
            {content}
        </Animated.View>
    );
};

export default CategoriesList;
