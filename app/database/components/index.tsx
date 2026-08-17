// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {DatabaseProvider} from '@nozbe/watermelondb/react';
import React, {type ComponentType, useEffect, useState} from 'react';

import DeviceInfoProvider from '@context/device';
import ServerProvider from '@context/server';
import ThemeProvider from '@context/theme';
import UserLocaleProvider from '@context/user_locale';
import DatabaseManager from '@database/manager';
import {subscribeActiveServers} from '@database/subscription/servers';
import {getCachedActiveServer, setCachedActiveServer, type CachedActiveServer} from '@init/session_cache';
import {secureGetFromRecord} from '@utils/types';

import type {Database} from '@nozbe/watermelondb';
import type ServersModel from '@typings/database/models/app/servers';

type State = { database: Database; server: CachedActiveServer };

function toState(server: CachedActiveServer): State | undefined {
    const database = secureGetFromRecord(DatabaseManager.serverDatabases, server.url)?.database;
    return database ? {database, server} : undefined;
}

export function withServerDatabase<T extends React.JSX.IntrinsicAttributes>(Component: ComponentType<T>): ComponentType<T> {
    return function ServerDatabaseComponent(props: T) {
        const [state, setState] = useState<State | undefined>(() => {
            const cached = getCachedActiveServer();
            return cached && toState(cached);
        });

        const observer = (servers: ServersModel[]) => {
            const server = servers?.length ? servers.reduce((a, b) =>
                (b.lastActiveAt > a.lastActiveAt ? b : a),
            ) : undefined;

            if (server) {
                const active: CachedActiveServer = {
                    url: server.url,
                    displayName: server.displayName,
                    persistenceFlag: server.persistenceFlag,
                };
                setCachedActiveServer(active);
                const next = toState(active);
                if (next) {
                    setState(next);
                }
            } else {
                setCachedActiveServer(undefined);
                setState(undefined);
            }
        };

        useEffect(() => {
            const subscription = subscribeActiveServers(observer);

            return () => {
                subscription?.unsubscribe();
            };
        }, []);

        if (!state?.database) {
            return null;
        }

        // Flip the key when the adapter changes (on-disk ↔ in-memory) so React unmounts and
        // remounts the subtree; withObservables uses empty triggerProps and only binds to the
        // database at mount, so without a remount it would stay subscribed to the dropped instance.
        const dbKey = state.server.persistenceFlag === 'zero-persistence' ? `${state.server.url}.mem` : state.server.url;

        return (
            <DatabaseProvider
                database={state.database}
                key={dbKey}
            >
                <DeviceInfoProvider>
                    <UserLocaleProvider database={state.database}>
                        <ServerProvider server={{displayName: state.server.displayName, url: state.server.url}}>
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
