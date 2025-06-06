// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// components/video-controls/icons/SubtitlesIcon.tsx
import React from 'react';
import Svg, {Rect, Path} from 'react-native-svg';

interface IconProps {
    size?: number;
    color?: string;
    selected?: boolean;
}

const SubtitlesIcon: React.FC<IconProps> = ({size = 24, color = 'white', selected = false}) => {
    return (
        <Svg
            width={size}
            height={size}
            viewBox='0 0 24 24'
            fill='none'
        >
            {/* Speech bubble outline */}
            <Path
                d='M20 2H4C2.9 2 2 2.9 2 4V16C2 17.1 2.9 18 4 18H6L8 21L10 18H20C21.1 18 22 17.1 22 16V4C22 2.9 21.1 2 20 2Z'
                stroke={color}
                strokeWidth='1.5'
                fill={selected ? color : 'none'}
            />

            {/* Text lines */}
            <Rect
                x='5'
                y='7'
                width='8'
                height='1.5'
                fill={selected ? 'black' : color}
            />
            <Rect
                x='15'
                y='7'
                width='4'
                height='1.5'
                fill={selected ? 'black' : color}
            />
            <Rect
                x='5'
                y='10'
                width='6'
                height='1.5'
                fill={selected ? 'black' : color}
            />
            <Rect
                x='13'
                y='10'
                width='6'
                height='1.5'
                fill={selected ? 'black' : color}
            />
            <Rect
                x='5'
                y='13'
                width='9'
                height='1.5'
                fill={selected ? 'black' : color}
            />
        </Svg>
    );
};

export default SubtitlesIcon;
