// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useManagedConfig} from '@mattermost/react-native-emm';
import {Parser, Node} from 'commonmark';
import Renderer from 'commonmark-react-renderer';
import React, {type ReactElement, useMemo, useRef} from 'react';
import {Dimensions, type GestureResponderEvent, Platform, type StyleProp, StyleSheet, Text, type TextStyle, View, type ViewStyle} from 'react-native';

import CompassIcon from '@components/compass_icon';
import Emoji from '@components/emoji';
import FormattedText from '@components/formatted_text';
import {computeTextStyle} from '@utils/markdown';
import {blendColors, changeOpacity, concatStyles, makeStyleSheetFromTheme} from '@utils/theme';
import {getScheme} from '@utils/url';

import AtMention from './at_mention';
import ChannelMention, {type ChannelMentions} from './channel_mention';
import Hashtag from './hashtag';
import MarkdownBlockQuote from './markdown_block_quote';
import MarkdownCodeBlock from './markdown_code_block';
import MarkdownImage from './markdown_image';
import MarkdownLatexCodeBlock from './markdown_latex_block';
import MarkdownLatexInline from './markdown_latex_inline';
import MarkdownLink from './markdown_link';
import MarkdownList from './markdown_list';
import MarkdownListItem from './markdown_list_item';
import MarkdownTable from './markdown_table';
import MarkdownTableCell, {type MarkdownTableCellProps} from './markdown_table_cell';
import MarkdownTableImage from './markdown_table_image';
import MarkdownTableRow, {type MarkdownTableRowProps} from './markdown_table_row';
import {addListItemIndices, combineTextNodes, highlightMentions, highlightWithoutNotification, highlightSearchPatterns, parseTaskLists, pullOutImages} from './transform';

import type {
    MarkdownAtMentionRenderer, MarkdownBaseRenderer, MarkdownBlockStyles, MarkdownChannelMentionRenderer,
    MarkdownEmojiRenderer, MarkdownImageRenderer, MarkdownLatexRenderer, MarkdownTextStyles, SearchPattern, UserMentionKey, HighlightWithoutNotificationKey,
} from '@typings/global/markdown';

type MarkdownProps = {
    autolinkedUrlSchemes?: string[];
    baseTextStyle: StyleProp<TextStyle>;
    baseParagraphStyle?: StyleProp<TextStyle>;
    blockStyles?: MarkdownBlockStyles;
    channelId?: string;
    channelMentions?: ChannelMentions;
    disableAtChannelMentionHighlight?: boolean;
    disableAtMentions?: boolean;
    disableBlockQuote?: boolean;
    disableChannelLink?: boolean;
    disableCodeBlock?: boolean;
    disableGallery?: boolean;
    disableHashtags?: boolean;
    disableHeading?: boolean;
    disableQuotes?: boolean;
    disableTables?: boolean;
    enableLatex: boolean;
    enableInlineLatex: boolean;
    highlightKeys?: HighlightWithoutNotificationKey[];
    imagesMetadata?: Record<string, PostImage | undefined>;
    isEdited?: boolean;
    isReplyPost?: boolean;
    isSearchResult?: boolean;
    layoutHeight?: number;
    layoutWidth?: number;
    location: string;
    maxNodes: number;
    mentionKeys?: UserMentionKey[];
    minimumHashtagLength?: number;
    onPostPress?: (event: GestureResponderEvent) => void;
    postId?: string;
    searchPatterns?: SearchPattern[];
    textStyles?: MarkdownTextStyles;
    theme: Theme;
    value?: string;
    onLinkLongPress?: (url?: string) => void;
    isUnsafeLinksPost?: boolean;
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
        maxNodesWarning: {
            color: theme.errorTextColor,
        },
        atMentionOpacity: {
            opacity: 1,
        },
        bold: {
            fontWeight: '600',
        },
    };
});

const getExtraPropsForNode = (node: any) => {
    const extraProps: Record<string, any> = {
        continue: node.continue,
        index: node.index,
    };

    if (node.type === 'image') {
        extraProps.reactChildren = node.react.children;
        extraProps.linkDestination = node.linkDestination;
        extraProps.size = node.size;
    }

    if (node.type === 'checkbox') {
        extraProps.isChecked = node.isChecked;
    }

    return extraProps;
};

