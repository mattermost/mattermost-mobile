// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import React, {useEffect, useMemo, useState} from 'react';
import {StyleSheet, View} from 'react-native';
import {Edge, SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';
import {of as of$} from 'rxjs';
import {map, switchMap} from 'rxjs/operators';

import {getThreads} from '@actions/remote/thread';
import NavigationHeader from '@components/navigation_header';
import {Database} from '@constants';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {useAppState, useIsTablet} from '@hooks/device';
import {useDefaultHeaderHeight} from '@hooks/header';

// import Header from './header';
import ThreadsList, {Tab} from './threads_list';

import type {WithDatabaseArgs} from '@typings/database/database';
import type SystemModel from '@typings/database/models/servers/system';

const {MM_TABLES, SYSTEM_IDENTIFIERS} = Database;
const {SERVER: {SYSTEM}} = MM_TABLES;

type Props = {
    currentTeamId: string;
};

const edges: Edge[] = ['left', 'right'];

const styles = StyleSheet.create({
    flex: {
        flex: 1,
    },
});

const GlobalThreads = ({currentTeamId}: Props) => {
    const appState = useAppState();
    const insets = useSafeAreaInsets();
    const isTablet = useIsTablet();
    const serverUrl = useServerUrl();

    const theme = useTheme();
    const defaultHeight = useDefaultHeaderHeight();

    const [tab, setTab] = useState<Tab>('all');

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [isLoading, setIsLoading] = useState(true);
    useEffect(() => {
        setIsLoading(true);
        getThreads(serverUrl, currentTeamId).finally(() => setIsLoading(false));
    }, [serverUrl]);

    const containerStyle = useMemo(() => {
        const marginTop = defaultHeight + insets.top;
        return [styles.flex, {marginTop}];
    }, [defaultHeight, insets.top]);

    return (
        <SafeAreaView
            style={styles.flex}
            mode='margin'
            edges={edges}
        >
            <NavigationHeader
                isLargeTitle={false}
                showBackButton={!isTablet}
                title={'Threads'}
            />
            <View style={containerStyle}>
                <ThreadsList
                    forceQueryAfterAppState={appState}
                    setTab={setTab}
                    isLoading={isLoading}
                    tab={tab}
                    teamId={currentTeamId}
                    testID={'undefined'}
                    theme={theme}
                />
            </View>
        </SafeAreaView>
    );
};

const enhanced = withObservables([], ({database}: WithDatabaseArgs) => ({
    currentTeamId: database.collections.get<SystemModel>(SYSTEM).findAndObserve(SYSTEM_IDENTIFIERS.CURRENT_TEAM_ID).pipe(
        map(({value}: {value: string}) => value),
    ),
    currentUserId: database.get<SystemModel>(SYSTEM).findAndObserve(SYSTEM_IDENTIFIERS.CURRENT_USER_ID).pipe(
        switchMap((currentUserId) => of$(currentUserId.value))),
}));

export default withDatabase(enhanced(GlobalThreads));
