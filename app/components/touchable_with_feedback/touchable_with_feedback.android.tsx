// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/* eslint-disable new-cap */

import React, {memo} from 'react';
import {TouchableNativeFeedback, TouchableOpacity, TouchableWithoutFeedback, View} from 'react-native';

type TouchableProps = {
    testID: string;
    children: React.ReactNode | React.ReactNode[];
    underlayColor: string;
    type: 'native' | 'opacity' | 'none';
    [x: string]: any;
}

const TouchableWithFeedbackAndroid = ({testID, children, underlayColor, type = 'native', ...props}: TouchableProps) => {
    switch (type) {
        case 'native':
            return (
                <TouchableNativeFeedback
                    testID={testID}
                    {...props}
                    background={TouchableNativeFeedback.Ripple(underlayColor || '#000', false)}
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
