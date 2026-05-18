// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {createContext, useCallback, useContext, useMemo, useState} from 'react';
import {Pressable, ScrollView, View, type ViewStyle} from 'react-native';

import AutocompleteSelector from '@components/autocomplete_selector';
import CompassIcon from '@components/compass_icon';
import Markdown from '@components/markdown';
import AttachmentImage from '@components/post_list/post/body/content/message_attachments/attachment_image';
import {usePreventDoubleTap} from '@hooks/utils';
import {filterOptions, getStatusColors} from '@utils/message_attachment';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {secureGetFromRecord} from '@utils/types';
import {typography} from '@utils/typography';

import MmActionButton from './mm_action_button';

import type {AvailableScreens} from '@typings/screens/navigation';

export type ActionHandler = (
    actionId: string,
    selectedOption?: string,
    query?: Record<string, string>,
    attachmentCookie?: string,
) => void | Promise<void>;

const MM_IMAGE_SIZE_CAPS: Record<MmImageSize, {maxWidth: number; maxHeight: number} | null> = {
    auto: null,
    xsmall: {maxWidth: 64, maxHeight: 64},
    small: {maxWidth: 120, maxHeight: 120},
    medium: {maxWidth: 184, maxHeight: 184},
    large: {maxWidth: 240, maxHeight: 240},
    stretch: {maxWidth: 500, maxHeight: 350},
};

const MM_CONTAINER_GAP_PX: Record<'small' | 'medium' | 'large' | 'xlarge', number> = {
    small: 8,
    medium: 12,
    large: 16,
    xlarge: 20,
};

const MM_CONTAINER_MAX_HEIGHT_PX: Record<'small' | 'medium' | 'large', number> = {
    small: 160,
    medium: 280,
    large: 420,
};

const MM_CONTAINER_ACCENT_SEMANTIC = new Set<MmContainerAccentSemantic>([
    'default',
    'primary',
    'good',
    'warning',
    'danger',
]);

const MmBlocksImagesMetadataContext = createContext<Record<string, PostImage> | undefined>(undefined);
const MmBlocksChildLayoutContext = createContext<'column' | 'row'>('column');

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    const STATUS_COLORS = getStatusColors(theme);
    return {
        root: {
            gap: 12,
        },
        textSubtle: {
            color: changeOpacity(theme.centerChannelColor, 0.64),
        },
        textSmall: {
            ...typography('Body', 75),
        },
        divider: {
            borderBottomWidth: 1,
            borderBottomColor: changeOpacity(theme.centerChannelColor, 0.12),
            marginVertical: 4,
        },
        dividerVertical: {
            width: 1,
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.12),
            marginHorizontal: 8,
            alignSelf: 'stretch',
        },
        columnSet: {
            flexDirection: 'row',
            gap: 8,
            minWidth: 0,
        },
        column: {
            flex: 1,
            minWidth: 0,
        },
        columnAuto: {
            flexGrow: 0,
            flexShrink: 0,
        },
        container: {
            gap: 0,
            minWidth: 0,
        },
        containerHorizontal: {
            flexDirection: 'row',
            flexWrap: 'wrap',
            alignItems: 'flex-start',
        },
        containerVertical: {
            flexDirection: 'column',
        },
        containerBorder: {
            borderWidth: 1,
            borderColor: changeOpacity(theme.centerChannelColor, 0.16),
            borderRadius: 4,
            padding: 12,
            maxWidth: 700,
        },
        containerBgGray: {
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.04),
        },
        containerAccent: {
            borderLeftWidth: 4,
            padding: 12,
            maxWidth: 700,
        },
        accentDefault: {borderLeftColor: changeOpacity(STATUS_COLORS.primary, 0.32)},
        accentPrimary: {borderLeftColor: STATUS_COLORS.primary},
        accentGood: {borderLeftColor: STATUS_COLORS.good},
        accentWarning: {borderLeftColor: STATUS_COLORS.warning},
        accentDanger: {borderLeftColor: STATUS_COLORS.danger},
        imageRow: {
            flexDirection: 'row',
            marginBottom: 8,
        },
        imageAlignLeft: {justifyContent: 'flex-start'},
        imageAlignCenter: {justifyContent: 'center'},
        imageAlignRight: {justifyContent: 'flex-end'},
        collapsible: {
            minWidth: 0,
        },
        collapsibleHeader: {
            flexDirection: 'row',
            alignItems: 'flex-start',
            gap: 4,
        },
        collapsibleChevron: {
            marginTop: 2,
        },
        collapsibleHeaderBody: {
            flex: 1,
            minWidth: 0,
        },
        message: {
            color: theme.centerChannelColor,
            fontSize: 15,
            lineHeight: 20,
        },
        select: {
            marginTop: 8,
        },
    };
});

