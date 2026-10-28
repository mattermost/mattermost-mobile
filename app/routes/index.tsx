// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Redirect, type Href} from 'expo-router';
import {useEffect, useState} from 'react';

import {determineInitialExpoRoute, type ExpoRouterLaunchResult} from '@init/launch';
import {getWireGuardState, isWireGuardRequired, WireGuardStatus} from '@managers/wireguard_manager';
import {propsToParams} from '@screens/navigation';

export default function RootIndex() {
    const [launchResult, setLaunchResult] = useState<ExpoRouterLaunchResult | null>(null);

    useEffect(() => {
        async function initializeLaunch() {
            if (isWireGuardRequired()) {
                try {
                    const vpnState = await getWireGuardState();
                    if (vpnState.status !== WireGuardStatus.Connected) {
                        setLaunchResult({route: '/vpn', params: {}});
                        return;
                    }
                } catch {
                    // Fail closed: the normal server/login flow requires a verified tunnel.
                    setLaunchResult({route: '/vpn', params: {}});
                    return;
                }
            }

            const result = await determineInitialExpoRoute();
            setLaunchResult(result);
        }

        initializeLaunch();
    }, []);

    if (!launchResult) {
        return null; // Still determining initial route
    }

    // Redirect to the determined route with params
    const href: Href = {pathname: launchResult.route, params: propsToParams(launchResult.params)};
    return <Redirect href={href}/>;
}
