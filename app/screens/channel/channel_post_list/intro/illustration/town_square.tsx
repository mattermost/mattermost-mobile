// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import * as React from 'react';
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

const TownSquareIllustration = ({theme}: Props) => (
    <Svg
        width={130}
        height={92}
        viewBox='0 0 130 92'
        fill='none'
    >
        <Defs>
            <ClipPath id='clip0_4210_88396'>
                <Rect
                    width={130}
                    height={92}
                    fill='white'
                />
            </ClipPath>
        </Defs>
        <G clipPath='url(#clip0_4210_88396)'>
            <Path
                d='M2.50001 6.00001L2.5 21L127.5 21L127.5 65L66 65'
                stroke={theme.centerChannelColor}
                strokeOpacity={0.24}
                strokeLinecap='round'
            />
            <Path
                d='M2.49999 59L2.49999 32L29 32'
                stroke={theme.centerChannelColor}
                strokeOpacity={0.24}
                strokeLinecap='round'
            />
            <Path
                d='M18.5 60.5L18.5 46.5L106 46.5'
                stroke={theme.centerChannelColor}
                strokeOpacity={0.24}
                strokeLinecap='round'
            />
            <Circle
                cx={2.5}
                cy={3.5}
                r={2.5}
                fill={theme.centerChannelColor}
                fillOpacity={0.32}
            />
            <Circle
                cx={2.5}
                cy={61.5}
                r={2.5}
                fill={theme.centerChannelColor}
                fillOpacity={0.32}
            />
            <Circle
                cx={18.5}
                cy={61.5}
                r={2.5}
                fill={theme.centerChannelColor}
                fillOpacity={0.4}
            />
            <Circle
                cx={71}
                cy={49}
                r={43}
                fill={theme.centerChannelColor}
                fillOpacity={0.12}
            />
            <Path
                d='M109.748 82.5258L117.999 91V47C117.999 45.8954 117.104 45 115.999 45H74.9998C73.8952 45 72.9998 45.8954 72.9998 47V79.9211C72.9998 81.0256 73.8952 81.9211 74.9998 81.9211H108.315C108.855 81.9211 109.371 82.1391 109.748 82.5258Z'
                fill={'#28427B'}
            />
            <Circle
                opacity={0.48}
                cx={85.8309}
                cy={56.831}
                r={5.83099}
                fill={'#FFFFFF'}
            />
            <Path
                opacity={0.4}
                d='M94.9999 55H111'
                stroke={'#FFFFFF'}
                strokeLinecap='round'
            />
            <Path
                opacity={0.4}
                d='M80.9999 70H102.38'
                stroke={'#FFFFFF'}
                strokeLinecap='round'
            />
            <Path
                opacity={0.4}
                d='M80.9999 74H95.2535'
                stroke={'#FFFFFF'}
                strokeLinecap='round'
            />
            <Path
                opacity={0.4}
                d='M94.9999 59H109'
                stroke={'#FFFFFF'}
                strokeLinecap='round'
            />
            <Path
                opacity={0.4}
                d='M80.9999 66H92.014'
                stroke={'#FFFFFF'}
                strokeLinecap='round'
            />
            <Path
                opacity={0.4}
                d='M94.6064 66H106.268'
                stroke={'#FFFFFF'}
                strokeLinecap='round'
            />
            <Path
                d='M28.605 57.5638L15 71V2C15 0.895431 15.8954 0 17 0H83C84.1046 0 85 0.89543 85 2V54.9868C85 56.0914 84.1046 56.9868 83 56.9868H30.0103C29.4842 56.9868 28.9793 57.1941 28.605 57.5638Z'
                fill={theme.centerChannelBg}
            />
            <Path
                d='M28.2536 57.2081L15.5 69.8035V2C15.5 1.17157 16.1716 0.5 17 0.5H83C83.8284 0.5 84.5 1.17157 84.5 2V54.9868C84.5 55.8153 83.8284 56.4868 83 56.4868H30.0103C29.3527 56.4868 28.7215 56.746 28.2536 57.2081Z'
                stroke={theme.centerChannelColor}
                strokeOpacity={0.8}
            />
            <Circle
                cx={33}
                cy={19}
                r={9}
                fill={theme.centerChannelColor}
                fillOpacity={0.4}
            />
            <Path
                d='M48 15H64'
                stroke={theme.centerChannelColor}
                strokeOpacity={0.4}
                strokeLinecap='round'
            />
            <Path
                d='M25 39H69'
                stroke={theme.centerChannelColor}
                strokeOpacity={0.4}
                strokeLinecap='round'
            />
            <Path
                d='M25 45H47'
                stroke={theme.centerChannelColor}
                strokeOpacity={0.4}
                strokeLinecap='round'
            />
            <Path
                d='M48 21H73'
                stroke={theme.centerChannelColor}
                strokeOpacity={0.4}
                strokeLinecap='round'
            />
            <Path
                d='M25 33H42'
                stroke={theme.centerChannelColor}
                strokeOpacity={0.4}
                strokeLinecap='round'
            />
            <Path
                d='M46 33H64'
                stroke={theme.centerChannelColor}
                strokeOpacity={0.4}
                strokeLinecap='round'
            />
            <Circle
                cx={44}
                cy={65}
                r={2}
                fill={theme.centerChannelColor}
                fillOpacity={0.32}
            />
            <Circle
                cx={52}
                cy={65}
                r={2}
                fill={theme.centerChannelColor}
                fillOpacity={0.32}
            />
            <Circle
                cx={60}
                cy={65}
                r={2}
                fill={theme.centerChannelColor}
                fillOpacity={0.32}
            />
            <Path
                d='M101 33L83 33'
                stroke={theme.centerChannelColor}
                strokeOpacity={0.8}
                strokeLinecap='round'
                strokeLinejoin='round'
            />
            <Path
                d='M79 33L73 33'
                stroke={theme.centerChannelColor}
                strokeOpacity={0.8}
                strokeLinecap='round'
                strokeLinejoin='round'
            />
            <Path
                d='M70 33L68 33'
                stroke={theme.centerChannelColor}
                strokeOpacity={0.8}
                strokeLinecap='round'
                strokeLinejoin='round'
            />
        </G>
        <Defs>
            <ClipPath id='clip0_4210_88396'>
                <Rect
                    width={130}
                    height={92}
                    fill={'white'}
                />
            </ClipPath>
        </Defs>
    </Svg>
);

export default TownSquareIllustration;
