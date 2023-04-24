// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Node, Parser} from 'commonmark';
import Renderer from 'commonmark-react-renderer';
import React, {type ReactElement, useRef} from 'react';
import {Platform, type StyleProp, Text, type TextStyle, View} from 'react-native';

import Emoji from '@components/emoji';
import FormattedText from '@components/formatted_text';
import {useTheme} from '@context/theme';
import {blendColors, makeStyleSheetFromTheme} from '@utils/theme';

type JumboEmojiProps = {
    baseTextStyle: StyleProp<TextStyle>;
    isEdited?: boolean;
    value: string;
}

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    // Android has trouble giving text transparency depending on how it's nested,
    // so we calculate the resulting colour manually
    const editedOpacity = Platform.select({
        ios: 0.3,
        android: 1.0,
    });
    const editedColor = Platform.select({
        ios: theme.centerChannelColor,
        android: blendColors(theme.centerChannelBg, theme.centerChannelColor, 0.3),
    });

    return {
        block: {
            alignItems: 'flex-start',
            flexDirection: 'row',
            flexWrap: 'wrap',
        },
        editedIndicatorText: {
            color: editedColor,
            opacity: editedOpacity,
        },
        jumboEmoji: {
            fontSize: 50,
            lineHeight: 60,
        },
        newLine: {
            lineHeight: 60,
        },
    };
});

const JumboEmoji = ({baseTextStyle, isEdited, value}: JumboEmojiProps) => {
    const theme = useTheme();
    const style = getStyleSheet(theme);

    const renderEmoji = ({emojiName, literal}: {context: string[]; emojiName: string; literal: string}) => {
        return (
            <View>
                <Emoji
                    emojiName={emojiName}
                    literal={literal}
                    testID='markdown_emoji'
                    textStyle={[baseTextStyle, style.jumboEmoji]}
                />
            </View>
        );
    };

    const renderParagraph = ({children}: {children: ReactElement}) => {
        return (
            <View style={style.block}><Text>{children}</Text></View>
        );
    };

    const renderText = ({literal}: {literal: string}) => {
        return renderEmoji({emojiName: literal, literal, context: []});
    };

    const renderNewLine = () => {
        return <Text style={[baseTextStyle, style.newLine]}>{'\n'}</Text>;
    };

    const renderEditedIndicator = ({context}: {context: string[]}) => {
        let spacer = '';
        if (context[0] === 'paragraph') {
            spacer = ' ';
        }

        const styles = [
            baseTextStyle,
            style.editedIndicatorText,
        ];

        return (
            <Text
                style={styles}
                testID='edited_indicator'
            >
                {spacer}
                <FormattedText
                    id='post_message_view.edited'
                    defaultMessage='(edited)'
                />
            </Text>
        );
    };

    const createRenderer = () => {
        const renderers: any = {
            editedIndicator: renderEditedIndicator,
            emoji: renderEmoji,
            paragraph: renderParagraph,
            document: renderParagraph,
            text: renderText,
            hardbreak: renderNewLine,
            softBreak: renderNewLine,
        };

        return new Renderer({
            renderers,
            renderParagraphsInLists: true,
        });
    };

    const parser = useRef(new Parser()).current;
    const renderer = useRef(createRenderer()).current;
    const ast = parser.parse(value.replace(/\n*$/, ''));

    if (isEdited) {
        const editIndicatorNode = new Node('edited_indicator');
        if (ast.lastChild && ['heading', 'paragraph'].includes(ast.lastChild.type)) {
            ast.appendChild(editIndicatorNode);
        } else {
            const node = new Node('paragraph');
            node.appendChild(editIndicatorNode);

            ast.appendChild(node);
        }
    }

    return renderer.render(ast) as ReactElement;
};

export default JumboEmoji;
