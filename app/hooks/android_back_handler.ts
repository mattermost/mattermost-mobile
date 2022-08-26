// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {EffectCallback, useEffect} from 'react';
import {BackHandler} from 'react-native';

import NavigationStore from '@store/navigation_store';

const useAndroidHardwareBackHandler = (componentId: string, callback: EffectCallback) => {
    useEffect(() => {
        const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
            if (NavigationStore.getNavigationTopComponentId() === componentId) {
                callback();
                return true;
            }

            return false;
        });

        return () => {
            backHandler.remove();
        };
    }, [componentId]);
};

export default useAndroidHardwareBackHandler;