function resolveMmImageCaps(block: MmImageBlock): {maxWidth?: number; maxHeight?: number} {
    const size = block.size ?? 'stretch';
    const preset = MM_IMAGE_SIZE_CAPS[size];
    const maxWidth = block.max_width ?? preset?.maxWidth;
    const maxHeight = block.max_height ?? preset?.maxHeight;
    if (size === 'auto' && block.max_width === undefined && block.max_height === undefined) {
        return {};
    }
    const out: {maxWidth?: number; maxHeight?: number} = {};
    if (maxWidth !== undefined) {
        out.maxWidth = maxWidth;
    }
    if (maxHeight !== undefined) {
        out.maxHeight = maxHeight;
    }
    return out;
}

function isMmContainerSemanticAccent(accent: string): accent is MmContainerAccentSemantic {
    return MM_CONTAINER_ACCENT_SEMANTIC.has(accent as MmContainerAccentSemantic);
}

function containerGapStyle(gap: MmContainerBlock['gap'] | undefined): ViewStyle {
    const key = gap === 'none' || gap === 'small' || gap === 'medium' || gap === 'large' || gap === 'xlarge' ? gap : 'medium';
    if (key === 'none') {
        return {gap: 0};
    }
    return {gap: MM_CONTAINER_GAP_PX[key]};
}

type BlockRendererProps = {
    blocks: MmBlock[];
    channelId: string;
    imagesMetadata?: Record<string, PostImage>;
    layoutWidth?: number;
    location: AvailableScreens;
    onAction: ActionHandler;
    postId: string;
    theme: Theme;
};

const BlockRenderer = ({
    blocks,
    channelId,
    imagesMetadata,
    layoutWidth,
    location,
    onAction,
    postId,
    theme,
}: BlockRendererProps) => {
    const metadataValue = useMemo(() => imagesMetadata, [imagesMetadata]);
    return (
        <MmBlocksImagesMetadataContext.Provider value={metadataValue}>
            <ContainerBlock
                block={{
                    type: 'container',
                    content: blocks,
                }}
                channelId={channelId}
                layoutWidth={layoutWidth}
                location={location}
                onAction={onAction}
                postId={postId}
                theme={theme}
            />
        </MmBlocksImagesMetadataContext.Provider>
    );
};

type BlockSwitchProps = {
    block: MmBlock;
    channelId: string;
    layoutWidth?: number;
    location: AvailableScreens;
    onAction: ActionHandler;
    postId: string;
    theme: Theme;
};

const BlockSwitch = ({block, channelId, layoutWidth, location, onAction, postId, theme}: BlockSwitchProps) => {
    switch (block.type) {
        case 'text':
            return (
                <TextBlock
                    block={block}
                    channelId={channelId}
                    location={location}
                    onAction={onAction}
                    postId={postId}
                    theme={theme}
                />
            );
        case 'image':
            return (
                <ImageBlock
                    block={block}
                    layoutWidth={layoutWidth}
                    location={location}
                    postId={postId}
                    theme={theme}
                />
            );
        case 'divider':
            return <DividerBlock theme={theme}/>;
        case 'column_set':
            return (
                <ColumnSetBlock
                    block={block}
                    channelId={channelId}
                    layoutWidth={layoutWidth}
                    location={location}
                    onAction={onAction}
                    postId={postId}
                    theme={theme}
                />
            );
        case 'container':
            return (
                <ContainerBlock
                    block={block}
                    channelId={channelId}
                    layoutWidth={layoutWidth}
                    location={location}
                    onAction={onAction}
                    postId={postId}
                    theme={theme}
                />
            );
        case 'collapsible':
            return (
                <CollapsibleBlock
                    block={block}
                    channelId={channelId}
                    layoutWidth={layoutWidth}
                    location={location}
                    onAction={onAction}
                    postId={postId}
                    theme={theme}
                />
            );
        case 'button':
            return (
                <MmActionButton
                    element={block}
                    onAction={onAction}
                    postId={postId}
                    theme={theme}
                />
            );
        case 'static_select':
            return (
                <StaticSelectBlock
                    block={block}
                    location={location}
                    onAction={onAction}
                    postId={postId}
                />
            );
        default:
            return null;
    }
};

const DividerBlock = ({theme}: {theme: Theme}) => {
    const style = getStyleSheet(theme);
    const childLayout = useContext(MmBlocksChildLayoutContext);
    if (childLayout === 'row') {
        return <View style={style.dividerVertical}/>;
    }
    return <View style={style.divider}/>;
};

