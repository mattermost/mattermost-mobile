// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import * as React from 'react';
import Svg, {
    G,
    Path,
    Circle,
    Rect,
    Defs,
    ClipPath,
} from 'react-native-svg';

import type {StyleProp, ViewStyle} from 'react-native';

type Props = {
    theme: Theme;
    styles: StyleProp<ViewStyle>;
};

const ChatSvg = ({theme, styles}: Props) => {
    return (
        <Svg
            width={189}
            height={147}
            viewBox='0 0 189 147'
            fill='none'
            style={styles}
        >
            <G clipPath='url(#clip0_4212_95420)'>
                <Rect
                    opacity={0.08}
                    width={75.3968}
                    height={75.3968}
                    rx={3.01587}
                    fill={theme.buttonBg}
                />
                <Rect
                    opacity={0.12}
                    x={45.2383}
                    y={75.3969}
                    width={143.254}
                    height={42.2222}
                    rx={3.01587}
                    fill={theme.buttonBg}
                />
                <Circle
                    cx={144.008}
                    cy={49.0079}
                    r={3.76984}
                    fill={theme.centerChannelColor}
                    fillOpacity={0.48}
                />
                <Circle
                    cx={164.366}
                    cy={49.0079}
                    r={3.76984}
                    fill={theme.centerChannelColor}
                    fillOpacity={0.48}
                />
                <Circle
                    cx={184.723}
                    cy={49.0079}
                    r={3.76984}
                    fill={theme.centerChannelColor}
                    fillOpacity={0.48}
                />
                <Path
                    d='M143.319 131.371L158.332 146.27V69.3651C158.332 67.6995 156.982 66.3492 155.316 66.3492H82.9352C81.2696 66.3492 79.9193 67.6995 79.9193 69.3651V127.48C79.9193 129.146 81.2696 130.496 82.9352 130.496H141.195C141.991 130.496 142.755 130.811 143.319 131.371Z'
                    fill='#28427B'
                />
                <Path
                    d='M101.031 98.0159H146.269'
                    stroke='#fff'
                    strokeWidth={1.50794}
                    strokeLinecap='round'
                />
                <Path
                    d='M101.031 108.572H129.682'
                    stroke='#fff'
                    strokeWidth={1.50794}
                    strokeLinecap='round'
                />
                <Path
                    d='M101.031 88.9683H116.111'
                    stroke='#fff'
                    strokeWidth={1.50794}
                    strokeLinecap='round'
                />
                <Path
                    d='M120.633 88.9683H140.236'
                    stroke='#fff'
                    strokeWidth={1.50794}
                    strokeLinecap='round'
                />
                <Path
                    d='M41.6267 104.898L21.1113 125.159V21.1111C21.1113 19.4455 22.4616 18.0952 24.1272 18.0952H123.651C125.317 18.0952 126.667 19.4455 126.667 21.1111V101.012C126.667 102.678 125.317 104.028 123.651 104.028H43.7459C42.9526 104.028 42.1912 104.34 41.6267 104.898Z'
                    fill={theme.centerChannelBg}
                />
                <Path
                    d='M24.127 18.8492H123.651C124.9 18.8493 125.913 19.8619 125.913 21.1109V101.012C125.913 102.261 124.9 103.274 123.651 103.274H43.7461C42.7544 103.274 41.8023 103.665 41.0967 104.362L21.8652 123.354V21.1109C21.8654 19.8619 22.8779 18.8493 24.127 18.8492Z'
                    stroke={theme.centerChannelColor}
                    strokeOpacity={0.8}
                    strokeWidth={1.50794}
                />
                <Circle
                    cx={48.2531}
                    cy={46.746}
                    r={13.5714}
                    fill={theme.centerChannelColor}
                    fillOpacity={0.32}
                />
                <Path
                    d='M70.873 40.7143H95'
                    stroke={theme.centerChannelColor}
                    strokeOpacity={0.48}
                    strokeWidth={1.50794}
                    strokeLinecap='round'
                />
                <Path
                    d='M36.1914 76.9048H111.588'
                    stroke={theme.centerChannelColor}
                    strokeOpacity={0.48}
                    strokeWidth={1.50794}
                    strokeLinecap='round'
                />
                <Path
                    d='M36.1914 87.4604H69.366'
                    stroke={theme.centerChannelColor}
                    strokeOpacity={0.48}
                    strokeWidth={1.50794}
                    strokeLinecap='round'
                />
                <Path
                    d='M70.873 49.7619H108.571'
                    stroke={theme.centerChannelColor}
                    strokeOpacity={0.48}
                    strokeWidth={1.50794}
                    strokeLinecap='round'
                />
                <Path
                    d='M36.1914 67.8572H61.8263'
                    stroke={theme.centerChannelColor}
                    strokeOpacity={0.48}
                    strokeWidth={1.50794}
                    strokeLinecap='round'
                />
                <Path
                    d='M67.8574 67.8572H95.0003'
                    stroke={theme.centerChannelColor}
                    strokeOpacity={0.48}
                    strokeWidth={1.50794}
                    strokeLinecap='round'
                />
                <Path
                    d='M13.571 59.5635L13.571 87.4604L29.4043 87.4604'
                    stroke={theme.centerChannelColor}
                    strokeOpacity={0.8}
                    strokeWidth={1.50794}
                    strokeLinecap='round'
                    strokeLinejoin='round'
                />
                <Path
                    d='M13.5723 55.0397L13.5723 45.9921'
                    stroke={theme.centerChannelColor}
                    strokeOpacity={0.8}
                    strokeWidth={1.50794}
                    strokeLinecap='round'
                    strokeLinejoin='round'
                />
                <Path
                    d='M13.5723 41.4683L13.5723 38.4524'
                    stroke={theme.centerChannelColor}
                    strokeOpacity={0.8}
                    strokeWidth={1.50794}
                    strokeLinecap='round'
                    strokeLinejoin='round'
                />
            </G>
            <Defs>
                <ClipPath id='clip0_4212_95420'>
                    <Rect
                        width={188.492}
                        height={146.27}
                        fill='#fff'
                    />
                </ClipPath>
            </Defs>
        </Svg>
    );
};

export default ChatSvg;
