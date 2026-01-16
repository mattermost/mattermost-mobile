// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useEffect, useState} from 'react';

import NavigationStore from '@store/navigation_store';

import type {AvailableScreens} from '@typings/screens/navigation';

export const useIsScreenVisible = (componentId?: AvailableScreens): boolean => {
    const [isVisible, setIsVisible] = useState(() => {
        if (!componentId) {
            return false;
        }
        return NavigationStore.getVisibleScreen() === componentId;
    });

    useEffect(() => {
        if (!componentId) {
            setIsVisible(false);
            return undefined;
        }

        setIsVisible(NavigationStore.getVisibleScreen() === componentId);
        const subscription = NavigationStore.getSubject().subscribe((visibleScreen) => {
            setIsVisible(visibleScreen === componentId);
        });

        return () => {
            subscription.unsubscribe();
        };
    }, [componentId]);

    return isVisible;
};

