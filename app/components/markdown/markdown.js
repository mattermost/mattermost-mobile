// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {Parser, Node} from 'commonmark';
import Renderer from 'commonmark-react-renderer';
import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {
    Platform,
    Text,
    View,
} from 'react-native';

import AtMention from 'app/components/at_mention';
import ChannelLink from 'app/components/channel_link';
import Emoji from 'app/components/emoji';
import FormattedText from 'app/components/formatted_text';
import CustomPropTypes from 'app/constants/custom_prop_types';
import {blendColors, concatStyles, makeStyleSheetFromTheme} from 'app/utils/theme';

import MarkdownBlockQuote from './markdown_block_quote';
import MarkdownCodeBlock from './markdown_code_block';
import MarkdownImage from './markdown_image';
import MarkdownLink from './markdown_link';
import MarkdownList from './markdown_list';
import MarkdownListItem from './markdown_list_item';
import MarkdownTable from './markdown_table';
import MarkdownTableImage from './markdown_table_image';
import MarkdownTableRow from './markdown_table_row';
import MarkdownTableCell from './markdown_table_cell';
import {addListItemIndices, pullOutImages} from './transform';

export default class Markdown extends PureComponent {
    static propTypes = {
        baseTextStyle: CustomPropTypes.Style,
        blockStyles: PropTypes.object,
        isEdited: PropTypes.bool,
        isSearchResult: PropTypes.bool,
        navigator: PropTypes.object.isRequired,
        onLongPress: PropTypes.func,
        onPermalinkPress: PropTypes.func,
        onPostPress: PropTypes.func,
        textStyles: PropTypes.object,
        theme: PropTypes.object.isRequired,
        value: PropTypes.string.isRequired,
    };

