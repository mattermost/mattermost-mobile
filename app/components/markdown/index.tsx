// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Parser, Node} from 'commonmark';
import Renderer from 'commonmark-react-renderer';
import React, {PureComponent, ReactElement} from 'react';
import {GestureResponderEvent, Platform, StyleProp, StyleSheet, Text, TextStyle, View, ViewStyle} from 'react-native';

import Emoji from '@components/emoji';
import FormattedText from '@components/formatted_text';
import Hashtag from '@components/markdown/hashtag';
import {blendColors, concatStyles, makeStyleSheetFromTheme} from '@utils/theme';
import {getScheme} from '@utils/url';

import AtMention from './at_mention';
import ChannelMention, {ChannelMentions} from './channel_mention';
import MarkdownBlockQuote from './markdown_block_quote';
import MarkdownCodeBlock from './markdown_code_block';
import MarkdownImage from './markdown_image';
import MarkdownLink from './markdown_link';
import MarkdownList from './markdown_list';
import MarkdownListItem from './markdown_list_item';
import MarkdownTable from './markdown_table';
import MarkdownTableImage from './markdown_table_image';
import MarkdownTableRow, {MarkdownTableRowProps} from './markdown_table_row';
import MarkdownTableCell, {MarkdownTableCellProps} from './markdown_table_cell';
import {addListItemIndices, combineTextNodes, highlightMentions, pullOutImages} from './transform';

type MarkdownProps = {
    autolinkedUrlSchemes?: string[];
    baseTextStyle: StyleProp<TextStyle>;
    blockStyles: {
        adjacentParagraph: ViewStyle;
        horizontalRule: ViewStyle;
        quoteBlockIcon: TextStyle;
    };
    channelMentions?: ChannelMentions;
    disableAtMentions?: boolean;
    disableChannelLink?: boolean;
    disableGallery?: boolean;
    disableHashtags?: boolean;
    imagesMetadata?: Record<string, PostImage>;
    isEdited?: boolean;
    isReplyPost?: boolean;
    isSearchResult?: boolean;
    mentionKeys?: UserMentionKey[];
    minimumHashtagLength?: number;
    onPostPress?: (event: GestureResponderEvent) => void;
    postId?: string;
    textStyles: {
        [key: string]: TextStyle;
    };
    theme: Theme;
    value: string | number;
}

class Markdown extends PureComponent<MarkdownProps> {
    static defaultProps = {
        textStyles: {},
        blockStyles: {},
        disableHashtags: false,
        disableAtMentions: false,
        disableChannelLink: false,
        disableGallery: false,
        value: '',
        minimumHashtagLength: 3,
        mentionKeys: [],
    };

    private parser: Parser;
    private renderer: Renderer.Renderer;

    constructor(props: MarkdownProps) {
        super(props);

        this.parser = this.createParser();
        this.renderer = this.createRenderer();
    }

    createParser = () => {
        return new Parser({
            urlFilter: this.urlFilter,
            minimumHashtagLength: this.props.minimumHashtagLength,
        });
    };

    urlFilter = (url: string) => {
        const scheme = getScheme(url);
        return !scheme || this.props.autolinkedUrlSchemes?.indexOf(scheme) !== -1;
    };

    createRenderer = () => {
        const renderers: any = {
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
            hashtag: this.renderHashtag,

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
            table_row: this.renderTableRow,
            table_cell: this.renderTableCell,

            mention_highlight: Renderer.forwardChildren,

            editedIndicator: this.renderEditedIndicator,
        };

        return new Renderer({
            renderers,
            renderParagraphsInLists: true,
            getExtraPropsForNode: this.getExtraPropsForNode,
        });
    };

    getExtraPropsForNode = (node: any) => {
        const extraProps: Record<string, any> = {
            continue: node.continue,
            index: node.index,
        };

        if (node.type === 'image') {
            extraProps.reactChildren = node.react.children;
            extraProps.linkDestination = node.linkDestination;
        }

        return extraProps;
    };

    computeTextStyle = (baseStyle: StyleProp<TextStyle>, context: any) => {
        const {textStyles} = this.props;
        type TextType = keyof typeof textStyles;
        const contextStyles: TextStyle[] = context.map((type: any) => textStyles[type as TextType]).filter((f: any) => f !== undefined);
        return contextStyles.length ? concatStyles(baseStyle, contextStyles) : baseStyle;
    };

    renderText = ({context, literal}: any) => {
        if (context.indexOf('image') !== -1) {
            // If this text is displayed, it will be styled by the image component
            return (
                <Text testID='markdown_text'>
                    {literal}
                </Text>
            );
        }

        // Construct the text style based off of the parents of this node since RN's inheritance is limited
        const style = this.computeTextStyle(this.props.baseTextStyle, context);

        return (
            <Text
                testID='markdown_text'
                style={style}
            >
                {literal}
            </Text>
        );
    };

    renderCodeSpan = ({context, literal}: {context: any; literal: any}) => {
        const {baseTextStyle, textStyles: {code}} = this.props;
        return <Text style={this.computeTextStyle([baseTextStyle, code], context)}>{literal}</Text>;
    };

    renderImage = ({linkDestination, context, src}: {linkDestination?: string; context: string[]; src: string}) => {
        if (!this.props.imagesMetadata) {
            return null;
        }

        if (context.indexOf('table') !== -1) {
            // We have enough problems rendering images as is, so just render a link inside of a table
            return (
                <MarkdownTableImage
                    disabled={this.props.disableGallery}
                    imagesMetadata={this.props.imagesMetadata}
                    postId={this.props.postId!}
                    source={src}
                />
            );
        }

        return (
            <MarkdownImage
                disabled={this.props.disableGallery}
                errorTextStyle={[this.computeTextStyle(this.props.baseTextStyle, context), this.props.textStyles.error]}
                linkDestination={linkDestination}
                imagesMetadata={this.props.imagesMetadata}
                isReplyPost={this.props.isReplyPost}
                postId={this.props.postId!}
                source={src}
            />
        );
    };

