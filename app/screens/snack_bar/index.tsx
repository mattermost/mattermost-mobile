// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Portal} from '@gorhom/portal';
import {usePathname} from 'expo-router';
import {useCallback, useEffect, useState} from 'react';
import {DeviceEventEmitter} from 'react-native';
import {FullWindowOverlay} from 'react-native-screens';

import {Navigation} from '@constants';
import {SNACK_BAR_CONFIG} from '@constants/snack_bar';
import {withServerDatabase} from '@database/components';
import useDidMount from '@hooks/did_mount';
import SnackBarStore from '@store/snackbar_store';

import SnackBar from './snack_bar';

import type {ShowSnackBarArgs} from '@utils/snack_bar';

function isPersistentSnackBar(config: ShowSnackBarArgs | null): boolean {
    if (!config) {
        return false;
    }
    return config.isPersistent ?? SNACK_BAR_CONFIG[config.barType]?.isPersistent ?? false;
}

function SnackBarContainer() {
    const [state, setState] = useState(SnackBarStore.getState());
    const pathname = usePathname();

    // Subscribe to store changes
    useDidMount(() => {
        const sub = SnackBarStore.observe().subscribe((next) => {
            setState(next);
        });
        return () => {
            sub.unsubscribe();

            // Read the store directly to avoid wiping a persistent snack bar with stale unmount state.
            const current = SnackBarStore.getState();
            const persistent = isPersistentSnackBar(current.config);
            if (!persistent) {
                SnackBarStore.dismiss();
            }
        };
    });

    // Auto-dismiss on navigation changes
    useEffect(() => {
        if (state.visible && !isPersistentSnackBar(state.config)) {
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

    return (
        <Portal hostName='snack_bar'>
            <FullWindowOverlay>
                <SnackBar
                    {...state.config}
                    onDismiss={SnackBarStore.dismiss}
                />
            </FullWindowOverlay>
        </Portal>
    );
}

export default withServerDatabase(SnackBarContainer);