const Markdown = ({
    autolinkedUrlSchemes, baseTextStyle, blockStyles, channelId, channelMentions,
    disableAtChannelMentionHighlight, disableAtMentions, disableBlockQuote, disableChannelLink,
    disableCodeBlock, disableGallery, disableHashtags, disableHeading, disableTables,
    enableInlineLatex, enableLatex, maxNodes,
    imagesMetadata, isEdited, isReplyPost, isSearchResult, layoutHeight, layoutWidth,
    location, mentionKeys, highlightKeys, minimumHashtagLength = 3, onPostPress, postId, searchPatterns,
    textStyles = {}, theme, value = '', baseParagraphStyle, onLinkLongPress, isUnsafeLinksPost,
}: MarkdownProps) => {
    const style = getStyleSheet(theme);
    const managedConfig = useManagedConfig<ManagedConfig>();

    const urlFilter = (url: string) => {
        const scheme = getScheme(url);
        return !scheme || autolinkedUrlSchemes?.indexOf(scheme) !== -1;
    };

    const renderAtMention = ({context, mentionName}: MarkdownAtMentionRenderer) => {
        if (disableAtMentions) {
            return renderText({context, literal: `@${mentionName}`});
        }
        const computedStyles = StyleSheet.flatten(computeTextStyle(textStyles, baseTextStyle, context));
        const {fontFamily, fontSize, fontWeight} = computedStyles;

        return (
            <AtMention
                channelId={channelId}
                disableAtChannelMentionHighlight={disableAtChannelMentionHighlight}
                mentionStyle={[textStyles.mention, {fontSize, fontWeight, fontFamily}]}
                textStyle={[computedStyles, style.atMentionOpacity]}
                isSearchResult={isSearchResult}
                location={location}
                mentionName={mentionName}
                onPostPress={onPostPress}
                mentionKeys={mentionKeys}
            />
        );
    };

    const renderBlockQuote = ({children, ...otherProps}: any) => {
        if (disableBlockQuote) {
            return null;
        }

        return (
            <MarkdownBlockQuote
                iconStyle={blockStyles?.quoteBlockIcon}
                {...otherProps}
            >
                {children}
            </MarkdownBlockQuote>
        );
    };

    const renderBreak = () => {
        return <Text testID='markdown_break'>{'\n'}</Text>;
    };

    const renderChannelLink = ({context, channelName}: MarkdownChannelMentionRenderer) => {
        if (disableChannelLink || isUnsafeLinksPost) {
            return renderText({context, literal: `~${channelName}`});
        }

        return (
            <ChannelMention
                linkStyle={textStyles.link}
                textStyle={computeTextStyle(textStyles, baseTextStyle, context)}
                channelName={channelName}
                channelMentions={channelMentions}
            />
        );
    };

    const renderCheckbox = ({isChecked}: {isChecked: boolean}) => {
        return (
            <Text testID='markdown_checkbox'>
                <CompassIcon
                    name={isChecked ? 'checkbox-marked' : 'checkbox-blank-outline'}
                    size={16}
                    color={changeOpacity(theme.centerChannelColor, 0.56)}
                />
                {' '}
            </Text>
        );
    };

    const renderCodeBlock = (props: any) => {
        if (disableCodeBlock) {
            return null;
        }

        // These sometimes include a trailing newline
        const content = props.literal.replace(/\n$/, '');

        if (enableLatex && !isUnsafeLinksPost && props.language === 'latex') {
            return (
                <MarkdownLatexCodeBlock
                    content={content}
                    theme={theme}
                />
            );
        }

        return (
            <MarkdownCodeBlock
                content={content}
                language={props.language}
                textStyle={textStyles.codeBlock}
            />
        );
    };

    const renderCodeSpan = ({context, literal}: MarkdownBaseRenderer) => {
        const {code} = textStyles;
        return (
            <Text
                style={computeTextStyle(textStyles, [baseTextStyle, code], context)}
                testID='markdown_code_span'
            >
                {literal}
            </Text>
        );
    };

    const renderEditedIndicator = ({context}: {context: string[]}) => {
        let spacer = '';
        const styles = [baseTextStyle, style.editedIndicatorText];

        if (context[0] === 'paragraph') {
            spacer = ' ';
        }

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

    const renderEmoji = ({context, emojiName, literal}: MarkdownEmojiRenderer) => {
        return (
            <Emoji
                emojiName={emojiName}
                literal={literal}
                testID='markdown_emoji'
                textStyle={computeTextStyle(textStyles, baseTextStyle, context)}
            />
        );
    };

    const renderHashtag = ({context, hashtag}: {context: string[]; hashtag: string}) => {
        if (disableHashtags || isUnsafeLinksPost) {
            return renderText({context, literal: `#${hashtag}`});
        }

        const linkStyle = [textStyles.link];
        const headingIndex = context.findIndex((c) => c.includes('heading'));
        if (headingIndex > -1) {
            linkStyle.push(textStyles[context[headingIndex]]);
        }

        return (
            <Hashtag
                hashtag={hashtag}
                linkStyle={linkStyle}
            />
        );
    };

    const renderHeading = ({children, level}: {children: ReactElement; level: string}) => {
        if (disableHeading) {
            return (
                <Text
                    style={style.bold}
                    testID='markdown_heading'
                >
                    {children}
                </Text>
            );
        }

        const containerStyle = [
            style.block,
            textStyles[`heading${level}`],
        ];
        const textStyle = textStyles[`heading${level}Text`];

        return (
            <View
                style={containerStyle}
                testID='markdown_heading'
            >
                <Text style={textStyle}>
                    {children}
                </Text>
            </View>
        );
    };

    const renderHtml = (props: any) => {
        let rendered = renderText(props);

        if (props.isBlock) {
            rendered = (
                <View
                    style={style.block}
                    testID='markdown_html'
                >
                    {rendered}
                </View>
            );
        }

        return rendered;
    };

    const renderImage = ({linkDestination, context, src, size}: MarkdownImageRenderer) => {
        if (!imagesMetadata || isUnsafeLinksPost) {
            return null;
        }

        if (context.indexOf('table') !== -1) {
            // We have enough problems rendering images as is, so just render a link inside of a table
            return (
                <MarkdownTableImage
                    disabled={disableGallery ?? Boolean(!location)}
                    imagesMetadata={imagesMetadata}
                    location={location}
                    postId={postId!}
                    source={src}
                />
            );
        }

        return (
            <MarkdownImage
                disabled={disableGallery ?? Boolean(!location)}
                errorTextStyle={[computeTextStyle(textStyles, baseTextStyle, context), textStyles.error]}
                layoutHeight={layoutHeight}
                layoutWidth={layoutWidth}
                linkDestination={linkDestination}
                imagesMetadata={imagesMetadata}
                isReplyPost={isReplyPost}
                location={location}
                postId={postId!}
                source={src}
                sourceSize={size}
            />
        );
    };

    const renderLatexInline = ({context, latexCode}: MarkdownLatexRenderer) => {
        if (!enableInlineLatex || isUnsafeLinksPost) {
            return renderText({context, literal: `$${latexCode}$`});
        }

        return (
            <Text>
                <MarkdownLatexInline
                    content={latexCode}
                    maxMathWidth={Dimensions.get('window').width * 0.75}
                    theme={theme}
                />
            </Text>
        );
    };

    const renderLink = ({children, href}: {children: ReactElement; href: string}) => {
        if (isUnsafeLinksPost) {
            return renderText({context: [], literal: href});
        }
        return (
            <MarkdownLink
                href={href}
                onLinkLongPress={onLinkLongPress}
            >
                {children}
            </MarkdownLink>
        );
    };

    const renderList = ({children, start, tight, type}: any) => {
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

    const renderListItem = ({children, context, ...otherProps}: any) => {
        const level = context.filter((type: string) => type === 'list').length;

        return (
            <MarkdownListItem
                bulletStyle={baseTextStyle}
                level={level}
                {...otherProps}
            >
                {children}
            </MarkdownListItem>
        );
    };

    const renderParagraph = ({children, first}: {children: ReactElement[]; first: boolean}) => {
        if (!children || children.length === 0) {
            return null;
        }

        const blockStyle: StyleProp<ViewStyle> = [style.block];
        if (!first) {
            blockStyle.push(blockStyles?.adjacentParagraph);
        }

        return (
            <View
                style={blockStyle}
                testID='markdown_paragraph'
            >
                <Text style={baseParagraphStyle}>
                    {children}
                </Text>
            </View>
        );
    };

    const renderTable = ({children, numColumns}: {children: ReactElement; numColumns: number}) => {
        if (disableTables) {
            return null;
        }
        return (
            <MarkdownTable
                numColumns={numColumns}
                theme={theme}
            >
                {children}
            </MarkdownTable>
        );
    };

    const renderTableCell = (args: MarkdownTableCellProps) => {
        return <MarkdownTableCell {...args}/>;
    };

    const renderTableRow = (args: MarkdownTableRowProps) => {
        return <MarkdownTableRow {...args}/>;
    };

    const renderText = ({context, literal}: MarkdownBaseRenderer) => {
        const selectable = (managedConfig.copyAndPasteProtection !== 'true') && context.includes('table_cell');
        if (context.indexOf('image') !== -1) {
            // If this text is displayed, it will be styled by the image component
            return (
                <Text
                    testID='markdown_text'
                    selectable={selectable}
                >
                    {literal}
                </Text>
            );
        }

        // Construct the text style based off of the parents of this node since RN's inheritance is limited
        let styles;
        if (disableHeading) {
            styles = computeTextStyle(textStyles, baseTextStyle, context.filter((c) => !c.startsWith('heading')));
        } else {
            styles = computeTextStyle(textStyles, baseTextStyle, context);
        }

        if (context.includes('mention_highlight')) {
            styles = concatStyles(styles, {backgroundColor: theme.mentionHighlightBg});
        }

        return (
            <Text
                testID='markdown_text'
                style={styles}
                selectable={selectable}
            >
                {literal}
            </Text>
        );
    };

    const renderThematicBreak = () => {
        return (
            <View
                style={blockStyles?.horizontalRule}
                testID='markdown_thematic_break'
            />
        );
    };

    const renderMaxNodesWarning = () => {
        const styles = [baseTextStyle, style.maxNodesWarning];

        return (
            <FormattedText
                id='markdown.max_nodes.error'
                defaultMessage='This message is too long to by shown fully on a mobile device. Please view it on desktop or contact an admin to increase this limit.'
                style={styles}
                testID='max_nodes_warning'
            />
        );
    };

    const createRenderer = () => {
        const renderers: any = {
            text: renderText,

            emph: Renderer.forwardChildren,
            strong: Renderer.forwardChildren,
            del: Renderer.forwardChildren,
            code: renderCodeSpan,
            link: renderLink,
            image: renderImage,
            atMention: renderAtMention,
            channelLink: renderChannelLink,
            emoji: renderEmoji,
            hashtag: renderHashtag,
            latexInline: renderLatexInline,

            paragraph: renderParagraph,
            heading: renderHeading,
            codeBlock: renderCodeBlock,
            blockQuote: renderBlockQuote,

            list: renderList,
            item: renderListItem,

            hardBreak: renderBreak,
            thematicBreak: renderThematicBreak,
            softBreak: renderBreak,

            htmlBlock: renderHtml,
            htmlInline: renderHtml,

            table: renderTable,
            table_row: renderTableRow,
            table_cell: renderTableCell,

            mention_highlight: Renderer.forwardChildren,
            search_highlight: Renderer.forwardChildren,
            highlight_without_notification: Renderer.forwardChildren,
            checkbox: renderCheckbox,

            editedIndicator: renderEditedIndicator,
            maxNodesWarning: renderMaxNodesWarning,
        };

        return new Renderer({
            renderers,
            renderParagraphsInLists: true,
            maxNodes,
            getExtraPropsForNode,
            allowedTypes: Object.keys(renderers),
        });
    };

    const parser = useRef(new Parser({urlFilter, minimumHashtagLength})).current;
    const renderer = useMemo(createRenderer, [theme, textStyles]);
    let ast = parser.parse(value.toString());

    ast = combineTextNodes(ast);
    ast = addListItemIndices(ast);
    ast = pullOutImages(ast);
    ast = parseTaskLists(ast);
    if (mentionKeys) {
        ast = highlightMentions(ast, mentionKeys);
    }
    if (highlightKeys) {
        ast = highlightWithoutNotification(ast, highlightKeys);
    }
    if (searchPatterns) {
        ast = highlightSearchPatterns(ast, searchPatterns);
    }
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

    return renderer.render(ast) as JSX.Element;
};

export default Markdown;