    renderAtMention = ({context, mentionName}: {context: string[]; mentionName: string}) => {
        if (this.props.disableAtMentions) {
            return this.renderText({context, literal: `@${mentionName}`});
        }

        const style = getStyleSheet(this.props.theme);

        return (
            <AtMention
                mentionStyle={this.props.textStyles.mention}
                textStyle={[this.computeTextStyle(this.props.baseTextStyle, context), style.atMentionOpacity]}
                isSearchResult={this.props.isSearchResult}
                mentionName={mentionName}
                onPostPress={this.props.onPostPress}
                mentionKeys={this.props.mentionKeys || []}
            />
        );
    };

    renderChannelLink = ({context, channelName}: {context: string[]; channelName: string}) => {
        if (this.props.disableChannelLink) {
            return this.renderText({context, literal: `~${channelName}`});
        }

        return (
            <ChannelMention
                linkStyle={this.props.textStyles.link}
                textStyle={this.computeTextStyle(this.props.baseTextStyle, context)}
                channelName={channelName}
                channelMentions={this.props.channelMentions}
            />
        );
    };

    renderEmoji = ({context, emojiName, literal}: {context: string[]; emojiName: string; literal: string}) => {
        let customEmojiStyle;

        if (Platform.OS === 'android') {
            const flat = StyleSheet.flatten(this.props.baseTextStyle);

            if (flat) {
                const size = Math.abs(((flat.lineHeight || 0) - (flat.fontSize || 0))) / 2;
                if (size > 0) {
                    customEmojiStyle = {marginRight: size, top: size};
                }
            }
        }
        return (
            <Emoji
                emojiName={emojiName}
                literal={literal}
                testID='markdown_emoji'
                textStyle={this.computeTextStyle(this.props.baseTextStyle, context)}
                customEmojiStyle={customEmojiStyle}
            />
        );
    };

    renderHashtag = ({context, hashtag}: {context: string[]; hashtag: string}) => {
        if (this.props.disableHashtags) {
            return this.renderText({context, literal: `#${hashtag}`});
        }

        return (
            <Hashtag
                hashtag={hashtag}
                linkStyle={this.props.textStyles.link}
            />
        );
    };

    renderParagraph = ({children, first}: {children: ReactElement[]; first: boolean}) => {
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
    };

    renderHeading = ({children, level}: {children: ReactElement; level: string}) => {
        const {textStyles} = this.props;
        const containerStyle = [
            getStyleSheet(this.props.theme).block,
            textStyles[`heading${level}`],
        ];
        const textStyle = textStyles[`heading${level}Text`];
        return (
            <View style={containerStyle}>
                <Text style={textStyle}>
                    {children}
                </Text>
            </View>
        );
    };

    renderCodeBlock = (props: any) => {
        // These sometimes include a trailing newline
        const content = props.literal.replace(/\n$/, '');

        return (
            <MarkdownCodeBlock
                content={content}
                language={props.language}
                textStyle={this.props.textStyles.codeBlock}
            />
        );
    };

    renderBlockQuote = ({children, ...otherProps}: any) => {
        return (
            <MarkdownBlockQuote
                iconStyle={this.props.blockStyles.quoteBlockIcon}
                {...otherProps}
            >
                {children}
            </MarkdownBlockQuote>
        );
    };

    renderList = ({children, start, tight, type}: any) => {
        return (
            <MarkdownList
                ordered={type !== 'bullet'}
                start={start}
                tight={tight}
            >
                {children}
            </MarkdownList>
        );
    };

    renderListItem = ({children, context, ...otherProps}: any) => {
        const level = context.filter((type: string) => type === 'list').length;

        return (
            <MarkdownListItem
                bulletStyle={this.props.baseTextStyle}
                level={level}
                {...otherProps}
            >
                {children}
            </MarkdownListItem>
        );
    };

    renderHardBreak = () => {
        return <Text>{'\n'}</Text>;
    };

    renderThematicBreak = () => {
        return (
            <View
                style={this.props.blockStyles.horizontalRule}
                testID='markdown_thematic_break'
            />
        );
    };

    renderSoftBreak = () => {
        return <Text>{'\n'}</Text>;
    };

    renderHtml = (props: any) => {
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
    };

    renderTable = ({children, numColumns}: {children: ReactElement; numColumns: number}) => {
        return (
            <MarkdownTable
                numColumns={numColumns}
                theme={this.props.theme}
            >
                {children}
            </MarkdownTable>
        );
    };

    renderTableRow = (args: MarkdownTableRowProps) => {
        return <MarkdownTableRow {...args}/>;
    };

    renderTableCell = (args: MarkdownTableCellProps) => {
        return <MarkdownTableCell {...args}/>;
    };

    renderLink = ({children, href}: {children: ReactElement; href: string}) => {
        return (
            <MarkdownLink href={href}>
                {children}
            </MarkdownLink>
        );
    };

    renderEditedIndicator = ({context}: {context: string[]}) => {
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
    };

    render() {
        let ast = this.parser.parse(this.props.value.toString());

        ast = combineTextNodes(ast);
        ast = addListItemIndices(ast);
        ast = pullOutImages(ast);
        if (this.props.mentionKeys) {
            ast = highlightMentions(ast, this.props.mentionKeys);
        }

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
        atMentionOpacity: {
            opacity: 1,
        },
    };
});

export default Markdown;
