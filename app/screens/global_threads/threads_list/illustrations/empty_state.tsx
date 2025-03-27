// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import Svg, {
    Circle,
    ClipPath,
    Defs,
    G,
    Path,
    Rect,
} from 'react-native-svg';

type Props = {
    theme: Theme;
};

function EmptyStateIllustration({theme}: Props) {
    return (
        <Svg
            width={125}
            height={97}
            viewBox='0 0 125 97'
            fill='none'
        >
            <G clipPath='url(#clip0_4210_74752)'>
                <Rect
                    opacity={0.08}
                    x={0.004}
                    width={50}
                    height={50}
                    rx={2}
                    fill={theme.buttonBg}
                />
                <Rect
                    opacity={0.12}
                    x={30.004}
                    y={50}
                    width={95}
                    height={28}
                    rx={2}
                    fill={theme.buttonBg}
                />
                <Circle
                    cx={95.504}
                    cy={32.5}
                    r={2.5}
                    fill={theme.centerChannelColor}
                    fillOpacity={0.48}
                />
                <Circle
                    cx={109.004}
                    cy={32.5}
                    r={2.5}
                    fill={theme.centerChannelColor}
                    fillOpacity={0.48}
                />
                <Circle
                    cx={122.504}
                    cy={32.5}
                    r={2.5}
                    fill={theme.centerChannelColor}
                    fillOpacity={0.48}
                />
                <Path
                    d='M95.0482 87.1199L105.004 97V46C105.004 44.8954 104.108 44 103.004 44H55.0039C53.8993 44 53.0039 44.8954 53.0039 46V84.5395C53.0039 85.644 53.8993 86.5395 55.0039 86.5395H93.6394C94.1672 86.5395 94.6736 86.7481 95.0482 87.1199Z'
                    fill='#32539A'
                />
                <Path
                    d='M67.0039 65H97.0039'
                    stroke={theme.centerChannelBg}
                    strokeOpacity={0.56}
                    strokeLinecap='round'
                />
                <Path
                    d='M67.0039 72H86.0039'
                    stroke={theme.centerChannelBg}
                    strokeOpacity={0.56}
                    strokeLinecap='round'
                />
                <Path
                    d='M67.0039 59H77.0039'
                    stroke={theme.centerChannelBg}
                    strokeOpacity={0.56}
                    strokeLinecap='round'
                />
                <Path
                    d='M80.0039 59H93.0039'
                    stroke={theme.centerChannelBg}
                    strokeOpacity={0.56}
                    strokeLinecap='round'
                />
                <Path
                    d='M27.6089 69.5638L14.0039 83V14C14.0039 12.8954 14.8993 12 16.0039 12H82.0039C83.1085 12 84.0039 12.8954 84.0039 14V66.9868C84.0039 68.0914 83.1085 68.9868 82.0039 68.9868H29.0142C28.4881 68.9868 27.9832 69.1941 27.6089 69.5638Z'
                    fill={theme.centerChannelBg}
                />
                <Path
                    d='M27.2575 69.2081L14.5039 81.8035V14C14.5039 13.1716 15.1755 12.5 16.0039 12.5H82.0039C82.8323 12.5 83.5039 13.1716 83.5039 14V66.9868C83.5039 67.8153 82.8323 68.4868 82.0039 68.4868H29.0142C28.3566 68.4868 27.7254 68.746 27.2575 69.2081Z'
                    stroke={theme.centerChannelColor}
                    strokeOpacity={0.8}
                />
                <Circle
                    cx={32.004}
                    cy={31}
                    r={9}
                    fill={theme.centerChannelColor}
                    fillOpacity={0.32}
                />
                <Path
                    d='M47.0039 27H63.0039'
                    stroke={theme.centerChannelColor}
                    strokeOpacity={0.48}
                    strokeLinecap='round'
                />
                <Path
                    d='M24.0039 51H74.0039'
                    stroke={theme.centerChannelColor}
                    strokeOpacity={0.48}
                    strokeLinecap='round'
                />
                <Path
                    d='M24.0039 58H46.0039'
                    stroke={theme.centerChannelColor}
                    strokeOpacity={0.48}
                    strokeLinecap='round'
                />
                <Path
                    d='M47.0039 33H72.0039'
                    stroke={theme.centerChannelColor}
                    strokeOpacity={0.48}
                    strokeLinecap='round'
                />
                <Path
                    d='M24.0039 45H41.0039'
                    stroke={theme.centerChannelColor}
                    strokeOpacity={0.48}
                    strokeLinecap='round'
                />
                <Path
                    d='M45.0039 45H63.0039'
                    stroke={theme.centerChannelColor}
                    strokeOpacity={0.48}
                    strokeLinecap='round'
                />
                <Path
                    d='M9.0039 39.5L9.0039 58L19.5039 58'
                    stroke={theme.centerChannelColor}
                    strokeOpacity={0.8}
                    strokeLinecap='round'
                    strokeLinejoin='round'
                />
                <Path
                    d='M9.00391 36.5L9.00391 30.5'
                    stroke={theme.centerChannelColor}
                    strokeOpacity={0.8}
                    strokeLinecap='round'
                    strokeLinejoin='round'
                />
                <Path
                    d='M9.00391 27.5L9.00391 25.5'
                    stroke={theme.centerChannelColor}
                    strokeOpacity={0.8}
                    strokeLinecap='round'
                    strokeLinejoin='round'
                />
            </G>
            <Defs>
                <ClipPath id='clip0_4210_74752'>
                    <Rect
                        width={125}
                        height={97}
                        fill='white'
                        transform='translate(0.004)'
                    />
                </ClipPath>
            </Defs>
        </Svg>
    );
}

export default EmptyStateIllustration;
