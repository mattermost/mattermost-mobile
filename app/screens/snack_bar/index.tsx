// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Portal} from '@gorhom/portal';
import {usePathname} from 'expo-router';
import {useCallback, useEffect, useState} from 'react';
import {DeviceEventEmitter} from 'react-native';
import {FullWindowOverlay} from 'react-native-screens';

import {Navigation} from '@constants';
import DeviceInfoProvider from '@context/device';
import {CustomThemeProvider} from '@context/theme';
import UserLocaleProvider from '@context/user_locale';
import DatabaseManager from '@database/manager';
import useDidMount from '@hooks/did_mount';
import {getCachedActiveServer} from '@init/session_cache';
import EphemeralStore from '@store/ephemeral_store';
import SnackBarStore from '@store/snackbar_store';
import {secureGetFromRecord} from '@utils/types';

import SnackBar from './snack_bar';

function SnackBarContainer() {
    const [state, setState] = useState(() => SnackBarStore.getState());
    const [theme, setTheme] = useState(() => EphemeralStore.getTheme());
    const pathname = usePathname();

    // Subscribe to store changes
    useDidMount(() => {
        const sub = SnackBarStore.observe().subscribe(setState);
        const themeSub = EphemeralStore.observeTheme().subscribe(setTheme);
        return () => {
            sub.unsubscribe();
            themeSub.unsubscribe();
        };
    });

    // Auto-dismiss on navigation changes
    useEffect(() => {
        if (state.visible) {
            SnackBarStore.dismiss();
        }

    // Only dismiss when pathname changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pathname]);

    const dismissIfVisible = useCallback(() => {
        if (state.visible) {
            SnackBarStore.dismiss();
        }
    }, [state.visible]);

    // Listen to tab navigation events
    useEffect(() => {
        const navigateToTabListener = DeviceEventEmitter.addListener(Navigation.NAVIGATE_TO_TAB, dismissIfVisible);
        const tabPressedListener = DeviceEventEmitter.addListener(Navigation.TAB_PRESSED, dismissIfVisible);

        return () => {
            navigateToTabListener.remove();
            tabPressedListener.remove();
        };
    }, [dismissIfVisible]);

    if (!state.visible || !state.config) {
        return null;
    }

    const cached = getCachedActiveServer();
    const database = cached ? secureGetFromRecord(DatabaseManager.serverDatabases, cached.url)?.database : undefined;

    let tree = (
        <CustomThemeProvider theme={theme}>
            <Portal hostName='snack_bar'>
                <FullWindowOverlay>
                    <SnackBar
                        {...state.config}
                        onDismiss={SnackBarStore.dismiss}
                    />
                </FullWindowOverlay>
            </Portal>
        </CustomThemeProvider>
    );
    if (database) {
        tree = <UserLocaleProvider database={database}>{tree}</UserLocaleProvider>;
    }
    return (
        <DeviceInfoProvider>
            {tree}
        </DeviceInfoProvider>
    );
}

export default SnackBarContainer;
