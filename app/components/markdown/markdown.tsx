// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
/* eslint-disable max-lines */

import {useManagedConfig} from '@mattermost/react-native-emm';
import {Parser, Node} from 'commonmark';
import Renderer from 'commonmark-react-renderer';
import React, {type ReactElement, useCallback, useMemo, useRef} from 'react';
import {Dimensions, type StyleProp, StyleSheet, Text, type TextStyle, View, type ViewStyle} from 'react-native';

import CompassIcon from '@components/compass_icon';
import EditedIndicator from '@components/edited_indicator';
import Emoji from '@components/emoji';
import FormattedText from '@components/formatted_text';
import {logError} from '@utils/log';
import {computeTextStyle, getMarkdownBlockStyles, getMarkdownTextStyles} from '@utils/markdown';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import AtMention from './at_mention';
import ChannelMention from './channel_mention';
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
import {addListItemIndices, combineTextNodes, highlightMentions, highlightWithoutNotification, highlightSearchPatterns, parseTaskLists, pullOutImages, transformMentionsInText} from './transform';

import type {ChannelMentions} from './channel_mention/channel_mention';
import type {
    MarkdownAtMentionRenderer, MarkdownBaseRenderer, MarkdownBlockStyles, MarkdownChannelMentionRenderer,
    MarkdownEmojiRenderer, MarkdownImageRenderer, MarkdownLatexRenderer, MarkdownTextStyles, SearchPattern, UserMentionKey, HighlightWithoutNotificationKey,
} from '@typings/global/markdown';
import type {AvailableScreens} from '@typings/screens/navigation';

