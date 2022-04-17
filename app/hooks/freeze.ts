// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useEffect, useState} from 'react';
import {DeviceEventEmitter} from 'react-native';

import {Events} from '@constants';

const useFreeze = () => {
    const [freeze, setFreeze] = useState(false);
    const [backgroundColor, setBackgroundColor] = useState('#000');

    useEffect(() => {
        const freezeListener = DeviceEventEmitter.addListener(Events.FREEZE_SCREEN, (shouldFreeze: boolean, color = '#000') => {
            setFreeze(shouldFreeze);
            setBackgroundColor(color);
        });

        return () => freezeListener.remove();
    });

    return {freeze, backgroundColor};
};

export default useFreeze;
