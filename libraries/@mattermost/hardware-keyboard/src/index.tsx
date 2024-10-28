// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useCallback, useEffect} from 'react';
import {NativeEventEmitter, NativeModules, Platform} from 'react-native';

const LINKING_ERROR =
  'The package \'mattermost-hardware-keyboard\' doesn\'t seem to be linked. Make sure: \n\n' +
  Platform.select({ios: "- You have run 'pod install'\n", default: ''}) +
  '- You rebuilt the app after installing the package\n' +
  '- You are not using Expo Go\n';

// @ts-expect-error global
const isTurboModuleEnabled = global.__turboModuleProxy != null;

const MattermostHardwareKeyboardModule = isTurboModuleEnabled ? require('./NativeMattermostHardwareKeyboard').default : NativeModules.MattermostHardwareKeyboard;

const MattermostHardwareKeyboard = MattermostHardwareKeyboardModule || new Proxy(
    {},
    {
        get() {
            throw new Error(LINKING_ERROR);
        },
    },
);

const emitter = new NativeEventEmitter(MattermostHardwareKeyboard);

type Event = {
  action: string;
}

type Events = {
  onEnterPressed?: () => void;
  onShiftEnterPressed?: () => void;
  onFindChannels?: () => void;
}

export function useHardwareKeyboardEvents(events: Events) {
    const handleEvent = useCallback((e: Event) => {
        switch (e.action) {
            case 'enter':
                events.onEnterPressed?.();
                break;
            case 'shift-enter':
                events.onShiftEnterPressed?.();
                break;
            case 'find-channels':
                events.onFindChannels?.();
                break;
        }
    }, [events]);

    useEffect(() => {
        const listener = emitter.addListener('mmHardwareKeyboardEvent', handleEvent);

        return () => listener.remove();
    }, [handleEvent]);
}
