// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {type DependencyList, type EffectCallback, useEffect} from 'react';
import {Navigation} from 'react-native-navigation';

type Callback = EffectCallback | (() => Promise<void>);
const useNavButtonPressed = (navButtonId: string, componentId: string, callback: Callback, deps?: DependencyList) => {
    useEffect(() => {
        const unsubscribe = Navigation.events().registerComponentListener({
            navigationButtonPressed: ({buttonId}: { buttonId: string }) => {
                if (buttonId === navButtonId) {
                    callback();
                }
            },
        }, componentId);

        return () => {
            unsubscribe.remove();
        };
    }, deps);
};

export default useNavButtonPressed;
