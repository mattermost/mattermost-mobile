// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import React, {useCallback, useMemo, useState} from 'react';
import {useIntl} from 'react-intl';
import {Keyboard, StyleSheet, View} from 'react-native';
import {Edge, SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';
import {map} from 'rxjs/operators';

import NavigationHeader from '@components/navigation_header';
import {Database} from '@constants';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {useAppState} from '@hooks/device';
import {useDefaultHeaderHeight} from '@hooks/header';
import {popTopScreen} from '@screens/navigation';

import ThreadsList from './threads_list';

import type {Tab} from './threads_list/threads_list';
import type {WithDatabaseArgs} from '@typings/database/database';
import type SystemModel from '@typings/database/models/servers/system';

const {MM_TABLES, SYSTEM_IDENTIFIERS} = Database;
const {SERVER: {SYSTEM}} = MM_TABLES;

type Props = {
    componentId?: string;
    currentTeamId: string;
};

const edges: Edge[] = ['left', 'right'];

const styles = StyleSheet.create({
    flex: {
        flex: 1,
    },
});

const GlobalThreads = ({componentId, currentTeamId}: Props) => {
    const appState = useAppState();
    const intl = useIntl();
    const insets = useSafeAreaInsets();
    const serverUrl = useServerUrl();

    const theme = useTheme();
    const defaultHeight = useDefaultHeaderHeight();

    const [tab, setTab] = useState<Tab>('all');

    const containerStyle = useMemo(() => {
        const marginTop = defaultHeight + insets.top;
        return [styles.flex, {marginTop}];
    }, [defaultHeight, insets.top]);

    const onBackPress = useCallback(() => {
        Keyboard.dismiss();
        popTopScreen(componentId);
    }, [componentId]);

    return (
        <SafeAreaView
            edges={edges}
            mode='margin'
            style={styles.flex}
            testID='global_threads'
        >
            <NavigationHeader
                isLargeTitle={false}
                onBackPress={onBackPress}
                title={
                    intl.formatMessage({
                        id: 'threads',
                        defaultMessage: 'Threads',
                    })
                }
            />
            <View style={containerStyle}>
                <ThreadsList
                    forceQueryAfterAppState={appState}
                    setTab={setTab}
                    serverUrl={serverUrl}
                    tab={tab}
                    teamId={currentTeamId}
                    testID={'global_threads.list'}
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
}));

export default withDatabase(enhanced(GlobalThreads));
