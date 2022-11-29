// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useEffect} from 'react';
import {Navigation} from 'react-native-navigation';

const BACK_BUTTON = 'RNN.back';

const useBackNavigation = (callback: () => void) => {
    useEffect(() => {
        const backListener = Navigation.events().registerNavigationButtonPressedListener(({buttonId}) => {
            if (buttonId === BACK_BUTTON) {
                callback();
            }
        });

        return () => backListener.remove();
    }, [callback]);
};

export default useBackNavigation;
