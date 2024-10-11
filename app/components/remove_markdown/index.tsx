// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Parser} from 'commonmark';
import Renderer from 'commonmark-react-renderer';
import React, {type ReactElement, useCallback, useMemo, useRef} from 'react';
import {type StyleProp, Text, type TextStyle} from 'react-native';

import Emoji from '@components/emoji';
import {computeTextStyle} from '@utils/markdown';

import ChannelMention from '../markdown/channel_mention';

import AtMention from './at_mention';

import type {MarkdownBaseRenderer, MarkdownChannelMentionRenderer, MarkdownEmojiRenderer, MarkdownTextStyles} from '@typings/global/markdown';

type Props = {
    enableEmoji?: boolean;
    enableCodeSpan?: boolean;
    enableHardBreak?: boolean;
    enableSoftBreak?: boolean;
    enableChannelLink?: boolean;
    baseStyle?: StyleProp<TextStyle>;
    textStyle?: MarkdownTextStyles;
    value: string;
};

const RemoveMarkdown = ({enableEmoji, enableChannelLink, enableHardBreak, enableSoftBreak, enableCodeSpan, baseStyle, textStyle = {}, value}: Props) => {
    const renderEmoji = useCallback(({emojiName, literal}: MarkdownEmojiRenderer) => {
        if (!enableEmoji) {
            return renderText({literal});
        }

        return (
            <Emoji
                emojiName={emojiName}
                literal={literal}
                testID='markdown_emoji'
                textStyle={baseStyle}
            />
        );
    }, [baseStyle, enableEmoji]);

    const renderBreak = useCallback(() => {
        return '\n';
    }, []);

    const renderText = useCallback(({literal}: {literal: string}) => {
        return <Text style={baseStyle}>{literal}</Text>;
    }, [baseStyle]);

    const renderAtMention = ({context, mentionName}: {context: string[]; mentionName: string}) => {
        return (
            <AtMention
                textStyle={computeTextStyle(textStyle, baseStyle, context)}
                mentionName={mentionName}
            />
        );
    };

    const renderChannelLink = ({context, channelName}: MarkdownChannelMentionRenderer) => {
        return (
            <ChannelMention
                linkStyle={textStyle.link}
                textStyle={computeTextStyle(textStyle, [], context)}
                channelName={channelName}
            />
        );
    };

    const renderCodeSpan = useCallback(({context, literal}: MarkdownBaseRenderer) => {
        if (!enableCodeSpan) {
            return renderText({literal});
        }

        const {code} = textStyle;
        return (
            <Text
                style={computeTextStyle(textStyle, [baseStyle, code], context)}
                testID='markdown_code_span'
            >
                {literal}
            </Text>
        );
    }, [baseStyle, textStyle, enableCodeSpan]);

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
                code: renderCodeSpan,
                link: Renderer.forwardChildren,
                image: renderNull,
                atMention: renderAtMention,
                channelLink: enableChannelLink ? renderChannelLink : Renderer.forwardChildren,
                emoji: renderEmoji,
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
