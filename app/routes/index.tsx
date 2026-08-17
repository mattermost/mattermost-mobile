// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Redirect, type Href} from 'expo-router';
import {useEffect, useState} from 'react';

import {determineInitialExpoRoute, getOptimisticLaunchResult, type ExpoRouterLaunchResult} from '@init/launch';
import {hideLaunchSplash} from '@init/splash';
import {getFullErrorMessage} from '@utils/errors';
import {logError} from '@utils/log';

function shouldKeepCurrentLaunch(current: ExpoRouterLaunchResult, next: ExpoRouterLaunchResult) {
    return current.route === next.route && current.params.serverUrl === next.params.serverUrl;
}

export default function RootIndex() {
    const [launchResult, setLaunchResult] = useState<ExpoRouterLaunchResult | null>(getOptimisticLaunchResult);

    useEffect(() => {
        let cancelled = false;
        async function initializeLaunch() {
            try {
                const result = await determineInitialExpoRoute();
                if (cancelled) {
                    return;
                }
                setLaunchResult((current) => {
                    if (current && shouldKeepCurrentLaunch(current, result)) {
                        return current;
                    }
                    return result;
                });
            } catch (error) {
                logError('error on initializeLaunch', getFullErrorMessage(error));
                if (getOptimisticLaunchResult()) {
                    hideLaunchSplash();
                }
            }
        }

        initializeLaunch();
        return () => {
            cancelled = true;
        };
    }, []);

    if (!launchResult) {
        return null;
    }

    const href: Href = {pathname: launchResult.route, params: launchResult.params};
    return <Redirect href={href}/>;
}
