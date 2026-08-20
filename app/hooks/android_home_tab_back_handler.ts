// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useCallback} from 'react';

import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import {navigateToHomeTab} from '@screens/navigation';

import type {AvailableScreens} from '@typings/screens/navigation';

const useAndroidHomeTabBackHandler = (screen: AvailableScreens) => {
    const onBackPress = useCallback(() => {
        navigateToHomeTab();
    }, []);

    useAndroidHardwareBackHandler(screen, onBackPress);
};

export default useAndroidHomeTabBackHandler;
