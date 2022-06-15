// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import Svg, {Rect, G, Circle} from 'react-native-svg';

import {changeOpacity} from '@utils/theme';

type ThemeThumbnailProps = {
    borderColorBase: string;
    borderColorMix: string;
    theme: Theme;
    width: number;
}

const ThemeThumbnail = ({borderColorBase, borderColorMix, theme, width}: ThemeThumbnailProps): JSX.Element => {
    // the original height of the thumbnail
    const baseWidth = 180;
    const baseHeight = 134;

    // calculate actual height proportionally to base size
    const height = Math.round((width * baseHeight) / baseWidth);

    // convenience values of various sub elements of the thumbnail
    const sidebarWidth = 80;
    const postsContainerWidth = 100;
    const spacing = 8;
    const rowHeight = 6;
    const rowRadius = rowHeight / 2;
    const postInputHeight = 10;
    const postWidth = postsContainerWidth - (spacing * 2);
    const channelNameWidth = sidebarWidth - (spacing * 3) - (rowHeight * 2);
    const buttonWidth = postsContainerWidth - (spacing * 8);

    return (
        <Svg
            width={width}
            height={height}
            viewBox={`-2 -2 ${baseWidth + 4} ${baseHeight + 4}`}
            fill='none'
        >
            <Rect
                fill={theme.centerChannelBg}
                x='0'
                y='0'
                width={baseWidth}
                height={baseHeight}
            />
            <Rect
                fill={theme.newMessageSeparator}
                x={sidebarWidth}
                y={(spacing * 4) + (rowHeight * 3)}
                width={postsContainerWidth}
                height='1'
            />
            <Rect
                fill={theme.buttonBg}
                x={sidebarWidth + (spacing * 4)}
                y={(spacing * 8) + (rowHeight * 6) + 1}
                width={buttonWidth}
                height={rowHeight}
                rx={rowRadius}
            />
            <Rect
                fill={changeOpacity(theme.centerChannelColor, 0.16)}
                x={sidebarWidth + spacing}
                y={(spacing * 9) + (rowHeight * 7) + 1}
                width={postWidth}
                height={postInputHeight}
                rx={postInputHeight / 2}
            />
            <Rect
                fill={theme.centerChannelBg}
                x={sidebarWidth + spacing + 1}
                y={(spacing * 9) + (rowHeight * 7) + 2}
                width={postWidth - 2}
                height={postInputHeight - 2}
                rx={(postInputHeight - 2) / 2}
            />
            <G fill={changeOpacity(theme.centerChannelColor, 0.16)}>
                <Rect
                    x={sidebarWidth + spacing}
                    y={spacing}
                    width={postWidth}
                    height={rowHeight}
                    rx={rowRadius}
                />
                <Rect
                    x={sidebarWidth + spacing}
                    y={(spacing * 2) + rowHeight}
                    width={postWidth}
                    height={rowHeight}
                    rx={rowRadius}
                />
                <Rect
                    x={sidebarWidth + spacing}
                    y={(spacing * 3) + (rowHeight * 2)}
                    width={postWidth}
                    height={rowHeight}
                    rx={rowRadius}
                />
                <Rect
                    x={sidebarWidth + spacing}
                    y={(spacing * 5) + (rowHeight * 3) + 1}
                    width={postWidth}
                    height={rowHeight}
                    rx={rowRadius}
                />
                <Rect
                    x={sidebarWidth + spacing}
                    y={(spacing * 6) + (rowHeight * 4) + 1}
                    width={postWidth}
                    height={rowHeight}
                    rx={rowRadius}
                />
                <Rect
                    x={sidebarWidth + spacing}
                    y={(spacing * 7) + (rowHeight * 5) + 1}
                    width={postWidth}
                    height={rowHeight}
                    rx={rowRadius}
                />
            </G>
            <G>
                <Rect
                    fill={theme.sidebarBg}
                    x='0'
                    y='0'
                    width={sidebarWidth}
                    height={baseHeight}
                />
                <G fill={changeOpacity(theme.sidebarText, 0.48)}>
                    <Circle
                        cx={spacing + rowRadius}
                        cy={spacing + rowRadius}
                        r={rowRadius}
                    />
                    <Circle
                        cx={spacing + rowRadius}
                        cy={(spacing * 2) + rowHeight + rowRadius}
                        r={rowRadius}
                    />
                    <Circle
                        cx={spacing + rowRadius}
                        cy={(spacing * 4) + (rowHeight * 3) + rowRadius}
                        r={rowRadius}
                    />
                    <Circle
                        cx={spacing + rowRadius}
                        cy={(spacing * 5) + (rowHeight * 4) + rowRadius}
                        r={rowRadius}
                    />
                    <Circle
                        cx={spacing + rowRadius}
                        cy={(spacing * 7) + (rowHeight * 6) + rowRadius}
                        r={rowRadius}
                    />
                    <Circle
                        cx={spacing + rowRadius}
                        cy={(spacing * 8) + (rowHeight * 7) + rowRadius}
                        r={rowRadius}
                    />
                    <Rect
                        x={(spacing * 1.5) + rowHeight}
                        y={spacing}
                        width={channelNameWidth}
                        height={rowHeight}
                        rx={rowRadius}
                    />
                    <Rect
                        x={(spacing * 1.5) + rowHeight}
                        y={(spacing * 2) + rowHeight}
                        width={channelNameWidth}
                        height={rowHeight}
                        rx={rowRadius}
                    />
                    <Rect
                        x={(spacing * 1.5) + rowHeight}
                        y={(spacing * 4) + (rowHeight * 3)}
                        width={channelNameWidth}
                        height={rowHeight}
                        rx={rowRadius}
                    />
                    <Rect
                        x={(spacing * 1.5) + rowHeight}
                        y={(spacing * 5) + (rowHeight * 4)}
                        width={channelNameWidth}
                        height={rowHeight}
                        rx={rowRadius}
                    />
                    <Rect
                        x={(spacing * 1.5) + rowHeight}
                        y={(spacing * 6) + (rowHeight * 5)}
                        width={channelNameWidth}
                        height={rowHeight}
                        rx={rowRadius}
                    />
                    <Rect
                        x={(spacing * 1.5) + rowHeight}
                        y={(spacing * 7) + (rowHeight * 6)}
                        width={channelNameWidth}
                        height={rowHeight}
                        rx={rowRadius}
                    />
                    <Rect
                        x={(spacing * 1.5) + rowHeight}
                        y={(spacing * 8) + (rowHeight * 7)}
                        width={channelNameWidth}
                        height={rowHeight}
                        rx={rowRadius}
                    />
                    <Rect
                        x={(spacing * 1.5) + rowHeight}
                        y={(spacing * 9) + (rowHeight * 8)}
                        width={channelNameWidth}
                        height={rowHeight}
                        rx={rowRadius}
                    />
                </G>
                <Circle
                    fill={theme.onlineIndicator}
                    cx={spacing + rowRadius}
                    cy={(spacing * 3) + (rowHeight * 2) + rowRadius}
                    r={rowRadius}
                />
                <Circle
                    fill={theme.awayIndicator}
                    cx={spacing + rowRadius}
                    cy={(spacing * 6) + (rowHeight * 5) + rowRadius}
                    r={rowRadius}
                />
                <Circle
                    fill={theme.dndIndicator}
                    cx={spacing + rowRadius}
                    cy={(spacing * 9) + (rowHeight * 8) + rowRadius}
                    r={rowRadius}
                />
                <G fill={theme.sidebarUnreadText}>
                    <Circle
                        cx={(spacing * 2.5) + rowHeight + channelNameWidth}
                        cy={(spacing * 3) + (rowHeight * 2) + rowRadius}
                        r={rowRadius}
                    />
                    <Rect
                        x={(spacing * 1.5) + rowHeight}
                        y={(spacing * 3) + (rowHeight * 2)}
                        width={channelNameWidth}
                        height={rowHeight}
                        rx={rowRadius}
                    />
                </G>
            </G>
            <Rect
                x='-1'
                y='-1'
                width={baseWidth + 2}
                height={baseHeight + 2}
                rx='4'
                stroke={borderColorBase}
                strokeWidth='2'
            />
            <Rect
                x='-1'
                y='-1'
                width={baseWidth + 2}
                height={baseHeight + 2}
                rx='4'
                stroke={borderColorMix}
                strokeWidth='2'
            />
        </Svg>
    );
};

export default ThemeThumbnail;
