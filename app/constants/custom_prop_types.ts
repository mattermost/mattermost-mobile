// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {ReactNode, ReactNodeArray} from 'react';
import {StyleProp, TextStyle, ViewStyle} from 'react-native';

interface CustomPropTypes {
    Children: ReactNode | ReactNodeArray;
    Style: object | number | StyleProp<TextStyle> | StyleProp<TextStyle>[] | StyleProp<ViewStyle> | StyleProp<ViewStyle>[];
}

export default CustomPropTypes;
