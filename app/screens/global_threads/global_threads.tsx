// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useMemo, useRef} from 'react';
import {defineMessage, useIntl} from 'react-intl';
import {FlatList, Keyboard, StyleSheet, View} from 'react-native';
import {type Edge, SafeAreaView} from 'react-native-safe-area-context';

import {setGlobalThreadsTab} from '@actions/local/systems';
import NavigationHeader from '@components/navigation_header';
import OtherMentionsBadge from '@components/other_mentions_badge';
import RoundedHeaderContext from '@components/rounded_header_context';
import {Screens} from '@constants';
import {useServerUrl} from '@context/server';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import {useIsTablet} from '@hooks/device';
import {useDefaultHeaderHeight} from '@hooks/header';
import {useTeamSwitch} from '@hooks/team_switch';
import useTabs, {type TabDefinition} from '@hooks/use_tabs';
import SecurityManager from '@managers/security_manager';
import {popTopScreen} from '@screens/navigation';

import ThreadsList from './threads_list';
import Header from './threads_list/header';

import type ThreadModel from '@typings/database/models/servers/thread';
import type {AvailableScreens} from '@typings/screens/navigation';

type Props = {
    componentId?: AvailableScreens;
    globalThreadsTab: GlobalThreadsTab;
    hasUnreads: boolean;
    teamId: string;
};

const edges: Edge[] = ['left', 'right'];

const styles = StyleSheet.create({
    flex: {
        flex: 1,
    },
});

const testID = 'global_threads.threads_list';

const GlobalThreads = ({componentId, globalThreadsTab, hasUnreads, teamId}: Props) => {
    const serverUrl = useServerUrl();
    const intl = useIntl();
    const switchingTeam = useTeamSwitch();
    const isTablet = useIsTablet();

    const flatListRef = useRef<FlatList<ThreadModel>>(null);

    const defaultHeight = useDefaultHeaderHeight();

    const tabs = useMemo<Array<TabDefinition<GlobalThreadsTab>>>(() => [
        {
            name: defineMessage({
                id: 'global_threads.allThreads',
                defaultMessage: 'All your threads',
            }),
            id: 'all',
            requiresUserAttention: false,
        },
        {
            name: defineMessage({
                id: 'global_threads.unreads',
                defaultMessage: 'Unreads',
            }),
            id: 'unreads',
            requiresUserAttention: hasUnreads,
        },
    ], [hasUnreads]);
    const tabOnChange = useCallback(() => {
        flatListRef.current?.scrollToOffset({offset: 0});
    }, []);

    const [tab, tabsProps] = useTabs<GlobalThreadsTab>(globalThreadsTab, tabs, tabOnChange, 'global_threads.threads_list.header');
    const mounted = useRef(false);

    const containerStyle = useMemo(() => {
        const marginTop = defaultHeight;
        return {flex: 1, marginTop};
    }, [defaultHeight]);

    const headerLeftComponent = useMemo(() => {
        if (isTablet) {
            return undefined;
        }

        return (<OtherMentionsBadge channelId={Screens.GLOBAL_THREADS}/>);
    }, [isTablet]);

    useEffect(() => {
        mounted.current = true;
        return () => {
            setGlobalThreadsTab(serverUrl, tab);
            mounted.current = false;
        };
    }, [serverUrl, tab]);

    const contextStyle = useMemo(() => ({
        top: defaultHeight,
    }), [defaultHeight]);

    const onBackPress = useCallback(() => {
        Keyboard.dismiss();
        popTopScreen(componentId);
    }, [componentId]);

    useAndroidHardwareBackHandler(componentId, onBackPress);

    return (
        <SafeAreaView
            edges={edges}
            mode='margin'
            style={styles.flex}
            testID='global_threads.screen'
            nativeID={SecurityManager.getShieldScreenId(componentId || Screens.GLOBAL_THREADS)}
        >
            <NavigationHeader
                showBackButton={!isTablet}
                isLargeTitle={false}
                onBackPress={onBackPress}
                title={
                    intl.formatMessage({
                        id: 'threads',
                        defaultMessage: 'Threads',
                    })
                }
                leftComponent={headerLeftComponent}
            />
            <View style={contextStyle}>
                <RoundedHeaderContext/>
            </View>
            {!switchingTeam &&
            <View style={containerStyle}>
                <Header
                    teamId={teamId}
                    testID={`${testID}.header`}
                    hasUnreads={hasUnreads}
                    tabsProps={tabsProps}
                />
                <ThreadsList
                    tab={tab}
                    testID={testID}
                    flatListRef={flatListRef}
                />
            </View>
            }
        </SafeAreaView>
    );
};

export default GlobalThreads;
