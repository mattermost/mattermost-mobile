// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Node, Parser} from 'commonmark';
import Renderer from 'commonmark-react-renderer';
import React, {type ReactElement, useRef} from 'react';
import {type StyleProp, StyleSheet, Text, type TextStyle, View} from 'react-native';

import EditedIndicator from '@components/EditedIndicator';
import Emoji from '@components/emoji';
import {useTheme} from '@context/theme';

type JumboEmojiProps = {
    baseTextStyle: StyleProp<TextStyle>;
    isEdited?: boolean;
    value: string;
}

const style = StyleSheet.create({
    block: {
        alignItems: 'flex-start',
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    jumboEmoji: {
        fontSize: 50,
        lineHeight: 60,
    },
    newLine: {
        lineHeight: 60,
    },
});

const JumboEmoji = ({baseTextStyle, isEdited, value}: JumboEmojiProps) => {
    const theme = useTheme();

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
        return (
            <EditedIndicator
                baseTextStyle={baseTextStyle}
                theme={theme}
                context={context}
                iconSize={14}
                checkHeadings={false}
                testID='edited_indicator'
            />
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
