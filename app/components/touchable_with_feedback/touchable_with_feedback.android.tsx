// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/* eslint-disable new-cap */

import React, {memo} from 'react';
import {Touchable, TouchableOpacity, TouchableWithoutFeedback, View, StyleProp, ViewStyle} from 'react-native';
import {TouchableNativeFeedback} from 'react-native-gesture-handler';

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
        case 'none':
            return (
                <TouchableWithoutFeedback
                    testID={testID}
                    {...props}
                >
                    {children}
                </TouchableWithoutFeedback>
            );
    }

    return null;
};

export default memo(TouchableWithFeedbackAndroid);
