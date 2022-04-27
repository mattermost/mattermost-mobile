// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Parser} from 'commonmark';
import Renderer from 'commonmark-react-renderer';
import React, {ReactElement, useRef} from 'react';
import {StyleProp, Text, TextStyle} from 'react-native';

import type {MarkdownEmojiRenderer} from '@typings/global/markdown';

type Props = {
    renderEmoji?: (params: MarkdownEmojiRenderer) => ReactElement;
    renderHardBreak?: () => string;
    renderSoftBreak?: () => string;
    textStyle: StyleProp<TextStyle>;
    value: string;
};

const RemoveMarkdown = ({renderEmoji, renderHardBreak, renderSoftBreak, textStyle, value}: Props) => {
    const renderText = ({literal}: {literal: string}) => {
        return <Text style={textStyle}>{literal}</Text>;
    };

    const renderNull = () => {
        return null;
    };

    const createRenderer = () => {
        return new Renderer({
            renderers: {
                text: renderText,

                emph: Renderer.forwardChildren,
                strong: Renderer.forwardChildren,
                del: Renderer.forwardChildren,
                code: Renderer.forwardChildren,
                link: Renderer.forwardChildren,
                image: renderNull,
                atMention: Renderer.forwardChildren,
                channelLink: Renderer.forwardChildren,
                emoji: renderEmoji || renderNull,
                hashtag: Renderer.forwardChildren,

                paragraph: Renderer.forwardChildren,
                heading: Renderer.forwardChildren,
                codeBlock: renderNull,
                blockQuote: renderNull,

                list: renderNull,
                item: renderNull,

                hardBreak: renderHardBreak || renderNull,
                thematicBreak: renderNull,
                softBreak: renderSoftBreak || renderNull,

                htmlBlock: renderNull,
                htmlInline: renderNull,

                table: renderNull,
                table_row: renderNull,
                table_cell: renderNull,

                mention_highlight: Renderer.forwardChildren,
                editedIndicator: Renderer.forwardChildren,
            } as any,
        });
    };

    const parser = useRef(new Parser()).current;
    const renderer = useRef(createRenderer()).current;
    const ast = parser.parse(value);

    return renderer.render(ast) as ReactElement;
};

export default RemoveMarkdown;
