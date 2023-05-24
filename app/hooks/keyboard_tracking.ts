// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {type RefObject, useEffect, useRef} from 'react';
import {Navigation} from 'react-native-navigation';

import NavigationStore from '@store/navigation_store';

import type {KeyboardTrackingViewRef} from 'react-native-keyboard-tracking-view';

export const useKeyboardTrackingPaused = (keyboardTrackingRef: RefObject<KeyboardTrackingViewRef>, trackerId: string, screens: string[]) => {
    const isPostDraftPaused = useRef(false);

    useEffect(() => {
        keyboardTrackingRef.current?.resumeTracking(trackerId);
    }, []);

    useEffect(() => {
        const onCommandComplete = () => {
            const id = NavigationStore.getVisibleScreen();
            if (screens.includes(id) && isPostDraftPaused.current) {
                isPostDraftPaused.current = false;
                keyboardTrackingRef.current?.resumeTracking(trackerId);
            }
        };

        const commandListener = Navigation.events().registerCommandListener(() => {
            setTimeout(() => {
                const visibleScreen = NavigationStore.getVisibleScreen();
                if (!isPostDraftPaused.current && !screens.includes(visibleScreen)) {
                    isPostDraftPaused.current = true;
                    keyboardTrackingRef.current?.pauseTracking(trackerId);
                }
            });
        });

        const commandCompletedListener = Navigation.events().registerCommandCompletedListener(() => {
            onCommandComplete();
        });

        const popListener = Navigation.events().registerScreenPoppedListener(() => {
            onCommandComplete();
        });

        return () => {
            commandListener.remove();
            commandCompletedListener.remove();
            popListener.remove();
        };
    }, [trackerId]);
};
