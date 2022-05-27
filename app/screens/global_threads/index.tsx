// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useMemo, useState} from 'react';
import {useIntl} from 'react-intl';
import {Keyboard, StyleSheet, View} from 'react-native';
import {Edge, SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';

import NavigationHeader from '@components/navigation_header';
import RoundedHeaderContext from '@components/rounded_header_context';
import {useAppState, useIsTablet} from '@hooks/device';
import {useDefaultHeaderHeight} from '@hooks/header';
import {useTeamSwitch} from '@hooks/team_switch';
import {popTopScreen} from '@screens/navigation';

import ThreadsList from './threads_list';

type Props = {
    componentId?: string;
};

const edges: Edge[] = ['left', 'right'];

const styles = StyleSheet.create({
    flex: {
        flex: 1,
    },
});

const GlobalThreads = ({componentId}: Props) => {
    const appState = useAppState();
    const intl = useIntl();
    const insets = useSafeAreaInsets();
    const switchingTeam = useTeamSwitch();
    const isTablet = useIsTablet();

    const defaultHeight = useDefaultHeaderHeight();

    const [tab, setTab] = useState<GlobalThreadsTab>('all');

    const containerStyle = useMemo(() => {
        const marginTop = defaultHeight + insets.top;
        return {flex: 1, marginTop};
    }, [defaultHeight, insets.top]);

    const contextStyle = useMemo(() => ({
        top: defaultHeight + insets.top,
    }), [defaultHeight, insets.top]);

    const onBackPress = useCallback(() => {
        Keyboard.dismiss();
        popTopScreen(componentId);
    }, [componentId]);

    return (
        <SafeAreaView
            edges={edges}
            mode='margin'
            style={styles.flex}
            testID='global_threads.screen'
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
            />
            <View style={contextStyle}>
                <RoundedHeaderContext/>
            </View>
            {!switchingTeam &&
            <View style={containerStyle}>
                <ThreadsList
                    forceQueryAfterAppState={appState}
                    setTab={setTab}
                    tab={tab}
                    testID={'global_threads.threads_list'}
                />
            </View>
            }
        </SafeAreaView>
    );
};

export default GlobalThreads;
