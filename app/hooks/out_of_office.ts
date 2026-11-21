// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useEffect, useState} from 'react';
import {DeviceEventEmitter} from 'react-native';

import {useAppState} from '@hooks/device';
import {logWarning} from '@utils/log';
import {getNextOutOfOfficeCheck, getOutOfOfficeSettings, OUT_OF_OFFICE_CHANGED, shouldSuppressOutOfOfficeNotification} from '@utils/out_of_office';

// Existing incoming-call banners must also disappear when a scheduled period begins.
export default function useOutOfOfficeCallsSuppressed(serverUrl: string) {
    const [suppressed, setSuppressed] = useState(false);
    const appState = useAppState();

    useEffect(() => {
        let active = true;
        let timer: ReturnType<typeof setTimeout> | undefined;
        let refreshSequence = 0;
        const refresh = async () => {
            const sequence = ++refreshSequence;
            clearTimeout(timer);
            try {
                const settings = await getOutOfOfficeSettings(serverUrl);
                if (!active || sequence !== refreshSequence) {
                    return;
                }
                const now = Date.now();
                setSuppressed(shouldSuppressOutOfOfficeNotification(settings, 'call', false, now));
                if (settings?.enabled) {
                    const nextBoundary = getNextOutOfOfficeCheck(settings, now);
                    if (nextBoundary) {
                        timer = setTimeout(refresh, Math.min(nextBoundary - now, 2147483647));
                    }
                }
            } catch {
                if (active && sequence === refreshSequence) {
                    setSuppressed(false);
                }
                logWarning('useOutOfOfficeCallsSuppressed: unable to read settings');
            }
        };
        refresh();
        const listener = DeviceEventEmitter.addListener(OUT_OF_OFFICE_CHANGED, (url: string) => {
            if (url === serverUrl) {
                refresh();
            }
        });
        return () => {
            active = false;
            clearTimeout(timer);
            listener.remove();
        };
    }, [appState, serverUrl]);

    return suppressed;
}
