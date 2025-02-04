// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import RNUtils from '@mattermost/rnutils';
import {useEffect, useRef} from 'react';
import {Keyboard} from 'react-native';
import {Navigation} from 'react-native-navigation';

import type {AvailableScreens} from '@typings/screens/navigation';

export function useAndroidAdjustSoftKeyboard(screen?: AvailableScreens) {
    const timeout = useRef<NodeJS.Timeout>();

    useEffect(() => {
        const listener = {
            componentDidAppear: () => {
                if (Keyboard.isVisible()) {
                    Keyboard.dismiss();
                }
                timeout.current = setTimeout(() => {
                    RNUtils.setSoftKeyboardToAdjustNothing();
                }, 10);
            },
            componentDidDisappear: () => {
                RNUtils.setSoftKeyboardToAdjustResize();
            },
        };
        const unsubscribe = Navigation.events().registerComponentListener(listener, screen!);

        return () => {
            clearTimeout(timeout.current);
            unsubscribe.remove();
        };
    }, []);
}
