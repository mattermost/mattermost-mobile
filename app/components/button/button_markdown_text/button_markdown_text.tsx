// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Parser} from 'commonmark';
import Renderer from 'commonmark-react-renderer';
import React, {type ReactElement, useCallback, useMemo, useRef} from 'react';
import {StyleSheet, Text, type TextStyle, View} from 'react-native';

import Emoji from '@components/emoji';
import {computeTextStyle, getMarkdownTextStyles} from '@utils/markdown';

import type {MarkdownBaseRenderer, MarkdownChannelMentionRenderer, MarkdownEmojiRenderer} from '@typings/global/markdown';

type ButtonMarkdownTextProps = {
    baseStyle: TextStyle;
    theme: Theme;
    value: string;
    maxNodes: number;
    testID?: string;
};

const styles = StyleSheet.create({
    container: {
        alignItems: 'flex-start',
        flexDirection: 'row',
        flexShrink: 1,
        flexWrap: 'wrap',
    },
});

const ButtonMarkdownText = ({baseStyle, theme, value, maxNodes, testID}: ButtonMarkdownTextProps) => {
    const markdownTextStyles = useMemo(() => getMarkdownTextStyles(theme), [theme]);

    const renderText = useCallback(({context, literal}: MarkdownBaseRenderer) => {
        return (
            <Text style={computeTextStyle(markdownTextStyles, baseStyle, context)}>
                {literal}
            </Text>
        );
    }, [baseStyle, markdownTextStyles]);

    const renderEmoji = useCallback(({emojiName, literal}: MarkdownEmojiRenderer) => {
        return (
            <Emoji
                emojiName={emojiName}
                literal={literal}
                textStyle={baseStyle}
            />
        );
    }, [baseStyle]);

    const renderCodeSpan = useCallback(({context, literal}: MarkdownBaseRenderer) => {
        return (
            <Text style={computeTextStyle(markdownTextStyles, [baseStyle, markdownTextStyles.code], context)}>
                {literal}
            </Text>
        );
    }, [baseStyle, markdownTextStyles]);

    const renderAtMention = useCallback(({context, mentionName}: {context: string[]; mentionName: string}) => {
        return renderText({context, literal: `@${mentionName}`});
    }, [renderText]);

    const renderChannelLink = useCallback(({context, channelName}: MarkdownChannelMentionRenderer) => {
        return renderText({context, literal: `~${channelName}`});
    }, [renderText]);

    const renderHashtag = useCallback(({context, hashtag}: {context: string[]; hashtag: string}) => {
        return renderText({context, literal: hashtag});
    }, [renderText]);

    const renderLink = useCallback(({children}: {children: ReactElement}) => {
        return children;
    }, []);

    const renderInlineBreak = useCallback(() => {
        return <Text>{' '}</Text>;
    }, []);

    const renderParagraph = useCallback(({children}: {children: ReactElement}) => {
        return <Text>{children}</Text>;
    }, []);

    const renderNull = useCallback(() => {
        return null;
    }, []);

    const renderer = useMemo(() => {
        return new Renderer({
            renderers: {
                text: renderText,
                emph: Renderer.forwardChildren,
                strong: Renderer.forwardChildren,
                del: Renderer.forwardChildren,
                code: renderCodeSpan,
                link: renderLink,
                emoji: renderEmoji,
                atMention: renderAtMention,
                channelLink: renderChannelLink,
                hashtag: renderHashtag,
                hardBreak: renderInlineBreak,
                softBreak: renderInlineBreak,
                paragraph: renderParagraph,
                image: renderNull,
                heading: renderNull,
                codeBlock: renderNull,
                blockQuote: renderNull,
                list: renderNull,
                item: renderNull,
                thematicBreak: renderNull,
                htmlBlock: renderNull,
                htmlInline: renderNull,
                table: renderNull,
                table_row: renderNull,
                table_cell: renderNull,
                latexInline: renderNull,
                inline_entity_link: renderNull,
                mention_highlight: Renderer.forwardChildren,
                search_highlight: Renderer.forwardChildren,
                highlight_without_notification: Renderer.forwardChildren,
                checkbox: renderNull,
                editedIndicator: renderNull,
            } as Record<string, unknown>,
            maxNodes,
        });
    }, [
        renderAtMention,
        renderChannelLink,
        renderCodeSpan,
        renderEmoji,
        renderHashtag,
        renderInlineBreak,
        renderLink,
        renderNull,
        renderParagraph,
        renderText,
        maxNodes,
    ]);

    const parserRef = useRef<Parser | null>(null);
    if (parserRef.current === null) {
        parserRef.current = new Parser();
    }

    const output = useMemo(() => {
        const ast = parserRef.current!.parse(value);
        return renderer.render(ast) as ReactElement;
    }, [renderer, value]);

    return (
        <View
            style={styles.container}
            testID={testID}
        >
            {output}
        </View>
    );
};

export default ButtonMarkdownText;
