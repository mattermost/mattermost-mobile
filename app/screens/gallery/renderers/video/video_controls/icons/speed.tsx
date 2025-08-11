// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React from 'react';
import Svg, {Circle, Path} from 'react-native-svg';

interface IconProps {
    size?: number;
    color?: string;
}

const hourMarkers = [
    {cx: '12', cy: '4'}, // 12 o'clock
    {cx: '15.5', cy: '5.5'}, // 1 o'clock
    {cx: '18.5', cy: '8.5'}, // 2 o'clock
    {cx: '20', cy: '12'}, // 3 o'clock
    {cx: '18.5', cy: '15.5'}, // 4 o'clock
    {cx: '15.5', cy: '18.5'}, // 5 o'clock
    {cx: '5.5', cy: '15.5'}, // 8 o'clock
    {cx: '4', cy: '12'}, // 9 o'clock
    {cx: '5.5', cy: '8.5'}, // 10 o'clock
    {cx: '8.5', cy: '5.5'}, // 11 o'clock
];

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

            {hourMarkers.map((marker) => (
                <Circle
                    key={`${marker.cx}-${marker.cy}`}
                    cx={marker.cx}
                    cy={marker.cy}
                    r='1'
                    fill={color}
                />
            ))}

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
