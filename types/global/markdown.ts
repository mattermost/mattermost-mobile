// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import type {TextStyle, ViewStyle} from 'react-native';

export type SearchPattern = {
    pattern: RegExp;
    term: string;
};

export type UserMentionKey = {
    key: string;
    caseSensitive?: boolean;
};

export type HighlightWithoutNotificationKey = {
    key: string;
};

export type MarkdownBlockStyles = {
    adjacentParagraph: ViewStyle;
    horizontalRule: ViewStyle;
    quoteBlockIcon: TextStyle;
};

export type MarkdownTextStyles = {
    [key: string]: TextStyle;
};

export type MarkdownAtMentionRenderer = {
    context: string[];
    mentionName: string;
}

export type MarkdownBaseRenderer = {
    context: string[];
    literal: string;
}

export type MarkdownChannelMentionRenderer = {
    context: string[];
    channelName: string;
}

export type MarkdownEmojiRenderer = MarkdownBaseRenderer & {
    emojiName: string;
}

export type MarkdownImageRenderer = {
    linkDestination?: string;
    context: string[];
    src: string;
    size?: {
        width?: number;
        height?: number;
    };
}

export type MarkdownLatexRenderer = MarkdownBaseRenderer & {
    latexCode: string;
}
