// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import type {ImageStyle, TextStyle, ViewStyle} from 'react-native';

export type NamedStyles<T> = { [P in keyof T]: ViewStyle | TextStyle | ImageStyle };
