// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {memo} from 'react';
import {PanResponder, Touchable, TouchableHighlight, TouchableOpacity, TouchableWithoutFeedback, View} from 'react-native';

type TouchableProps = Touchable & {
    cancelTouchOnPanning: boolean;
    children: React.ReactNode | React.ReactNode[];
    testID: string;
    type: 'native' | 'opacity' | 'none';
}

const TouchableWithFeedbackIOS = ({testID, children, type = 'native', cancelTouchOnPanning, ...props}: TouchableProps) => {
    const panResponder = React.useRef(PanResponder.create({
        onMoveShouldSetPanResponderCapture: (evt, gestureState) => {
            return cancelTouchOnPanning && (gestureState.dx >= 5 || gestureState.dy >= 5 || gestureState.vx > 5);
        },
    }));

    switch (type) {
        case 'native':
            return (
                <View
                    testID={testID}
                    {...panResponder?.current.panHandlers}
                >
                    <TouchableHighlight
                        {...props}
                    >
                        {children}
                    </TouchableHighlight>
                </View>
            );
        case 'opacity':
            return (
                <TouchableOpacity
                    testID={testID}
                    {...props}
                >
                    {children}
                </TouchableOpacity>
            );
        default:
            return (
                <TouchableWithoutFeedback
                    testID={testID}
                    {...props}
                >
                    {children}
                </TouchableWithoutFeedback>
            );
    }
};

export default memo(TouchableWithFeedbackIOS);
