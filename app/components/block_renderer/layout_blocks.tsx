// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useContext, useMemo, useState} from 'react';
import {Pressable, View, type LayoutChangeEvent, type ViewStyle} from 'react-native';

import ClippedScrollContent from '@components/clipped_scroll_content';
import CompassIcon from '@components/compass_icon';
import {Screens} from '@constants';
import {usePreventDoubleTap} from '@hooks/utils';
import {navigateToScreen} from '@screens/navigation';
import CallbackStore from '@store/callback_store';

import {ButtonElement} from './button_element';
import {MmBlocksChildLayoutContext, MmBlocksImagesMetadataContext, MmBlocksInlineMarkdownActionsContext, MmBlocksInteractionContext, MmBlocksLayoutWidthContext, MmBlocksRenderContext} from './context';
import {DividerBlock} from './divider_block';
import {ImageBlock} from './image_block';
import {type MmBlocksExpandedContentPayload} from './mm_blocks_context_provider';
import {StaticSelectElement} from './static_select_element';
import {
    MM_CONTAINER_MAX_HEIGHT_PX,
    containerGapStyle,
    getStyleSheet,
    isMmContainerSemanticAccent,
} from './styles';
import {TextBlock} from './text_block';

import type {BlockSwitchProps} from './types';

export const BlockSwitch = ({block, onAction, postId, theme}: BlockSwitchProps) => {
    switch (block.type) {
        case 'text':
            return (
                <TextBlock
                    block={block}
                    postId={postId}
                    theme={theme}
                />
            );
        case 'image':
            return (
                <ImageBlock
                    block={block}
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
                    onAction={onAction}
                    postId={postId}
                    theme={theme}
                />
            );
        case 'container':
            return (
                <ContainerBlock
                    block={block}
                    onAction={onAction}
                    postId={postId}
                    theme={theme}
                />
            );
        case 'collapsible':
            return (
                <CollapsibleBlock
                    block={block}
                    onAction={onAction}
                    postId={postId}
                    theme={theme}
                />
            );
        case 'button':
            return (
                <ButtonElement
                    element={block}
                    onAction={onAction}
                    theme={theme}
                />
            );
        case 'static_select':
            return (
                <StaticSelectElement
                    element={block}
                    onAction={onAction}
                />
            );
        default:
            return null;
    }
};

type ColumnSetBlockProps = BlockSwitchProps & {block: MmColumnSetBlock};

