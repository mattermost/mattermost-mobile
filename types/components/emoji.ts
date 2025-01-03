// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import type CustomEmojiModel from '@typings/database/models/servers/custom_emoji';
import type {ImageStyle} from 'expo-image';
import type {StyleProp, TextStyle} from 'react-native';

// The intersection of the image styles and text styles
type ImageStyleUniques = Omit<ImageStyle, keyof(TextStyle)>
export type EmojiCommonStyle = Omit<ImageStyle, keyof(ImageStyleUniques)>

export type EmojiProps = {
    emojiName: string;
    displayTextOnly?: boolean;
    literal?: string;
    size?: number;
    textStyle?: StyleProp<TextStyle>;
    imageStyle?: StyleProp<ImageStyle>;
    commonStyle?: StyleProp<Intersection<TextStyle, EmojiCommonStyle>>;
    customEmojis: CustomEmojiModel[];
    testID?: string;
}

export type EmojiComponent = (props: Omit<EmojiProps, 'customEmojis'>) => JSX.Element;
