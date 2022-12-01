// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Parser} from 'commonmark';
import Renderer from 'commonmark-react-renderer';
import React, {ReactElement, useCallback, useMemo, useRef} from 'react';
import {StyleProp, Text, TextStyle} from 'react-native';

import Emoji from '@components/emoji';

import type {MarkdownEmojiRenderer} from '@typings/global/markdown';

type Props = {
    enableEmoji?: boolean;
    enableHardBreak?: boolean;
    enableSoftBreak?: boolean;
    textStyle?: StyleProp<TextStyle>;
    value: string;
};

const RemoveMarkdown = ({enableEmoji, enableHardBreak, enableSoftBreak, textStyle, value}: Props) => {
    const renderEmoji = useCallback(({emojiName, literal}: MarkdownEmojiRenderer) => {
        return (
            <Emoji
                emojiName={emojiName}
                literal={literal}
                testID='markdown_emoji'
                textStyle={textStyle}
            />
        );
    }, [textStyle]);

    const renderBreak = useCallback(() => {
        return '\n';
    }, []);

    const renderText = useCallback(({literal}: {literal: string}) => {
        return <Text style={textStyle}>{literal}</Text>;
    }, [textStyle]);

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
                emoji: enableEmoji ? renderEmoji : renderNull,
                hashtag: Renderer.forwardChildren,
                latexinline: Renderer.forwardChildren,

                paragraph: Renderer.forwardChildren,
                heading: Renderer.forwardChildren,
                codeBlock: renderNull,
                blockQuote: renderNull,

                list: renderNull,
                item: renderNull,

                hardBreak: enableHardBreak ? renderBreak : renderNull,
                thematicBreak: renderNull,
                softBreak: enableSoftBreak ? renderBreak : renderNull,

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
    const renderer = useMemo(createRenderer, [renderText, renderEmoji]);
    const ast = parser.parse(value);

    return renderer.render(ast) as ReactElement;
};

export default RemoveMarkdown;