type TextBlockProps = {
    block: MmTextBlock;
    channelId: string;
    location: AvailableScreens;
    onAction: ActionHandler;
    postId: string;
    theme: Theme;
};

const TextBlock = ({block, channelId, location, onAction, postId, theme}: TextBlockProps) => {
    const style = getStyleSheet(theme);
    const handleMmActionMarkdown = useCallback(
        (actionId: string, query: Record<string, string>) => {
            onAction(actionId, undefined, query, undefined);
        },
        [onAction],
    );

    if (!block.text) {
        return null;
    }

    const textStyle = [
        style.message,
        block.is_subtle && style.textSubtle,
        block.size === 'small' && style.textSmall,
    ];

    return (
        <Markdown
            baseTextStyle={textStyle}
            channelId={channelId}
            enableInlineLatex={true}
            enableLatex={true}
            location={location}
            maxNodes={1000}
            onMmBlocksMarkdownAction={handleMmActionMarkdown}
            postId={postId}
            theme={theme}
            value={block.text}
        />
    );
};

type ImageBlockProps = {
    block: MmImageBlock;
    layoutWidth?: number;
    location: AvailableScreens;
    postId: string;
    theme: Theme;
};

const ImageBlock = ({block, layoutWidth, location, postId, theme}: ImageBlockProps) => {
    const style = getStyleSheet(theme);
    const imagesMetadata = useContext(MmBlocksImagesMetadataContext);
    const url = typeof block.url === 'string' ? block.url.trim() : '';
    const imageMetadata = secureGetFromRecord(imagesMetadata, url);
    const caps = resolveMmImageCaps(block);

    if (!url || !imageMetadata) {
        return null;
    }

    const align = block.horizontal_alignment ?? 'left';
    let alignStyle: ViewStyle = style.imageAlignLeft;
    if (align === 'center') {
        alignStyle = style.imageAlignCenter;
    } else if (align === 'right') {
        alignStyle = style.imageAlignRight;
    }

    const constrainedMetadata: PostImage = {
        ...imageMetadata,
        width: caps.maxWidth ? Math.min(imageMetadata.width, caps.maxWidth) : imageMetadata.width,
        height: caps.maxHeight ? Math.min(imageMetadata.height, caps.maxHeight) : imageMetadata.height,
    };

    return (
        <View style={[style.imageRow, alignStyle]}>
            <AttachmentImage
                imageStyle={block.image_style}
                imageMetadata={constrainedMetadata}
                imageUrl={url}
                layoutWidth={layoutWidth}
                location={location}
                postId={postId}
                theme={theme}
            />
        </View>
    );
};

type StaticSelectBlockProps = {
    block: MmStaticSelectBlock;
    location: AvailableScreens;
    onAction: ActionHandler;
    postId: string;
};

const StaticSelectBlock = ({block, location, onAction}: StaticSelectBlockProps) => {
    const filteredOptions = useMemo(() => filterOptions(block.options), [block.options]);
    const [selected, setSelected] = useState(() => {
        if (block.initial_option && block.options) {
            return block.options.find((o) => o.value === block.initial_option)?.value;
        }
        return undefined;
    });

    const isDynamicSource = block.data_source === 'users' || block.data_source === 'channels';
    const optionCount = block.options?.length ?? 0;
    const isValid = Boolean(block.action_id && (isDynamicSource || optionCount > 0));

    const handleSelect = usePreventDoubleTap(useCallback(async (selectedItem: SelectedDialogOption) => {
        if (!selectedItem || Array.isArray(selectedItem) || !block.action_id) {
            return;
        }
        await onAction(block.action_id, selectedItem.value, block.query, block.cookie);
        setSelected(selectedItem.value);
    }, [block.action_id, block.cookie, block.query, onAction]));

    if (!isValid) {
        return null;
    }

    return (
        <AutocompleteSelector
            placeholder={block.placeholder}
            dataSource={block.data_source}
            isMultiselect={false}
            options={filteredOptions}
            selected={selected}
            onSelected={handleSelect}
            disabled={block.disabled}
            testID={`mm_blocks.static_select.${block.action_id}`}
            location={location}
        />
    );
};

type ColumnSetBlockProps = BlockSwitchProps & {block: MmColumnSetBlock};

