// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {TextStyle, ViewStyle} from 'react-native';

export type UserMentionKey= {
    key: string;
    caseSensitive?: boolean;
};

export type MarkdownBlockStyles = {
    adjacentParagraph: ViewStyle;
    horizontalRule: ViewStyle;
    quoteBlockIcon: TextStyle;
};

export type MarkdownTextStyles = {
    [key: string]: TextStyle;
};
