// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {EffectCallback, useEffect} from 'react';
import {BackHandler} from 'react-native';

import EphemeralStore from '@store/ephemeral_store';

const useAndroidHardwareBackHandler = (componentId: string, callback: EffectCallback) => {
    useEffect(() => {
        const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
            if (EphemeralStore.getNavigationTopComponentId() === componentId) {
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
