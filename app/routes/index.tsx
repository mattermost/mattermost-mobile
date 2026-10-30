// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Redirect, type Href} from 'expo-router';
import {useEffect, useState} from 'react';
import {ActivityIndicator, StyleSheet, View} from 'react-native';

import {type ExpoRouterLaunchResult} from '@init/launch';
import {determineInitialExpoRouteWithFallback} from '@init/launch_with_fallback';
import {getWireGuardState, isWireGuardRequired, WireGuardStatus} from '@managers/wireguard_manager';
import {propsToParams} from '@screens/navigation';

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

            const result = await determineInitialExpoRouteWithFallback();
            if (active) {
                setLaunchResult(result);
            }
        }

        initializeLaunch();
        return () => {
            active = false;
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
