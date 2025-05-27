// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React from 'react';
import Svg, {Circle, Path} from 'react-native-svg';

interface IconProps {
    size?: number;
    color?: string;
}

const PlaybackSpeedIcon: React.FC<IconProps> = ({size = 24, color = 'white'}) => {
    return (
        <Svg
            width={size}
            height={size}
            viewBox='0 0 24 24'
            fill='none'
        >
            {/* Outer circle (clock face) */}
            <Circle
                cx='12'
                cy='12'
                r='10'
                stroke={color}
                strokeWidth='1'
                fill='none'
            />

            {/* Hour markers (dots) - positioned at 12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11 o'clock */}
            {/* 12 o'clock */}
            <Circle
                cx='12'
                cy='4'
                r='1'
                fill={color}
            />

            {/* 1 o'clock */}
            <Circle
                cx='15.5'
                cy='5.5'
                r='1'
                fill={color}
            />

            {/* 2 o'clock */}
            <Circle
                cx='18.5'
                cy='8.5'
                r='1'
                fill={color}
            />

            {/* 3 o'clock */}
            <Circle
                cx='20'
                cy='12'
                r='1'
                fill={color}
            />

            {/* 4 o'clock */}
            <Circle
                cx='18.5'
                cy='15.5'
                r='1'
                fill={color}
            />

            {/* 8 o'clock */}
            <Circle
                cx='5.5'
                cy='15.5'
                r='1'
                fill={color}
            />

            {/* 9 o'clock */}
            <Circle
                cx='4'
                cy='12'
                r='1'
                fill={color}
            />

            {/* 10 o'clock */}
            <Circle
                cx='5.5'
                cy='8.5'
                r='1'
                fill={color}
            />

            {/* 11 o'clock */}
            <Circle
                cx='8.5'
                cy='5.5'
                r='1'
                fill={color}
            />

            {/* Clock hand pointing to about 2 o'clock (indicating speed/fast) */}
            <Path
                d='M12 12L15 8.5'
                stroke={color}
                strokeWidth='2'
                strokeLinecap='round'
            />

            {/* Center dot */}
            <Circle
                cx='12'
                cy='12'
                r='1.5'
                fill={color}
            />
        </Svg>
    );
};

export default PlaybackSpeedIcon;
