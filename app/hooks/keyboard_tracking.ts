// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {RefObject, useEffect, useRef} from 'react';
import {KeyboardTrackingViewRef} from 'react-native-keyboard-tracking-view';
import {Navigation} from 'react-native-navigation';

import NavigationStore from '@store/navigation_store';

export const useKeyboardTrackingPaused = (keyboardTrackingRef: RefObject<KeyboardTrackingViewRef>, trackerId: string, screens: string[]) => {
    const isPostDraftPaused = useRef(false);

    useEffect(() => {
        const commandListener = Navigation.events().registerCommandListener(() => {
            if (!isPostDraftPaused.current) {
                isPostDraftPaused.current = true;
                keyboardTrackingRef.current?.pauseTracking(trackerId);
            }
        });

        const commandCompletedListener = Navigation.events().registerCommandCompletedListener(() => {
            const id = NavigationStore.getNavigationTopComponentId();
            if (screens.includes(id) && isPostDraftPaused.current) {
                isPostDraftPaused.current = false;
                keyboardTrackingRef.current?.resumeTracking(trackerId);
            }
        });

        return () => {
            commandListener.remove();
            commandCompletedListener.remove();
        };
    }, [trackerId]);
};