type MarkdownProps = {
    baseTextStyle: StyleProp<TextStyle>;
    baseParagraphStyle?: StyleProp<TextStyle>;
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
    isMyPost?: boolean;
    isReplyPost?: boolean;
    isSearchResult?: boolean;
    layoutHeight?: number;
    layoutWidth?: number;
    location: AvailableScreens;
    maxNodes: number;
    mentionKeys?: UserMentionKey[];
    minimumHashtagLength?: number;
    postId?: string;
    searchPatterns?: SearchPattern[];
    theme: Theme;
    value?: string;
    onLinkLongPress?: (url?: string) => void;
    isUnsafeLinksPost?: boolean;
}

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        block: {
            alignItems: 'flex-start',
            flexDirection: 'row',
            flexWrap: 'wrap',
        },
        errorMessage: {
            color: theme.errorTextColor,
            ...typography('Body', 100),
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

const renderHashtagWithStyles = (
    context: string[],
    hashtag: string,
    textStyles: MarkdownTextStyles,
    baseTextStyle: StyleProp<TextStyle>,
) => {
    const computedStyle = computeTextStyle(textStyles, baseTextStyle, context);
    const linkStyle = [computedStyle, textStyles.link];
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

const Markdown = ({
    baseTextStyle,
    channelId,
    channelMentions,
    disableAtChannelMentionHighlight,
    disableAtMentions,
    disableBlockQuote,
    disableChannelLink,
    disableCodeBlock,
    disableGallery,
    disableHashtags,
    disableHeading,
    disableTables,
    enableInlineLatex,
    enableLatex,
    maxNodes,
    imagesMetadata,
    isEdited,
    isMyPost,
    isReplyPost,
    isSearchResult,
    layoutHeight,
    layoutWidth,
    location,
    mentionKeys,
    highlightKeys,
    minimumHashtagLength = 3,
    postId,
    searchPatterns,
    theme,
    value = '',
    baseParagraphStyle,
    onLinkLongPress,
    isUnsafeLinksPost,
}: MarkdownProps) => {
    const style = getStyleSheet(theme);
    const blockStyles = useMemo<MarkdownBlockStyles>(() => getMarkdownBlockStyles(theme), [theme]);
    const textStyles = useMemo<MarkdownTextStyles>(() => getMarkdownTextStyles(theme), [theme]);
    const managedConfig = useManagedConfig<ManagedConfig>();

    const renderText = useCallback(({context, literal}: MarkdownBaseRenderer) => {
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
        let styles: StyleProp<TextStyle>;
        if (disableHeading) {
            styles = computeTextStyle(textStyles, baseTextStyle, context.filter((c) => !c.startsWith('heading')));
        } else {
            styles = computeTextStyle(textStyles, baseTextStyle, context);
        }

        // Override link color to white for "my post" side and add underline to all links
        if (context.includes('link')) {
            const linkOverrides: TextStyle = {
                textDecorationLine: 'underline',
            };
            if (isMyPost) {
                linkOverrides.color = theme.buttonColor;
            }
            styles = [styles, linkOverrides];
        }

        // Removed mention highlight background - mentions only use underline, same text color as post

        return (
            <Text
                testID='markdown_text'
                style={styles}
                selectable={selectable}
            >
                {literal}
            </Text>
        );
    }, [baseTextStyle, disableHeading, isMyPost, managedConfig.copyAndPasteProtection, textStyles, theme.buttonColor]);

    const renderAtMention = useCallback(({context, mentionName}: MarkdownAtMentionRenderer) => {
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
                isMyPost={isMyPost}
                isSearchResult={isSearchResult}
                location={location}
                mentionName={mentionName}
                mentionKeys={mentionKeys}
                theme={theme}
            />
        );
    }, [baseTextStyle, channelId, disableAtChannelMentionHighlight, disableAtMentions, isMyPost, isSearchResult, location, mentionKeys, renderText, style.atMentionOpacity, textStyles, theme]);

    const renderBlockQuote = useCallback(({children, ...otherProps}: any) => {
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
    }, [disableBlockQuote, blockStyles?.quoteBlockIcon]);

    const renderBreak = () => {
        return <Text testID='markdown_break'>{'\n'}</Text>;
    };

    const renderChannelLink = useCallback(({context, channelName}: MarkdownChannelMentionRenderer) => {
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
    }, [baseTextStyle, channelMentions, disableChannelLink, isUnsafeLinksPost, renderText, textStyles]);

    const renderCheckbox = useCallback(({isChecked}: {isChecked: boolean}) => {
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
    }, [theme.centerChannelColor]);

    const renderCodeBlock = useCallback((props: any) => {
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
                theme={theme}
            />
        );
    }, [disableCodeBlock, enableLatex, isUnsafeLinksPost, textStyles.codeBlock, theme]);

    const renderCodeSpan = useCallback(({context, literal}: MarkdownBaseRenderer) => {
        const {code} = textStyles;
        return (
            <Text
                style={computeTextStyle(textStyles, [baseTextStyle, code], context)}
                testID='markdown_code_span'
            >
                {literal}
            </Text>
        );
    }, [baseTextStyle, textStyles]);

    const renderEditedIndicator = useCallback(({context}: {context: string[]}) => {
        return (
            <EditedIndicator
                baseTextStyle={baseTextStyle}
                theme={theme}
                context={context}
                iconSize={14}
                checkHeadings={true}
                testID='edited_indicator'
            />
        );
    }, [baseTextStyle, theme]);

    const renderEmoji = useCallback(({context, emojiName, literal}: MarkdownEmojiRenderer) => {
        return (
            <Emoji
                emojiName={emojiName}
                literal={literal}
                testID='markdown_emoji'
                textStyle={computeTextStyle(textStyles, baseTextStyle, context)}
            />
        );
    }, [baseTextStyle, textStyles]);

    const renderHashtag = useCallback(({context, hashtag}: {context: string[]; hashtag: string}) => {
        if (disableHashtags || isUnsafeLinksPost) {
            return renderText({context, literal: `#${hashtag}`});
        }

        return renderHashtagWithStyles(context, hashtag, textStyles, baseTextStyle);
    }, [baseTextStyle, disableHashtags, isUnsafeLinksPost, renderText, textStyles]);

    const renderHeading = useCallback(({children, level}: {children: ReactElement; level: string}) => {
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
                style={containerStyle as StyleProp<ViewStyle>}
                testID='markdown_heading'
            >
                <Text style={textStyle}>
                    {children}
                </Text>
            </View>
        );
    }, [disableHeading, style.block, style.bold, textStyles]);

    const renderHtml = useCallback((props: any) => {
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
    }, [renderText, style.block]);

    const renderImage = useCallback(({linkDestination, context, src, size}: MarkdownImageRenderer) => {
        if (!imagesMetadata || isUnsafeLinksPost) {
            return null;
        }

        const isInsideLink = context.indexOf('link') !== -1;

        const disableInteraction = (disableGallery ?? Boolean(!location)) || isInsideLink;

        if (context.indexOf('table') !== -1) {
            // We have enough problems rendering images as is, so just render a link inside of a table
            return (
                <MarkdownTableImage
                    disabled={disableInteraction}
                    imagesMetadata={imagesMetadata}
                    location={location}
                    postId={postId!}
                    source={src}
                    theme={theme}
                />
            );
        }

        return (
            <MarkdownImage
                disabled={disableInteraction}
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
                theme={theme}
            />
        );
    }, [baseTextStyle, disableGallery, imagesMetadata, isReplyPost, isUnsafeLinksPost, layoutHeight, layoutWidth, location, postId, textStyles, theme]);

    const renderLatexInline = useCallback(({context, latexCode}: MarkdownLatexRenderer) => {
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
    }, [enableInlineLatex, isUnsafeLinksPost, renderText, theme]);

    const renderLink = useCallback(({children, href}: {children: ReactElement; href: string}) => {
        if (isUnsafeLinksPost) {
            return renderText({context: [], literal: href});
        }

        return (
            <MarkdownLink
                href={href}
                isMyPost={isMyPost}
                onLinkLongPress={onLinkLongPress}
                theme={theme}
            >
                {children}
            </MarkdownLink>
        );
    }, [isMyPost, isUnsafeLinksPost, onLinkLongPress, renderText, theme]);

    const renderList = useCallback(({children, start, tight, type}: any) => {
        return (
            <MarkdownList
                ordered={type !== 'bullet'}
                start={start}
                tight={tight}
            >
                {children}
            </MarkdownList>
        );
    }, []);

    const renderListItem = useCallback(({children, context, ...otherProps}: any) => {
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
    }, [baseTextStyle]);

    const renderParagraph = useCallback(({children, first}: {children: ReactElement[]; first: boolean}) => {
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
    }, [baseParagraphStyle, blockStyles?.adjacentParagraph, style.block]);

    const renderTable = useCallback(({children, numColumns}: {children: ReactElement; numColumns: number}) => {
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
    }, [disableTables, theme]);

    const renderTableCell = useCallback((args: MarkdownTableCellProps) => {
        return (
            <MarkdownTableCell
                {...args}
                theme={theme}
            />
        );
    }, [theme]);

    const renderTableRow = useCallback((args: MarkdownTableRowProps) => {
        return (
            <MarkdownTableRow
                {...args}
                theme={theme}
            />
        );
    }, [theme]);

    const renderThematicBreak = useCallback(() => {
        return (
            <View
                style={blockStyles?.horizontalRule}
                testID='markdown_thematic_break'
            />
        );
    }, [blockStyles?.horizontalRule]);

    const renderMaxNodesWarning = useCallback(() => {
        const styles = [baseTextStyle, style.maxNodesWarning];

        return (
            <FormattedText
                id='markdown.max_nodes.error'
                defaultMessage='This message is too long to by shown fully on a mobile device. Please view it on desktop or contact an admin to increase this limit.'
                style={styles}
                testID='max_nodes_warning'
            />
        );
    }, [baseTextStyle, style.maxNodesWarning]);

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

    // Pattern suggested in https://react.dev/reference/react/useRef#avoiding-recreating-the-ref-contents
    const parserRef = useRef<Parser | null>(null);
    if (parserRef.current === null) {
        parserRef.current = new Parser({minimumHashtagLength});
    }
    const parser = parserRef.current;

    const renderer = useMemo(createRenderer, [
        renderText,
        renderCodeSpan,
        renderLink,
        renderImage,
        renderAtMention,
        renderChannelLink,
        renderEmoji,
        renderHashtag,
        renderLatexInline,
        renderParagraph,
        renderHeading,
        renderCodeBlock,
        renderBlockQuote,
        renderList,
        renderListItem,
        renderThematicBreak,
        renderHtml,
        renderTable,
        renderTableRow,
        renderTableCell,
        renderCheckbox,
        renderEditedIndicator,
        renderMaxNodesWarning,
        maxNodes,
    ]);

    const errorLogged = useRef(false);

    const output = useMemo(() => {
        let ast;
        try {
            ast = parser.parse(value.toString());

            ast = combineTextNodes(ast);
            ast = addListItemIndices(ast);
            ast = pullOutImages(ast);
            ast = parseTaskLists(ast);

            // Transform text nodes containing @mentions into at_mention nodes if not already parsed
            ast = transformMentionsInText(ast);

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
                    ast.lastChild.appendChild(editIndicatorNode);
                } else {
                    const node = new Node('paragraph');
                    node.appendChild(editIndicatorNode);

                    ast.appendChild(node);
                }
            }
        } catch (e) {
            if (!errorLogged.current) {
                logError('An error occurred while parsing Markdown', e);

                errorLogged.current = true;
            }

            return (
                <FormattedText
                    id='markdown.parse_error'
                    defaultMessage='An error occurred while parsing this text'
                    style={style.errorMessage}
                />
            );
        }

        try {
            const generatedOutput = renderer.render(ast);
            return generatedOutput;
        } catch (e) {
            if (!errorLogged.current) {
                logError('An error occurred while rendering Markdown', e);

                errorLogged.current = true;
            }

            return (
                <FormattedText
                    id='markdown.render_error'
                    defaultMessage='An error occurred while rendering this text'
                    style={style.errorMessage}
                />
            );
        }
    }, [highlightKeys, isEdited, mentionKeys, parser, renderer, searchPatterns, style.errorMessage, value]);

    return output;
};

export const testExports = {
    renderHashtagWithStyles,
};

export default Markdown;
