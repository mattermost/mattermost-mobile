// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {ImageStyle, TextStyle, ViewStyle} from 'react-native';

type Dictionary<T> = {
    [key: string]: T;
};

type Styles = ViewStyle | TextStyle | ImageStyle
