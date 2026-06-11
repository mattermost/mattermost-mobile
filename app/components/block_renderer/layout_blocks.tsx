// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useContext, useEffect, useMemo, useState} from 'react';
import {Pressable, View, type LayoutChangeEvent, type ViewStyle} from 'react-native';
import Animated, {Easing, useAnimatedStyle, useSharedValue, withTiming} from 'react-native-reanimated';

import CompassIcon from '@components/compass_icon';
import {Screens} from '@constants';
import {usePreventDoubleTap} from '@hooks/utils';
import {navigateToScreen} from '@screens/navigation';
import CallbackStore from '@store/callback_store';

import {ButtonElement} from './button_element';
import ClippedScrollContent from './clipped_scroll_content';
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

const COLLAPSIBLE_ANIMATION_MS = 250;

export const BlockSwitch = ({block, onAction, theme}: BlockSwitchProps) => {
    switch (block.type) {
        case 'text':
            return (
                <TextBlock
                    block={block}
                    theme={theme}
                />
            );
        case 'image':
            return (
                <ImageBlock
                    block={block}
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
                    theme={theme}
                />
            );
        case 'container':
            return (
                <ContainerBlock
                    block={block}
                    onAction={onAction}
                    theme={theme}
                />
            );
        case 'collapsible':
            return (
                <CollapsibleBlock
                    block={block}
                    onAction={onAction}
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

        const expandedBlock: MmContainerBlock = {
            ...block,
            max_height: undefined,
        };

        const payload: MmBlocksExpandedContentPayload = {
            channelId: renderContext.channelId,
            location: renderContext.location,
            postId: renderContext.postId,
            imagesMetadata,
            inlineMarkdownActions,
            childLayout: containerChildLayout,
            renderContent: () => (
                <ContainerBlock
                    block={expandedBlock}
                    {...switchProps}
                />
            ),
        };

        CallbackStore.setCallback(payload);
        navigateToScreen(Screens.MM_BLOCKS_CONTENT);
    }, [block, containerChildLayout, imagesMetadata, inlineMarkdownActions, renderContext, switchProps]));

    if (!block.content || block.content.length === 0) {
        return null;
    }

    const blockItems = block.content.map((item, i) => (

        // Index keys are safe: block content is static and not reordered at runtime.
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
                containerPadding={block.border ? style.containerBorder.padding : 0}
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

    const containerBaseStyle = [block.border && style.containerBorder, block.background === 'gray' && style.containerBgGray];
    let accentStyles: ViewStyle[] = [];
    if (accent) {
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
        accentStyles = [style.containerAccent, accentStyle];
    }

    return (
        <View
            style={[containerBaseStyle, accentStyles]}
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
    const contentHeight = useSharedValue(0);
    const isExpanded = useSharedValue(!(block.collapsed !== false));
    const toggleCollapsed = usePreventDoubleTap(useCallback(() => {
        setCollapsed((prev) => !prev);
    }, []));

    useEffect(() => {
        isExpanded.value = !collapsed;
    }, [collapsed, isExpanded]);

    const onContentLayout = useCallback((event: LayoutChangeEvent) => {
        contentHeight.value = event.nativeEvent.layout.height;
    }, [contentHeight]);

    const chevronAnimatedStyle = useAnimatedStyle(() => ({
        transform: [{
            rotate: withTiming(isExpanded.value ? '90deg' : '0deg', {
                duration: COLLAPSIBLE_ANIMATION_MS,
                easing: Easing.out(Easing.cubic),
            }),
        }],
    }));

    const contentAnimatedStyle = useAnimatedStyle(() => ({
        height: withTiming(isExpanded.value ? contentHeight.value : 0, {
            duration: COLLAPSIBLE_ANIMATION_MS,
            easing: Easing.out(Easing.cubic),
        }),
        opacity: withTiming(isExpanded.value ? 1 : 0, {
            duration: COLLAPSIBLE_ANIMATION_MS,
            easing: Easing.out(Easing.cubic),
        }),
        overflow: 'hidden',
    }));

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
                <Animated.View style={chevronAnimatedStyle}>
                    <CompassIcon
                        name='chevron-right'
                        size={18}
                        style={style.collapsibleChevron}
                    />
                </Animated.View>
                <View style={style.collapsibleHeaderBody}>
                    <ContainerBlock
                        block={innerHeaderBlock}
                        {...switchProps}
                    />
                </View>
            </Pressable>
            <Animated.View
                pointerEvents={collapsed ? 'none' : 'auto'}
                style={[style.collapsibleContentClip, contentAnimatedStyle]}
            >
                <View
                    style={style.collapsibleContent}
                    onLayout={onContentLayout}
                >
                    <ContainerBlock
                        block={innerContentBlock}
                        {...switchProps}
                    />
                </View>
            </Animated.View>
        </View>
    );
};
