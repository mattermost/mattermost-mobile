// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import type {ImageStyle, TextStyle, ViewStyle} from 'react-native';
import type {ImageStyle as FIImageStyle} from 'react-native-fast-image';

export type NamedStyles<T> = { [P in keyof T]: ViewStyle | TextStyle | ImageStyle };
export type ImageStyles = Intersection<ImageStyle, FIImageStyle>;
