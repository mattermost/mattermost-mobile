// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {Parser} from 'commonmark';
import Renderer from 'commonmark-react-renderer';
import React from 'react';
import PropTypes from 'prop-types';
import {
    Platform,
    StyleSheet,
    Text,
    View
} from 'react-native';

import AtMention from 'app/components/at_mention';
import ChannelLink from 'app/components/channel_link';
import Emoji from 'app/components/emoji';
import CustomPropTypes from 'app/constants/custom_prop_types';
import {concatStyles} from 'app/utils/theme';

import MarkdownBlockQuote from './markdown_block_quote';
import MarkdownCodeBlock from './markdown_code_block';
import MarkdownLink from './markdown_link';
import MarkdownList from './markdown_list';
import MarkdownListItem from './markdown_list_item';

export default class Markdown extends React.PureComponent {
    static propTypes = {
        baseTextStyle: CustomPropTypes.Style,
        textStyles: PropTypes.object,
        blockStyles: PropTypes.object,
        emojiSizes: PropTypes.object,
        value: PropTypes.string.isRequired,
        onLongPress: PropTypes.func
    };

    static defaultProps = {
        textStyles: {},
        blockStyles: {},
        emojiSizes: {
            ...Platform.select({
                ios: {
                    heading1: 25,
                    heading2: 25,
                    heading3: 25,
                    heading4: 25,
                    heading5: 25,
                    heading6: 25,
                    text: 20
                },
                android: {
                    heading1: 80,
                    heading2: 80,
                    heading3: 80,
                    heading4: 80,
                    heading5: 80,
                    heading6: 80,
                    text: 65
                }
            })
        },
        onLongPress: () => true
    };

    constructor(props) {
        super(props);

        this.parser = new Parser();
        this.renderer = this.createRenderer();
    }

    createRenderer = () => {
        return new Renderer({
            renderers: {
                text: this.renderText,

                emph: Renderer.forwardChildren,
                strong: Renderer.forwardChildren,
                code: this.renderCodeSpan,
                link: this.renderLink,
                image: this.renderImage,
                atMention: this.renderAtMention,
                channelLink: this.renderChannelLink,
                emoji: this.renderEmoji,

                paragraph: this.renderParagraph,
                heading: this.renderHeading,
                codeBlock: this.renderCodeBlock,
                blockQuote: this.renderBlockQuote,

                list: this.renderList,
                item: this.renderListItem,

                hardBreak: this.renderHardBreak,
                thematicBreak: this.renderThematicBreak,
                softBreak: this.renderSoftBreak,

                htmlBlock: this.renderHtml,
                htmlInline: this.renderHtml
            },
            renderParagraphsInLists: true
        });
    }

    computeTextStyle = (baseStyle, context) => {
        return concatStyles(baseStyle, context.map((type) => this.props.textStyles[type]));
    }

    renderText = ({context, literal}) => {
        // Construct the text style based off of the parents of this node since RN's inheritance is limited
        return <Text style={this.computeTextStyle(this.props.baseTextStyle, context)}>{literal}</Text>;
    }

    renderCodeSpan = ({context, literal}) => {
        return <Text style={this.computeTextStyle([this.props.baseTextStyle, this.props.textStyles.code], context)}>{literal}</Text>;
    }

    renderImage = ({children, context, src}) => {
        // TODO This will be properly implemented for PLT-5736
        return (
            <Text style={this.computeTextStyle(this.props.baseTextStyle, context)}>
                {'!['}
                {children}
                {']('}
                {src}
                {')'}
            </Text>
        );
    }

    renderAtMention = ({context, mentionName}) => {
        return (
            <AtMention
                mentionStyle={this.props.textStyles.mention}
                textStyle={this.computeTextStyle(this.props.baseTextStyle, context)}
                mentionName={mentionName}
            />
        );
    }

    renderChannelLink = ({context, channelName}) => {
        return (
            <ChannelLink
                linkStyle={this.props.textStyles.link}
                textStyle={this.computeTextStyle(this.props.baseTextStyle, context)}
                channelName={channelName}
            />
        );
    }

    renderEmoji = ({context, emojiName, literal}) => {
        let size;
        const headingType = context.find((type) => type.startsWith('heading'));
        if (headingType) {
            size = this.props.emojiSizes[headingType];
        } else {
            size = this.props.emojiSizes.text;
        }

        return (
            <Emoji
                emojiName={emojiName}
                literal={literal}
                size={size}
                textStyle={this.computeTextStyle(this.props.baseTextStyle, context)}
            />
        );
    }

    renderParagraph = ({children}) => {
        return (
            <View style={style.block}>
                <Text>
                    {children}
                </Text>
            </View>
        );
    }

    renderHeading = ({children, level}) => {
        return (
            <View style={[style.block, this.props.blockStyles[`heading${level}`]]}>
                <Text>
                    {children}
                </Text>
            </View>
        );
    }

    renderCodeBlock = (props) => {
        // These sometimes include a trailing newline
        const contents = props.literal.replace(/\n$/, '');

        return (
            <MarkdownCodeBlock
                blockStyle={this.props.blockStyles.codeBlock}
                textStyle={concatStyles(this.props.baseTextStyle, this.props.textStyles.codeBlock)}
            >
                {contents}
            </MarkdownCodeBlock>
        );
    }

    renderBlockQuote = ({children, ...otherProps}) => {
        return (
            <MarkdownBlockQuote
                iconStyle={this.props.blockStyles.quoteBlockIcon}
                {...otherProps}
            >
                {children}
            </MarkdownBlockQuote>
        );
    }

    renderList = ({children, start, tight, type}) => {
        return (
            <MarkdownList
                ordered={type !== 'bullet'}
                startAt={start}
                tight={tight}
            >
                {children}
            </MarkdownList>
        );
    }

    renderListItem = ({children, ...otherProps}) => {
        return (
            <MarkdownListItem
                bulletStyle={this.props.baseTextStyle}
                {...otherProps}
            >
                {children}
            </MarkdownListItem>
        );
    }

    renderHardBreak = () => {
        return <Text>{'\n'}</Text>;
    }

    renderThematicBreak = () => {
        return <View style={this.props.blockStyles.horizontalRule}/>;
    }

    renderSoftBreak = () => {
        return <Text>{'\n'}</Text>;
    }

    renderHtml = (props) => {
        let rendered = this.renderText(props);

        if (props.isBlock) {
            rendered = (
                <View style={style.block}>
                    {rendered}
                </View>
            );
        }

        return rendered;
    }

    renderLink = ({children, href}) => {
        return (
            <MarkdownLink
                href={href}
                onLongPress={this.props.onLongPress}
            >
                {children}
            </MarkdownLink>
        );
    }

    render() {
        const ast = this.parser.parse(this.props.value);

        return <View>{this.renderer.render(ast)}</View>;
    }
}

const style = StyleSheet.create({
    block: {
        alignItems: 'flex-start',
        flexDirection: 'row',
        flexWrap: 'wrap'
    }
});
