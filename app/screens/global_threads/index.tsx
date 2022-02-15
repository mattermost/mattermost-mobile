// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import React, {useEffect, useMemo, useState} from 'react';
import {SafeAreaView} from 'react-native-safe-area-context';
import {of as of$} from 'rxjs';
import {map, switchMap} from 'rxjs/operators';

import {getThreads} from '@actions/remote/thread';
import ServerVersion from '@components/server_version';
import {Database} from '@constants';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {useAppState} from '@hooks/device';
import {makeStyleSheetFromTheme} from '@utils/theme';

import Header from './header';
import ThreadsList, {Tab} from './threads_list';

import type {WithDatabaseArgs} from '@typings/database/database';
import type SystemModel from '@typings/database/models/servers/system';

const {MM_TABLES, SYSTEM_IDENTIFIERS} = Database;
const {SERVER: {SYSTEM}} = MM_TABLES;

type Props = {
    currentTeamId: string;
};

const getStyleSheet = makeStyleSheetFromTheme(() => ({
    flex: {
        flex: 1,
    },
}));

const GlobalThreads = ({currentTeamId}: Props) => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);
    const appState = useAppState();
    const serverUrl = useServerUrl();

    const [tab, setTab] = useState<Tab>('all');

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [isLoading, setIsLoading] = useState(true);
    useEffect(() => {
        setIsLoading(true);
        getThreads(serverUrl, currentTeamId).finally(() => setIsLoading(false));
    }, [serverUrl]);

    const renderComponent = useMemo(() => {
        return (
            <>
                <Header/>
                <ThreadsList
                    forceQueryAfterAppState={appState}
                    setTab={setTab}
                    isLoading={isLoading}
                    tab={tab}
                    teamId={currentTeamId}
                    testID={'undefined'}
                    theme={theme}
                />
            </>
        );
    }, [tab, theme, appState, currentTeamId]);

    return (
        <SafeAreaView
            style={styles.flex}
            mode='margin'
            edges={['left', 'right']}
        >
            <ServerVersion/>
            {renderComponent}
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
