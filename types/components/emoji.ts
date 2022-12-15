// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import type CustomEmojiModel from '@typings/database/models/servers/custom_emoji';
import type {StyleProp, TextStyle} from 'react-native';
import type {ImageStyle} from 'react-native-fast-image';

export type EmojiProps = {
    emojiName: string;
    displayTextOnly?: boolean;
    literal?: string;
    size?: number;
    textStyle?: StyleProp<TextStyle>;
    customEmojiStyle?: StyleProp<ImageStyle>;
    customEmojis: CustomEmojiModel[];
    testID?: string;
}

export type EmojiComponent = (props: Omit<EmojiProps, 'customEmojis'>) => JSX.Element;
