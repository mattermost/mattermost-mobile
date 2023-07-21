// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/* eslint-disable new-cap */

import React, {memo} from 'react';
import {Touchable, TouchableOpacity, TouchableNativeFeedback, TouchableWithoutFeedback, View, type StyleProp, type ViewStyle} from 'react-native';

type TouchableProps = Touchable & {
    children: React.ReactNode | React.ReactNode[];
    borderlessRipple?: boolean;
    rippleRadius?: number;
    style?: StyleProp<ViewStyle>;
    testID: string;
    type: 'native' | 'opacity' | 'none';
    underlayColor: string;
}

const TouchableWithFeedbackAndroid = ({borderlessRipple = false, children, rippleRadius, testID, type = 'native', underlayColor, ...props}: TouchableProps) => {
    switch (type) {
        case 'native':
            return (
                <TouchableNativeFeedback
                    testID={testID}
                    {...props}
                    style={[props.style]}
                    background={TouchableNativeFeedback.Ripple(underlayColor || '#fff', borderlessRipple, rippleRadius)}
                >
                    <View>
                        {children}
                    </View>
                </TouchableNativeFeedback>
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

export default memo(TouchableWithFeedbackAndroid);
