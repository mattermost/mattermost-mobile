// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useId, useMemo} from 'react';
import RNMathView from 'react-native-math-view';

import type {StyleProp, TextStyle, ViewStyle} from 'react-native';

// From node_modules/react-native-math-view/src/common.tsx
type Props = {
    math: string;
    onError?: (error: Error) => any;
    renderError: ({error}: {error: Error}) => JSX.Element;
    resizeMode: 'cover' | 'contain';
    style: StyleProp<ViewStyle & Pick<TextStyle, 'color'>>;
}

const MathView = (props: Props) => {
    const id = useId();
    const config = useMemo(() => ({id}), []);

    return (
        <RNMathView
            {...props}
            config={config}
        />
    );
};

export default MathView;
