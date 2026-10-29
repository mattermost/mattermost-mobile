// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {DatabaseProvider} from '@nozbe/watermelondb/react';
import {Redirect} from 'expo-router';
import React, {type ComponentType, useEffect, useState} from 'react';
import {ActivityIndicator, StyleSheet, View} from 'react-native';

import DeviceInfoProvider from '@context/device';
import ServerProvider from '@context/server';
import ThemeProvider from '@context/theme';
import UserLocaleProvider from '@context/user_locale';
import DatabaseManager from '@database/manager';
import {subscribeActiveServers} from '@database/subscription/servers';
import {secureGetFromRecord} from '@utils/types';

import type {Database} from '@nozbe/watermelondb';
import type {PersistenceFlag} from '@typings/database/models/app/servers';
import type ServersModel from '@typings/database/models/app/servers';

type State = {
    database: Database;
    serverUrl: string;
    serverDisplayName: string;
    persistenceFlag: PersistenceFlag;
};

type ServerDatabaseOptions = {
    redirectToServerWhenUnavailable?: boolean;
};

const styles = StyleSheet.create({
    loading: {
        alignItems: 'center',
        flex: 1,
        justifyContent: 'center',
    },
});

export function withServerDatabase<T extends React.JSX.IntrinsicAttributes>(Component: ComponentType<T>, options: ServerDatabaseOptions = {}): ComponentType<T> {
    return function ServerDatabaseComponent(props: T) {
        // undefined means the first active-server emission is still pending;
        // null means that there is no usable active server/database pair.
        const [state, setState] = useState<State | null | undefined>(undefined);

        const observer = (servers: ServersModel[]) => {
            const server = servers?.length ? servers.reduce((a, b) =>
                (b.lastActiveAt > a.lastActiveAt ? b : a),
            ) : undefined;

            if (server) {
                const database =
                    secureGetFromRecord(DatabaseManager.serverDatabases, server.url)?.database;

                if (database) {
                    setState({
                        database,
                        serverUrl: server.url,
                        serverDisplayName: server.displayName,
                        persistenceFlag: server.persistenceFlag,
                    });
                    return;
                }
            }

            // Do not keep rendering a previous database or leave a null tree when
            // the active record has no corresponding initialized database.
            setState(null);
        };

        useEffect(() => {
            const subscription = subscribeActiveServers(observer);
            if (!subscription) {
                setState(null);
            }

            return () => {
                subscription?.unsubscribe();
            };
        }, []);

        if (state === undefined) {
            if (options.redirectToServerWhenUnavailable) {
                return (
                    <View
                        style={styles.loading}
                        testID='server_database.loading'
                    >
                        <ActivityIndicator/>
                    </View>
                );
            }
            return null;
        }

        if (state === null) {
            if (options.redirectToServerWhenUnavailable) {
                return <Redirect href='/(unauthenticated)/server'/>;
            }
            return null;
        }

        // Flip the key when the adapter changes (on-disk ↔ in-memory) so React unmounts and
        // remounts the subtree; withObservables uses empty triggerProps and only binds to the
        // database at mount, so without a remount it would stay subscribed to the dropped instance.
        const dbKey = state.persistenceFlag === 'zero-persistence' ? `${state.serverUrl}.mem` : state.serverUrl;

        return (
            <DatabaseProvider
                database={state.database}
                key={dbKey}
            >
                <DeviceInfoProvider>
                    <UserLocaleProvider database={state.database}>
                        <ServerProvider server={{displayName: state.serverDisplayName, url: state.serverUrl}}>
                            <ThemeProvider database={state.database}>
                                <Component {...props}/>
                            </ThemeProvider>
                        </ServerProvider>
                    </UserLocaleProvider>
                </DeviceInfoProvider>
            </DatabaseProvider>
        );
    };
}