const ColumnSetBlock = ({block, ...switchProps}: ColumnSetBlockProps) => {
    const {theme} = switchProps;
    const style = getStyleSheet(theme);
    if (!block.columns || block.columns.length === 0) {
        return null;
    }

    // We use the index on the key since we don't have a unique id for the columns,
    // and we do not expect the number or order of columns to change.
    return (
        <View style={[style.columnSet, containerGapStyle(block.gap)]}>
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
    const columnStyle = block.width === 'stretch' ? style.columnStretch : style.columnAuto;
    const innerContainer: MmContainerBlock = {
        type: 'container',
        content: block.items,
        ...(block.gap ? {gap: block.gap} : {}),
    };
    return (
        <View style={columnStyle}>
            <ContainerBlock
                block={innerContainer}
                {...switchProps}
            />
        </View>
    );
};

type ContainerBlockProps = BlockSwitchProps & {block: MmContainerBlock};

export const ContainerBlock = ({block, ...switchProps}: ContainerBlockProps) => {
    const {theme} = switchProps;
    const style = getStyleSheet(theme);
    const parentLayoutWidth = useContext(MmBlocksLayoutWidthContext);
    const renderContext = useContext(MmBlocksRenderContext);
    const imagesMetadata = useContext(MmBlocksImagesMetadataContext);
    const inlineMarkdownActions = useContext(MmBlocksInlineMarkdownActionsContext);
    const [measuredLayoutWidth, setMeasuredLayoutWidth] = useState<number | undefined>(undefined);

    const contextLayoutWidth = measuredLayoutWidth ?? parentLayoutWidth;

    const handleLayout = useCallback((event: LayoutChangeEvent) => {
        const width = Math.round(event.nativeEvent.layout.width);
        if (width > 0) {
            setMeasuredLayoutWidth(width);
        }
    }, []);

    const containerChildLayout: 'column' | 'row' = block.flow === 'horizontal' ? 'row' : 'column';
    const flowStyle = block.flow === 'horizontal' ? style.containerHorizontal : style.containerVertical;
    const gapStyle = containerGapStyle(block.gap);
    const accent = block.accent_color;

    const maxHeightKey = block.max_height === 'small' || block.max_height === 'medium' || block.max_height === 'large' ? block.max_height : null;
    const maxHeightPx = maxHeightKey ? MM_CONTAINER_MAX_HEIGHT_PX[maxHeightKey] : null;

    const handleExpandBoundedContent = usePreventDoubleTap(useCallback(() => {
        if (!block.content?.length || !renderContext) {
            return;
        }

        const items = block.content.map((item, i) => (
            <BlockSwitch
                key={i}
                block={item}
                {...switchProps}
            />
        ));

        const payload: MmBlocksExpandedContentPayload = {
            channelId: renderContext.channelId,
            location: renderContext.location,
            imagesMetadata,
            inlineMarkdownActions,
            childLayout: containerChildLayout,
            renderContent: () => (
                <View style={[style.container, flowStyle, gapStyle]}>
                    {items}
                </View>
            ),
        };

        CallbackStore.setCallback(payload);
        navigateToScreen(Screens.MM_BLOCKS_CONTENT);
    }, [
        block.content,
        containerChildLayout,
        flowStyle,
        gapStyle,
        imagesMetadata,
        inlineMarkdownActions,
        renderContext,
        style.container,
        switchProps,
    ]));

    if (!block.content || block.content.length === 0) {
        return null;
    }

    const blockItems = block.content.map((item, i) => (
        <BlockSwitch
            key={i}
            block={item}
            {...switchProps}
        />
    ));

    let boundedContent: React.ReactNode = blockItems;
    if (maxHeightPx) {
        boundedContent = (
            <ClippedScrollContent
                maxHeight={maxHeightPx}
                onExpand={handleExpandBoundedContent}
                testID='mm_blocks.container.bounded'
            >
                {blockItems}
            </ClippedScrollContent>
        );
    }

    const inner = (
        <MmBlocksLayoutWidthContext.Provider value={contextLayoutWidth}>
            <MmBlocksChildLayoutContext.Provider value={containerChildLayout}>
                <View style={[style.container, flowStyle, gapStyle]}>
                    {boundedContent}
                </View>
            </MmBlocksChildLayoutContext.Provider>
        </MmBlocksLayoutWidthContext.Provider>
    );

    const containerStyle = [block.border && style.containerBorder, block.background === 'gray' && style.containerBgGray];
    if (!accent) {
        return (
            <View
                style={containerStyle}
                onLayout={handleLayout}
            >
                {inner}
            </View>
        );
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
        <View
            style={[containerStyle, style.containerAccent, accentStyle]}
            onLayout={handleLayout}
        >
            {inner}
        </View>
    );
};

type CollapsibleBlockProps = BlockSwitchProps & {block: MmCollapsibleBlock};

const CollapsibleBlock = ({block, ...switchProps}: CollapsibleBlockProps) => {
    const {theme} = switchProps;
    const style = getStyleSheet(theme);
    const interactionsEnabled = useContext(MmBlocksInteractionContext);
    const [collapsed, setCollapsed] = useState(block.collapsed !== false);
    const toggleCollapsed = usePreventDoubleTap(useCallback(() => {
        setCollapsed((prev) => !prev);
    }, []));

    const innerHeaderBlock = useMemo(() => ({
        type: 'container' as const,
        content: block.header,
    }), [block.header]);
    const innerContentBlock = useMemo(() => ({
        type: 'container' as const,
        content: block.content,
    }), [block.content]);

    if (!block.header?.length || !block.content?.length) {
        return null;
    }

    return (
        <View style={style.collapsible}>
            <Pressable
                onPress={toggleCollapsed}
                disabled={!interactionsEnabled}
                style={({pressed}) => [
                    style.collapsibleHeader,
                    interactionsEnabled && pressed && style.collapsibleHeaderPressed,
                ]}
                accessibilityRole='button'
                accessibilityState={{expanded: !collapsed}}
            >
                <CompassIcon
                    name={collapsed ? 'chevron-right' : 'chevron-down'}
                    size={18}
                    style={style.collapsibleChevron}
                />
                <View style={style.collapsibleHeaderBody}>
                    <ContainerBlock
                        block={innerHeaderBlock}
                        {...switchProps}
                    />
                </View>
            </Pressable>
            {!collapsed && (
                <View style={style.collapsibleContent}>
                    <ContainerBlock
                        block={innerContentBlock}
                        {...switchProps}
                    />
                </View>
            )}
        </View>
    );
};
