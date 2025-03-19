// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import * as React from 'react';
import Svg, {Circle, Path, G, Defs, ClipPath, Rect} from 'react-native-svg';

import {useTheme} from '@context/theme';

function SvgComponent() {
    const theme = useTheme();

    return (
        <Svg
            width={125}
            height={97}
            viewBox='0 0 125 97'
            fill='none'
        >
            <G clipPath='url(#clip0_4425_147238)'>
                <Rect
                    opacity={0.08}
                    width={50}
                    height={50}
                    rx={2}
                    fill={theme.sidebarText}
                />
                <Rect
                    x={30}
                    y={50}
                    width={95}
                    height={28}
                    rx={2}
                    fill={theme.sidebarText}
                    fillOpacity={0.08}
                />
                <Circle
                    cx={92.5}
                    cy={35.5}
                    r={2.5}
                    fill={theme.sidebarText}
                    fillOpacity={0.32}
                />
                <Circle
                    cx={104}
                    cy={35.5}
                    r={2.5}
                    fill={theme.sidebarText}
                    fillOpacity={0.32}
                />
                <Circle
                    cx={115.5}
                    cy={35.5}
                    r={2.5}
                    fill={theme.sidebarText}
                    fillOpacity={0.32}
                />
                <Path
                    d='M95.0443 87.1199L105 97V46C105 44.8954 104.105 44 103 44H55C53.8954 44 53 44.8954 53 46V84.5395C53 85.644 53.8954 86.5395 55 86.5395H93.6355C94.1633 86.5395 94.6697 86.7481 95.0443 87.1199Z'
                    fill='#32539A'
                />
                <Path
                    opacity={0.4}
                    d='M67 65H97'
                    stroke={'white'}
                    strokeLinecap='round'
                />
                <Path
                    opacity={0.4}
                    d='M67 72H86'
                    stroke={'white'}
                    strokeLinecap='round'
                />
                <Path
                    opacity={0.4}
                    d='M67 59H77'
                    stroke={'white'}
                    strokeLinecap='round'
                />
                <Path
                    opacity={0.4}
                    d='M80 59H93'
                    stroke={'white'}
                    strokeLinecap='round'
                />
                <Path
                    d='M27.2536 69.2081L14.5 81.8035V14C14.5 13.1716 15.1716 12.5 16 12.5H82C82.8284 12.5 83.5 13.1716 83.5 14V66.9868C83.5 67.8153 82.8284 68.4868 82 68.4868H29.0103C28.3527 68.4868 27.7215 68.746 27.2536 69.2081Z'
                    fill={theme.sidebarBg}
                    stroke={theme.sidebarText}
                />
                <Path
                    d='M47 27H63'
                    stroke={theme.sidebarText}
                    strokeOpacity={0.56}
                    strokeLinecap='round'
                />
                <Path
                    d='M24 51H74'
                    stroke={theme.sidebarText}
                    strokeOpacity={0.56}
                    strokeLinecap='round'
                />
                <Path
                    d='M24 58H46'
                    stroke={theme.sidebarText}
                    strokeOpacity={0.56}
                    strokeLinecap='round'
                />
                <Path
                    d='M47 33H72'
                    stroke={theme.sidebarText}
                    strokeOpacity={0.56}
                    strokeLinecap='round'
                />
                <Path
                    d='M24 45H41'
                    stroke={theme.sidebarText}
                    strokeOpacity={0.64}
                    strokeLinecap='round'
                />
                <Path
                    d='M45 45H63'
                    stroke={theme.sidebarText}
                    strokeOpacity={0.56}
                    strokeLinecap='round'
                />
                <Path
                    d='M32 40C36.9706 40 41 35.9706 41 31C41 26.0294 36.9706 22 32 22C27.0294 22 23 26.0294 23 31C23 35.9706 27.0294 40 32 40Z'
                    fill={theme.onlineIndicator}
                />
                <Path
                    d='M28 31.5L31 34.5L37 28.5'
                    stroke={theme.sidebarBg}
                    strokeLinecap='round'
                    strokeLinejoin='round'
                />
            </G>
            <Defs>
                <ClipPath id='clip0_4425_147238'>
                    <Rect
                        width={125}
                        height={97}
                        fill='white'
                    />
                </ClipPath>
            </Defs>
        </Svg>
    );
}

export default SvgComponent;
