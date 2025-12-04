// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import * as React from 'react';
import Svg, {G, Rect, Path, Circle, Defs, ClipPath} from 'react-native-svg';

import {useTheme} from '@context/theme';

const ErrorStateIcon = () => {
    const theme = useTheme();
    return (
        <Svg
            width={196}
            height={122}
            fill='none'
        >
            <G clipPath='url(#a)'>
                <Rect
                    width={181}
                    height={78}
                    x={5.745}
                    y={23.5}
                    fill={theme.buttonBg}
                    fillOpacity={0.12}
                    rx={5.625}
                />
                <Path
                    stroke={theme.centerChannelColor}
                    strokeLinecap='round'
                    strokeOpacity={0.24}
                    d='m14 12.5 5.5 5.5v54h21'
                />
                <Circle
                    cx={2.5}
                    cy={2.5}
                    r={2.5}
                    fill={theme.centerChannelColor}
                    fillOpacity={0.48}
                    transform='matrix(1 0 0 -1 10 13.5)'
                />
                <Path
                    stroke={theme.centerChannelColor}
                    strokeLinecap='round'
                    strokeOpacity={0.24}
                    d='m7 36.5 5.5 5.5v39h165v29'
                />
                <Circle
                    cx={2.5}
                    cy={2.5}
                    r={2.5}
                    fill={theme.centerChannelColor}
                    fillOpacity={0.48}
                    transform='matrix(1 0 0 -1 175 113.5)'
                />
                <Circle
                    cx={2.5}
                    cy={2.5}
                    r={2.5}
                    fill={theme.centerChannelColor}
                    fillOpacity={0.48}
                    transform='matrix(1 0 0 -1 3 37.5)'
                />
                <Path
                    fill={theme.centerChannelColor}
                    fillOpacity={0.24}
                    d='M61.876 23.5h67.739l4.13 93h-76l4.13-93Z'
                    opacity={0.32}
                />
                <Path
                    fill={theme.centerChannelColor}
                    fillOpacity={0.48}
                    d='M49.745 121.5h92v-5h-92z'
                    opacity={0.32}
                />
                <Rect
                    width={131}
                    height={86}
                    x={29.745}
                    y={17.5}
                    fill={theme.centerChannelBg}
                    stroke={theme.centerChannelColor}
                    strokeWidth={4}
                    rx={4}
                />
                <Path
                    fill={theme.centerChannelColor}
                    fillOpacity={0.24}
                    d='M60.025 45.742a8.121 8.121 0 1 0 0-16.242 8.121 8.121 0 0 0 0 16.242Z'
                />
                <Path
                    stroke={theme.centerChannelBg}
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={1.19}
                    d='m56.203 37.223 2.816 2.787 4.828-4.778'
                />
                <Path
                    stroke={theme.centerChannelColor}
                    strokeLinecap='round'
                    d='M72.053 33.916h22.48M96.943 33.916h9.635M108.984 33.916h4.015'
                />
                <Path
                    fill={theme.centerChannelColor}
                    fillOpacity={0.24}
                    d='M122.987 36.726H72.053v6.076h50.934v-6.076Z'
                    opacity={0.5}
                />
                <Path
                    fill={theme.centerChannelColor}
                    fillOpacity={0.24}
                    d='M60.025 69.011a8.121 8.121 0 1 0 0-16.242 8.121 8.121 0 0 0 0 16.242Z'
                />
                <Path
                    stroke={theme.centerChannelBg}
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={1.19}
                    d='m56.203 60.492 2.816 2.787 4.828-4.778'
                />
                <Path
                    stroke={theme.centerChannelColor}
                    strokeLinecap='round'
                    d='M72.053 57.185h22.48M96.943 57.185h9.635M108.984 57.185h4.015'
                />
                <Path
                    fill={theme.centerChannelColor}
                    fillOpacity={0.24}
                    d='M138.987 59.995H72.053v6.076h66.934v-6.076Z'
                    opacity={0.5}
                />
                <Path
                    fill={theme.centerChannelBg}
                    stroke={theme.centerChannelColor}
                    d='M54.5 80.982h84v11.035h-84z'
                />
                <Path
                    fill={theme.centerChannelColor}
                    fillOpacity={0.24}
                    d='M57.01 83.491h78.982v6.018H57.01z'
                    opacity={0.3}
                />
                <Path
                    fill={theme.centerChannelColor}
                    fillOpacity={0.24}
                    d='M57.01 83.491h52.655v6.018H57.01z'
                />
                <Path
                    stroke={theme.centerChannelColor}
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    d='M150 110h-27.5'
                />
                <Path
                    stroke={theme.centerChannelColor}
                    strokeLinecap='round'
                    d='M119 110h-6M110 110h-6'
                />
            </G>
            <Path
                fill={theme.awayIndicator}
                stroke={theme.centerChannelColor}
                strokeWidth={0.987}
                d='M159.518.507c.991 0 1.86.688 2.491 1.803l.123.228 21.69 42.464.118.24c.555 1.198.559 2.367-.015 3.276-.61.964-1.782 1.49-3.243 1.49h-42.353c-1.453 0-2.618-.526-3.225-1.489-.61-.965-.57-2.23.082-3.512v-.001l21.699-42.468.002-.004c.651-1.246 1.574-2.027 2.631-2.027Z'
            />
            <Path
                stroke={theme.centerChannelColor}
                strokeLinecap='round'
                strokeWidth={0.987}
                d='m165.949 3.496 2.579 4.992m16.973 32.865-4.941-9.568-1.29-2.497-1.718-3.328-2.364-4.576m-1.719-3.328-3.223-6.24'
            />
            <Path
                fill={theme.centerChannelColor}
                d='m156.102 18.47 2.23 14.93a1.177 1.177 0 0 0 1.177 1.09 1.18 1.18 0 0 0 1.176-1.09l2.23-14.93c.406-5.82-7.225-5.82-6.813 0ZM159.506 36.098a3.425 3.425 0 0 1 1.896.576 3.401 3.401 0 0 1 1.447 3.495 3.395 3.395 0 0 1-.936 1.74 3.421 3.421 0 0 1-3.722.736 3.41 3.41 0 0 1-1.532-1.254 3.395 3.395 0 0 1 1.538-5.036c.415-.17.86-.258 1.309-.257Z'
            />
            <Path
                stroke={theme.centerChannelColor}
                strokeLinecap='round'
                strokeWidth={0.987}
                d='M165.116 53h16.64'
            />
            <Defs>
                <ClipPath id='a'>
                    <Path
                        fill={theme.centerChannelBg}
                        d='M0 1.5h196v120H0z'
                    />
                </ClipPath>
            </Defs>
        </Svg>
    );
};

export default ErrorStateIcon;
