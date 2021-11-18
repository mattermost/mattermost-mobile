// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import Svg, {Rect, G, Circle} from 'react-native-svg';

type ThemeThumbnailProps = {
    width: number;
    borderColorBase: string;
    borderColorMix: string;
    sidebarBg: string;
    sidebarText: string;
    sidebarUnreadText: string;
    onlineIndicator: string;
    awayIndicator: string;
    dndIndicator: string;
    centerChannelColor: string;
    centerChannelBg: string;
    newMessageSeparator: string;
    buttonBg: string;
}

function ThemeThumbnail({
    width = 180,
    borderColorBase = '#E0E1E3',
    borderColorMix = '#E0E1E3',
    sidebarBg = '#174AB5',
    sidebarText = '#86A1D9',
    sidebarUnreadText = 'white',
    onlineIndicator = '#3DB887',
    awayIndicator = '#FFBC1F',
    dndIndicator = '#D24B4E',
    centerChannelColor = '#E0E1E3',
    centerChannelBg = 'white',
    newMessageSeparator = '#1C58D9',
    buttonBg = '#15B7B7',
}: ThemeThumbnailProps): JSX.Element {
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
                fill={centerChannelBg}
                x='0'
                y='0'
                width={baseWidth}
                height={baseHeight}
            />
            <Rect
                fill={newMessageSeparator}
                x={sidebarWidth}
                y={(spacing * 4) + (rowHeight * 3)}
                width={postsContainerWidth}
                height='1'
            />
            <Rect
                fill={buttonBg}
                x={sidebarWidth + (spacing * 4)}
                y={(spacing * 8) + (rowHeight * 6) + 1}
                width={buttonWidth}
                height={rowHeight}
                rx={rowRadius}
            />
            <Rect
                fill={centerChannelColor}
                x={sidebarWidth + spacing}
                y={(spacing * 9) + (rowHeight * 7) + 1}
                width={postWidth}
                height={postInputHeight}
                rx={postInputHeight / 2}
            />
            <Rect
                fill={centerChannelBg}
                x={sidebarWidth + spacing + 1}
                y={(spacing * 9) + (rowHeight * 7) + 2}
                width={postWidth - 2}
                height={postInputHeight - 2}
                rx={(postInputHeight - 2) / 2}
            />
            <G fill={centerChannelColor}>
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
                    fill={sidebarBg}
                    x='0'
                    y='0'
                    width={sidebarWidth}
                    height={baseHeight}
                />
                <G fill={sidebarText}>
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
                    fill={onlineIndicator}
                    cx={spacing + rowRadius}
                    cy={(spacing * 3) + (rowHeight * 2) + rowRadius}
                    r={rowRadius}
                />
                <Circle
                    fill={awayIndicator}
                    cx={spacing + rowRadius}
                    cy={(spacing * 6) + (rowHeight * 5) + rowRadius}
                    r={rowRadius}
                />
                <Circle
                    fill={dndIndicator}
                    cx={spacing + rowRadius}
                    cy={(spacing * 9) + (rowHeight * 8) + rowRadius}
                    r={rowRadius}
                />
                <G fill={sidebarUnreadText}>
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
}

export default ThemeThumbnail;
