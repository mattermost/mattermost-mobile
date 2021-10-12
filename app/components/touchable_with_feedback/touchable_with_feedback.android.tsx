// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/* eslint-disable new-cap */

import React, {memo} from 'react';
import {Touchable, TouchableOpacity, TouchableWithoutFeedback, View, StyleProp, ViewStyle} from 'react-native';
import {TouchableNativeFeedback} from 'react-native-gesture-handler';

type TouchableProps = Touchable & {
    testID: string;
    children: React.ReactNode | React.ReactNode[];
    underlayColor: string;
    type: 'native' | 'opacity' | 'none';
    style?: StyleProp<ViewStyle>;
}

const TouchableWithFeedbackAndroid = ({testID, children, underlayColor, type = 'native', ...props}: TouchableProps) => {
    switch (type) {
        case 'native':
            return (
                <TouchableNativeFeedback
                    testID={testID}
                    {...props}
                    style={[props.style]}
                    background={TouchableNativeFeedback.Ripple(underlayColor || '#fff', false)}
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
