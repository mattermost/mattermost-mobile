// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Redirect, type Href} from 'expo-router';
import {useEffect, useState} from 'react';
import {ActivityIndicator, StyleSheet, View} from 'react-native';

import {determineInitialExpoRoute, type ExpoRouterLaunchResult} from '@init/launch';
import {getWireGuardState, isWireGuardRequired, WireGuardStatus} from '@managers/wireguard_manager';
import {propsToParams} from '@screens/navigation';
import {getFullErrorMessage} from '@utils/errors';
import {logError} from '@utils/log';

const LAUNCH_TIMEOUT_MS = 15000;

const styles = StyleSheet.create({
    loading: {
        alignItems: 'center',
        flex: 1,
        justifyContent: 'center',
    },
});

export default function RootIndex() {
    const [launchResult, setLaunchResult] = useState<ExpoRouterLaunchResult | null>(null);

    useEffect(() => {
        let active = true;
        let launchTimeout: ReturnType<typeof setTimeout> | undefined;

        async function initializeLaunch() {
            if (isWireGuardRequired()) {
                try {
                    const vpnState = await getWireGuardState();
                    if (!active) {
                        return;
                    }
                    if (vpnState.status !== WireGuardStatus.Connected) {
                        setLaunchResult({route: '/vpn', params: {}});
                        return;
                    }
                } catch {
                    // Fail closed: the normal server/login flow requires a verified tunnel.
                    if (active) {
                        setLaunchResult({route: '/vpn', params: {}});
                    }
                    return;
                }
            }

            try {
                const timeoutPromise = new Promise<never>((_, reject) => {
                    launchTimeout = setTimeout(() => reject(new Error('Initial route determination timed out')), LAUNCH_TIMEOUT_MS);
                });
                const result = await Promise.race([determineInitialExpoRoute(), timeoutPromise]);
                if (active) {
                    setLaunchResult(result);
                }
            } catch (error) {
                // A verified VPN must not strand the user on a blank root route when ordinary
                // launch routing fails. The server screen remains behind the same VPN gate.
                logError('Unable to determine the initial route after launch', getFullErrorMessage(error));
                if (active) {
                    setLaunchResult({route: '/(unauthenticated)/server', params: {launchError: true}});
                }
            } finally {
                if (launchTimeout) {
                    clearTimeout(launchTimeout);
                }
            }
        }

        initializeLaunch();
        return () => {
            active = false;
            if (launchTimeout) {
                clearTimeout(launchTimeout);
            }
        };
    }, []);

    if (!launchResult) {
        return (
            <View
                style={styles.loading}
                testID='launch.loading'
            >
                <ActivityIndicator/>
            </View>
        );
    }

    // Redirect to the determined route with params
    const href: Href = {pathname: launchResult.route, params: propsToParams(launchResult.params)};
    return <Redirect href={href}/>;
}
