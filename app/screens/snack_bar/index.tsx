// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Portal} from '@gorhom/portal';
import {usePathname} from 'expo-router';
import {useCallback, useEffect, useState} from 'react';
import {DeviceEventEmitter} from 'react-native';
import {FullWindowOverlay} from 'react-native-screens';

import {Navigation} from '@constants';
import {withServerDatabase} from '@database/components';
import SnackBarStore from '@store/snackbar_store';

import SnackBar from './snack_bar';

function SnackBarContainer() {
    const [state, setState] = useState(SnackBarStore.getState());
    const pathname = usePathname();

    // Subscribe to store changes
    useEffect(() => {
        const sub = SnackBarStore.observe().subscribe(setState);
        return () => sub.unsubscribe();
    }, []);

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

    return (
        <Portal>
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
