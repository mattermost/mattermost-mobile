// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useEffect} from 'react';
import {BackHandler} from 'react-native';

import {useCurrentScreen} from '@store/navigation_store';

import type {AvailableScreens} from '@typings/screens/navigation';

const useAndroidHardwareBackHandler = (componentId: AvailableScreens | undefined, callback: () => void) => {
    const currentScreen = useCurrentScreen();
    useEffect(() => {
        const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
            if (currentScreen === componentId) {
                callback();
                return true;
            }

            return false;
        });

        return () => {
            backHandler.remove();
        };
    }, [componentId, callback, currentScreen]);
};

export default useAndroidHardwareBackHandler;