    static defaultProps = {
        textStyles: {},
        blockStyles: {},
        onLongPress: () => true,
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
                del: Renderer.forwardChildren,
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
                htmlInline: this.renderHtml,

                table: this.renderTable,
                table_row: MarkdownTableRow,
                table_cell: MarkdownTableCell,

                editedIndicator: this.renderEditedIndicator,
            },
            renderParagraphsInLists: true,
            getExtraPropsForNode: this.getExtraPropsForNode,
        });
    }

    getExtraPropsForNode = (node) => {
        const extraProps = {
            continue: node.continue,
            index: node.index,
        };

        if (node.type === 'image') {
            extraProps.reactChildren = node.react.children;
            extraProps.linkDestination = node.linkDestination;
        }

        return extraProps;
    }

    computeTextStyle = (baseStyle, context) => {
        return concatStyles(baseStyle, context.map((type) => this.props.textStyles[type]));
    }

    renderText = ({context, literal}) => {
        if (context.indexOf('image') !== -1) {
            // If this text is displayed, it will be styled by the image component
            return <Text>{literal}</Text>;
        }
        const style = this.computeTextStyle(this.props.baseTextStyle, context);

        // Construct the text style based off of the parents of this node since RN's inheritance is limited
        return <Text style={style}>{literal}</Text>;
    }

    renderCodeSpan = ({context, literal}) => {
        return <Text style={this.computeTextStyle([this.props.baseTextStyle, this.props.textStyles.code], context)}>{literal}</Text>;
    }

    renderImage = ({linkDestination, reactChildren, context, src}) => {
        if (context.indexOf('table') !== -1) {
            // We have enough problems rendering images as is, so just render a link inside of a table
            return (
                <MarkdownTableImage
                    linkDestination={linkDestination}
                    onLongPress={this.props.onLongPress}
                    source={src}
                    textStyle={[this.computeTextStyle(this.props.baseTextStyle, context), this.props.textStyles.link]}
                    navigator={this.props.navigator}
                >
                    {reactChildren}
                </MarkdownTableImage>
            );
        }

        return (
            <MarkdownImage
                linkDestination={linkDestination}
                navigator={this.props.navigator}
                onLongPress={this.props.onLongPress}
                source={src}
                errorTextStyle={[this.computeTextStyle(this.props.baseTextStyle, context), this.props.textStyles.error]}
            >
                {reactChildren}
            </MarkdownImage>
        );
    }

    renderAtMention = ({context, mentionName}) => {
        return (
            <AtMention
                mentionStyle={this.props.textStyles.mention}
                textStyle={this.computeTextStyle(this.props.baseTextStyle, context)}
                isSearchResult={this.props.isSearchResult}
                mentionName={mentionName}
                onLongPress={this.props.onLongPress}
                onPostPress={this.props.onPostPress}
                navigator={this.props.navigator}
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
        return (
            <Emoji
                emojiName={emojiName}
                literal={literal}
                textStyle={this.computeTextStyle(this.props.baseTextStyle, context)}
            />
        );
    }

    renderParagraph = ({children, first}) => {
        if (!children || children.length === 0) {
            return null;
        }

        const style = getStyleSheet(this.props.theme);
        const blockStyle = [style.block];
        if (!first) {
            blockStyle.push(this.props.blockStyles.adjacentParagraph);
        }
        return (
            <View style={blockStyle}>
                <Text>
                    {children}
                </Text>
            </View>
        );
    }

    renderHeading = ({children, level}) => {
        const containerStyle = [
            getStyleSheet(this.props.theme).block,
            this.props.blockStyles[`heading${level}`],
        ];
        const textStyle = this.props.blockStyles[`heading${level}Text`];
        return (
            <View style={containerStyle}>
                <Text style={textStyle}>
                    {children}
                </Text>
            </View>
        );
    }

    renderCodeBlock = (props) => {
        // These sometimes include a trailing newline
        const content = props.literal.replace(/\n$/, '');

        return (
            <MarkdownCodeBlock
                navigator={this.props.navigator}
                content={content}
                language={props.language}
                textStyle={this.props.textStyles.codeBlock}
                onLongPress={this.props.onLongPress}
            />
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
                start={start}
                tight={tight}
            >
                {children}
            </MarkdownList>
        );
    }

    renderListItem = ({children, context, ...otherProps}) => {
        const level = context.filter((type) => type === 'list').length;

        return (
            <MarkdownListItem
                bulletStyle={this.props.baseTextStyle}
                level={level}
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
            const style = getStyleSheet(this.props.theme);

            rendered = (
                <View style={style.block}>
                    {rendered}
                </View>
            );
        }

        return rendered;
    }

    renderTable = ({children}) => {
        return (
            <MarkdownTable navigator={this.props.navigator}>
                {children}
            </MarkdownTable>
        );
    }

    renderLink = ({children, href}) => {
        return (
            <MarkdownLink
                href={href}
                onLongPress={this.props.onLongPress}
                onPermalinkPress={this.props.onPermalinkPress}
            >
                {children}
            </MarkdownLink>
        );
    }

    renderEditedIndicator = ({context}) => {
        let spacer = '';
        if (context[0] === 'paragraph') {
            spacer = ' ';
        }

        const style = getStyleSheet(this.props.theme);
        const styles = [
            this.props.baseTextStyle,
            style.editedIndicatorText,
        ];

        return (
            <Text
                style={styles}
            >
                {spacer}
                <FormattedText
                    id='post_message_view.edited'
                    defaultMessage='(edited)'
                />
            </Text>
        );
    }

    render() {
        let ast = this.parser.parse(this.props.value);

        ast = addListItemIndices(ast);
        ast = pullOutImages(ast);

        if (this.props.isEdited) {
            const editIndicatorNode = new Node('edited_indicator');
            if (ast.lastChild && ['heading', 'paragraph'].includes(ast.lastChild.type)) {
                ast.lastChild.appendChild(editIndicatorNode);
            } else {
                const node = new Node('paragraph');
                node.appendChild(editIndicatorNode);

                ast.appendChild(node);
            }
        }

        return this.renderer.render(ast);
    }
}

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
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
    };
});