const ColumnSetBlock = ({block, ...switchProps}: ColumnSetBlockProps) => {
    const {theme} = switchProps;
    const style = getStyleSheet(theme);
    if (!block.columns || block.columns.length === 0) {
        return null;
    }
    return (
        <View style={style.columnSet}>
            {block.columns.map((column, i) => (
                <ColumnBlock
                    key={i}
                    block={column}
                    {...switchProps}
                />
            ))}
        </View>
    );
};

type ColumnBlockProps = BlockSwitchProps & {block: MmColumnBlock};

const ColumnBlock = ({block, ...switchProps}: ColumnBlockProps) => {
    const {theme} = switchProps;
    const style = getStyleSheet(theme);
    if (!block.items || block.items.length === 0) {
        return null;
    }
    const columnStyle = block.width === 'stretch' ? style.column : [style.column, style.columnAuto];
    return (
        <View style={columnStyle}>
            <ContainerBlock
                block={{
                    type: 'container',
                    content: block.items,
                }}
                {...switchProps}
            />
        </View>
    );
};

type ContainerBlockProps = BlockSwitchProps & {block: MmContainerBlock};

const ContainerBlock = ({block, ...switchProps}: ContainerBlockProps) => {
    const {theme} = switchProps;
    const style = getStyleSheet(theme);
    if (!block.content || block.content.length === 0) {
        return null;
    }

    const containerChildLayout: 'column' | 'row' = block.flow === 'horizontal' ? 'row' : 'column';
    const flowStyle = block.flow === 'horizontal' ? style.containerHorizontal : style.containerVertical;
    const gapStyle = containerGapStyle(block.gap);
    const accent = block.accent_color;

    let boundedContent: React.ReactNode = block.content.map((item, i) => (
        <BlockSwitch
            key={i}
            block={item}
            {...switchProps}
        />
    ));

    if (block.max_height) {
        const maxHeightKey = block.max_height === 'small' || block.max_height === 'medium' || block.max_height === 'large' ? block.max_height : 'medium';
        boundedContent = (
            <ScrollView
                style={{maxHeight: MM_CONTAINER_MAX_HEIGHT_PX[maxHeightKey]}}
                nestedScrollEnabled={true}
            >
                {boundedContent}
            </ScrollView>
        );
    }

    const inner = (
        <MmBlocksChildLayoutContext.Provider value={containerChildLayout}>
            <View style={[style.container, flowStyle, gapStyle]}>
                {boundedContent}
            </View>
        </MmBlocksChildLayoutContext.Provider>
    );

    const containerStyle = [block.border && style.containerBorder, block.background === 'gray' && style.containerBgGray];
    if (!accent) {
        return <View style={containerStyle}>{inner}</View>;
    }

    let accentStyle: ViewStyle = {};
    if (isMmContainerSemanticAccent(accent)) {
        switch (accent) {
            case 'primary':
                accentStyle = style.accentPrimary;
                break;
            case 'good':
                accentStyle = style.accentGood;
                break;
            case 'warning':
                accentStyle = style.accentWarning;
                break;
            case 'danger':
                accentStyle = style.accentDanger;
                break;
            default:
                accentStyle = style.accentDefault;
                break;
        }
    } else {
        accentStyle = {borderLeftColor: accent};
    }

    return (
        <View style={[containerStyle, style.containerAccent, accentStyle]}>
            {inner}
        </View>
    );
};

type CollapsibleBlockProps = BlockSwitchProps & {block: MmCollapsibleBlock};

const CollapsibleBlock = ({block, ...switchProps}: CollapsibleBlockProps) => {
    const {theme} = switchProps;
    const style = getStyleSheet(theme);
    const [collapsed, setCollapsed] = useState(block.collapsed !== false);
    const toggleCollapsed = usePreventDoubleTap(useCallback(() => {
        setCollapsed((prev) => !prev);
    }, []));

    if (!block.header?.length || !block.content?.length) {
        return null;
    }

    return (
        <View style={style.collapsible}>
            <Pressable
                onPress={toggleCollapsed}
                style={({pressed}) => [style.collapsibleHeader, pressed && {opacity: 0.72}]}
                accessibilityRole='button'
                accessibilityState={{expanded: !collapsed}}
            >
                <CompassIcon
                    name={collapsed ? 'chevron-right' : 'chevron-down'}
                    size={20}
                    style={style.collapsibleChevron}
                />
                <View style={style.collapsibleHeaderBody}>
                    <ContainerBlock
                        block={{type: 'container', content: block.header}}
                        {...switchProps}
                    />
                </View>
            </Pressable>
            {!collapsed && (
                <ContainerBlock
                    block={{type: 'container', content: block.content}}
                    {...switchProps}
                />
            )}
        </View>
    );
};

export default BlockRenderer;
