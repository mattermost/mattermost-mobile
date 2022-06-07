// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Parser} from 'commonmark';
import Renderer from 'commonmark-react-renderer';
import React, {ReactElement, useRef} from 'react';
import {useIntl} from 'react-intl';
import {GestureResponderEvent, StyleProp, Text, TextStyle} from 'react-native';

import AtMention from '@components/markdown/at_mention';
import MarkdownLink from '@components/markdown/markdown_link';
import {useTheme} from '@context/theme';
import {getMarkdownBlockStyles, getMarkdownTextStyles} from '@utils/markdown';
import {concatStyles, changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import type {PrimitiveType} from 'intl-messageformat';

type Props = {
    baseTextStyle: StyleProp<TextStyle>;
    channelId?: string;
    defaultMessage: string;
    id: string;
    location: string;
    onPostPress?: (e: GestureResponderEvent) => void;
    style?: StyleProp<TextStyle>;
    textStyles: {
        [key: string]: TextStyle;
    };
    values?: Record<string, PrimitiveType>;
};

const TARGET_BLANK_URL_PREFIX = '!';

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        block: {
            alignItems: 'flex-start',
            flexDirection: 'row',
            flexWrap: 'wrap',
        },
        message: {
            color: changeOpacity(theme.centerChannelColor, 0.8),
            fontSize: 16,
            lineHeight: 20,
        },
        atMentionOpacity: {
            opacity: 1,
        },
    };
});

const FormattedMarkdownText = ({baseTextStyle, channelId, defaultMessage, id, location, onPostPress, style, textStyles, values}: Props) => {
    const intl = useIntl();
    const theme = useTheme();
    const styles = getStyleSheet(theme);
    const messageDescriptor = {id, defaultMessage};
    const message = intl.formatMessage(messageDescriptor, values);
    const txtStyles = getMarkdownTextStyles(theme);

    const createRenderer = () => {
        const renderers: any = {
            text: renderText,
            emph: Renderer.forwardChildren,
            strong: Renderer.forwardChildren,
            code: renderCodeSpan,
            link: renderLink,
            hardBreak: renderBreak,
            softBreak: renderBreak,
            paragraph: renderParagraph,
            del: Renderer.forwardChildren,
            html_inline: renderHTML,
            html_block: renderHTML,
            atMention: renderAtMention,
        };

        return new Renderer({
            renderers,
            renderParagraphsInLists: true,
        });
    };

    const computeTextStyle = (base: StyleProp<TextStyle>, context: string[]) => {
        return concatStyles(base, context.map((type) => txtStyles[type]));
    };

    const renderAtMention = ({context, mentionName}: {context: string[]; mentionName: string}) => {
        return (
            <AtMention
                channelId={channelId}
                mentionStyle={textStyles.mention}
                mentionName={mentionName}
                location={location}
                onPostPress={onPostPress}
                textStyle={[computeTextStyle(baseTextStyle, context), styles.atMentionOpacity]}
            />
        );
    };

    const renderBreak = () => {
        return <Text>{'\n'}</Text>;
    };

    const renderCodeSpan = ({context, literal}: {context: string[]; literal: string}) => {
        const computed = computeTextStyle([styles.message, txtStyles.code], context);
        return <Text style={computed}>{literal}</Text>;
    };

    const renderHTML = (props: never) => {
        console.warn(`HTML used in FormattedMarkdownText component with id ${id}`); // eslint-disable-line no-console
        return renderText(props);
    };

    const renderLink = ({children, href}: {children: ReactElement; href: string}) => {
        const url = href[0] === TARGET_BLANK_URL_PREFIX ? href.substring(1, href.length) : href;
        return <MarkdownLink href={url}>{children}</MarkdownLink>;
    };

    const renderParagraph = ({children, first}: {children: ReactElement; first: boolean}) => {
        const blockStyle = [styles.block];
        if (!first) {
            const blockS = getMarkdownBlockStyles(theme);
            blockStyle.push(blockS.adjacentParagraph);
        }

        return (
            <Text style={blockStyle}>
                {children}
            </Text>
        );
    };

    const renderText = ({context, literal}: {context: string[]; literal: string}) => {
        const computed = computeTextStyle(style || styles.message, context);
        return <Text style={computed}>{literal}</Text>;
    };

    const parser = useRef(new Parser()).current;
    const renderer = useRef(createRenderer()).current;
    const ast = parser.parse(message);

    return renderer.render(ast) as ReactElement;
};

export default FormattedMarkdownText;
