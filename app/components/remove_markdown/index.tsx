// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Parser} from 'commonmark';
import Renderer from 'commonmark-react-renderer';
import React, {type ReactElement, type ReactNode, useCallback, useMemo, useRef, useState} from 'react';
import {type NativeSyntheticEvent, type StyleProp, Text, type TextLayoutEventData, type TextStyle, View} from 'react-native';

import Emoji from '@components/emoji';
import {useTheme} from '@context/theme';
import {computeTextStyle, getMarkdownTextStyles} from '@utils/markdown';

import ChannelMention from '../markdown/channel_mention';

import AtMention from './at_mention';

import type {MarkdownBaseRenderer, MarkdownChannelMentionRenderer, MarkdownEmojiRenderer} from '@typings/global/markdown';

type Props = {
    enableEmoji?: boolean;
    enableCodeSpan?: boolean;
    enableHardBreak?: boolean;
    enableSoftBreak?: boolean;
    enableChannelLink?: boolean;
    baseStyle?: StyleProp<TextStyle>;
    numberOfLines?: number;
    separateHeading?: boolean;
    value: string;
};

const filterHeadingContext = (context: string[]) => context.filter((c) => !c.startsWith('heading'));

type HeadingBlockProps = {
    children: ReactNode;
    numberOfLines: number;
    onLineCount: (count: number) => void;
};

const HeadingBlock = ({children, numberOfLines, onLineCount}: HeadingBlockProps) => {
    const handleTextLayout = useCallback((e: NativeSyntheticEvent<TextLayoutEventData>) => {
        if (numberOfLines > 0) {
            onLineCount(Math.min(e.nativeEvent.lines.length, numberOfLines));
        }
    }, [numberOfLines, onLineCount]);

    return (
        <Text
            numberOfLines={numberOfLines || undefined}
            onTextLayout={numberOfLines > 0 ? handleTextLayout : undefined}
        >
            {children}
        </Text>
    );
};

const RemoveMarkdown = ({
    enableEmoji,
    enableChannelLink,
    enableHardBreak,
    enableSoftBreak,
    enableCodeSpan,
    baseStyle,
    numberOfLines,
    separateHeading,
    value,
}: Props) => {
    const theme = useTheme();
    const textStyle = getMarkdownTextStyles(theme);
    const [headingLineCount, setHeadingLineCount] = useState(0);

    const renderText = useCallback(({literal}: {literal: string}) => {
        return <Text style={baseStyle}>{literal}</Text>;
    }, [baseStyle]);

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
    }, [baseStyle, enableEmoji, renderText]);

    const renderBreak = useCallback(() => {
        return '\n';
    }, []);

    const renderAtMention = useCallback(({context, mentionName}: {context: string[]; mentionName: string}) => {
        return (
            <AtMention
                textStyle={computeTextStyle(textStyle, baseStyle, filterHeadingContext(context))}
                mentionName={mentionName}
            />
        );
    }, [baseStyle, textStyle]);

    const renderChannelLink = useCallback(({context, channelName}: MarkdownChannelMentionRenderer) => {
        if (enableChannelLink) {
            return (
                <ChannelMention
                    linkStyle={textStyle.link}
                    textStyle={computeTextStyle(textStyle, baseStyle, filterHeadingContext(context))}
                    channelName={channelName}
                />
            );
        }

        return renderText({literal: `~${channelName}`});
    }, [baseStyle, enableChannelLink, renderText, textStyle]);

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
    }, [enableCodeSpan, textStyle, baseStyle, renderText]);

    const renderHeading = useCallback(({children}: {children: ReactNode}) => {
        if (separateHeading) {
            return (
                <HeadingBlock
                    numberOfLines={numberOfLines ?? 0}
                    onLineCount={setHeadingLineCount}
                >
                    {children}
                </HeadingBlock>
            );
        }
        return <Text>{children}{'\n'}</Text>;
    }, [numberOfLines, separateHeading]);

    const paragraphLines = numberOfLines ? Math.max(0, numberOfLines - headingLineCount) : 0;

    const renderParagraph = useCallback(({children, first}: {children: ReactNode; first: boolean}) => {
        if (separateHeading) {
            if (!first || (numberOfLines && paragraphLines === 0)) {
                return null;
            }
            return <Text numberOfLines={paragraphLines || undefined}>{children}</Text>;
        }
        return <>{children}</>;
    }, [numberOfLines, paragraphLines, separateHeading]);

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
                channelLink: renderChannelLink,
                emoji: renderEmoji,
                hashtag: Renderer.forwardChildren,
                latexinline: Renderer.forwardChildren,

                paragraph: renderParagraph,
                heading: renderHeading,
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

    // Pattern suggested in https://react.dev/reference/react/useRef#avoiding-recreating-the-ref-contents
    const parserRef = useRef<Parser | null>(null);
    if (parserRef.current === null) {
        parserRef.current = new Parser();
    }
    const parser = parserRef.current;

    const renderer = useMemo(createRenderer, [
        renderText,
        renderCodeSpan,
        renderAtMention,
        renderChannelLink,
        renderEmoji,
        renderHeading,
        renderParagraph,
        enableHardBreak,
        renderBreak,
        enableSoftBreak,
    ]);
    const ast = parser.parse(value);

    const rendered = renderer.render(ast) as ReactElement;

    if (separateHeading) {
        return <View>{rendered}</View>;
    }

    return rendered;
};

export default RemoveMarkdown;
