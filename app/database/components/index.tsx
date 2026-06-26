// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {DatabaseProvider} from '@nozbe/watermelondb/react';
import React, {type ComponentType, useEffect, useRef, useState} from 'react';

import {cancelExperienceAPIEntryActions} from '@actions/remote/entry/initial_load';
import DeviceInfoProvider from '@context/device';
import ServerProvider from '@context/server';
import ThemeProvider from '@context/theme';
import UserLocaleProvider from '@context/user_locale';
import DatabaseManager from '@database/manager';
import {subscribeActiveServers} from '@database/subscription/servers';
import {secureGetFromRecord} from '@utils/types';

import type {Database} from '@nozbe/watermelondb';
import type ServersModel from '@typings/database/models/app/servers';

type State = {
    database: Database;
    serverUrl: string;
    serverDisplayName: string;
};

export function withServerDatabase<T extends React.JSX.IntrinsicAttributes>(Component: ComponentType<T>): ComponentType<T> {
    return function ServerDatabaseComponent(props: T) {
        const [state, setState] = useState<State | undefined>();
        const prevServerUrlRef = useRef<string | undefined>(undefined);

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
                    });
                }
            } else {
                setState(undefined);
            }
        };

        useEffect(() => {
            const subscription = subscribeActiveServers(observer);

            return () => {
                subscription?.unsubscribe();
            };
        }, []);

        useEffect(() => {
            const prev = prevServerUrlRef.current;
            prevServerUrlRef.current = state?.serverUrl;

            return () => {
                if (prev) {
                    cancelExperienceAPIEntryActions(prev);
                }
            };
        }, [state?.serverUrl]);

        if (!state?.database) {
            return null;
        }

        return (
            <DatabaseProvider
                database={state.database}
                key={state.serverUrl}
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
