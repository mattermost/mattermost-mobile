// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {Svg, G, Path, Circle, Rect, Defs, ClipPath} from 'react-native-svg';

import {changeOpacity} from '@utils/theme';

type Props = {
    theme: Theme;
};

const PrivateChannelIllustration = ({theme}: Props) => (
    <Svg
        width={130}
        height={102}
        viewBox='0 0 130 102'
        fill='none'
    >
        <G clipPath='url(#clip0_4212_90419)'>
            <Path
                d='M2.50001 16L2.5 31L127.5 31L127.5 75L66 75'
                stroke={changeOpacity(theme.centerChannelColor, 0.32)}
                strokeLinecap='round'
            />
            <Path
                d='M2.5 69L2.5 42L29 42'
                stroke={changeOpacity(theme.centerChannelColor, 0.32)}
                strokeLinecap='round'
            />
            <Path
                d='M18.5 70.5L18.5 56.5L106 56.5'
                stroke={changeOpacity(theme.centerChannelColor, 0.32)}
                strokeLinecap='round'
            />
            <Circle
                cx={2.5}
                cy={2.5}
                r={2.5}
                transform='matrix(1 8.74228e-08 8.74228e-08 -1 0 16)'
                fill={changeOpacity(theme.centerChannelColor, 0.32)}
            />
            <Circle
                cx={2.5}
                cy={2.5}
                r={2.5}
                transform='matrix(1 8.74228e-08 8.74228e-08 -1 0 74)'
                fill={changeOpacity(theme.centerChannelColor, 0.32)}
            />
            <Circle
                cx={2.5}
                cy={2.5}
                r={2.5}
                transform='matrix(1 8.74228e-08 8.74228e-08 -1 16 74)'
                fill={changeOpacity(theme.centerChannelColor, 0.32)}
            />
            <Circle
                cx={71}
                cy={59}
                r={43}
                fill={changeOpacity(theme.centerChannelColor, 0.12)}
            />
            <Path
                d='M110.748 91.5258L119 100V56C119 54.8954 118.105 54 117 54H76.0005C74.8959 54 74.0005 54.8954 74.0005 56V88.9211C74.0005 90.0256 74.8959 90.9211 76.0005 90.9211H109.316C109.855 90.9211 110.372 91.1391 110.748 91.5258Z'
                fill='#28427B'
            />
            <Circle
                opacity={0.48}
                cx={86.831}
                cy={65.831}
                r={5.83099}
                fill={theme.buttonColor}
            />
            <Path
                opacity={0.4}
                d='M96 64H112'
                stroke={theme.buttonColor}
                strokeLinecap='round'
            />
            <Path
                opacity={0.4}
                d='M82 79H103.38'
                stroke={theme.buttonColor}
                strokeLinecap='round'
            />
            <Path
                opacity={0.4}
                d='M82 83H96.2535'
                stroke={theme.buttonColor}
                strokeLinecap='round'
            />
            <Path
                opacity={0.4}
                d='M96 68H110'
                stroke={theme.buttonColor}
                strokeLinecap='round'
            />
            <Path
                opacity={0.4}
                d='M82 75H93.0141'
                stroke={theme.buttonColor}
                strokeLinecap='round'
            />
            <Path
                opacity={0.4}
                d='M95.6064 75H107.268'
                stroke={theme.buttonColor}
                strokeLinecap='round'
            />
            <Path
                d='M28.605 67.5638L15 81V12C15 10.8954 15.8954 10 17 10H83C84.1046 10 85 10.8954 85 12V64.9868C85 66.0914 84.1046 66.9868 83 66.9868H30.0103C29.4842 66.9868 28.9793 67.1941 28.605 67.5638Z'
                fill={theme.centerChannelBg}
            />
            <Path
                d='M28.2536 67.2081L15.5 79.8035V12C15.5 11.1716 16.1716 10.5 17 10.5H83C83.8284 10.5 84.5 11.1716 84.5 12V64.9868C84.5 65.8153 83.8284 66.4868 83 66.4868H30.0103C29.3527 66.4868 28.7215 66.746 28.2536 67.2081Z'
                stroke={changeOpacity(theme.centerChannelColor, 0.8)}
            />
            <Circle
                cx={33}
                cy={29}
                r={9}
                fill={changeOpacity(theme.centerChannelColor, 0.4)}
            />
            <Path
                d='M48 25H64'
                stroke={changeOpacity(theme.centerChannelColor, 0.4)}
                strokeLinecap='round'
            />
            <Path
                d='M25 49H62'
                stroke={changeOpacity(theme.centerChannelColor, 0.4)}
                strokeLinecap='round'
            />
            <Path
                d='M25 55H47'
                stroke={changeOpacity(theme.centerChannelColor, 0.4)}
                strokeLinecap='round'
            />
            <Path
                d='M48 31H73'
                stroke={changeOpacity(theme.centerChannelColor, 0.4)}
                strokeLinecap='round'
            />
            <Path
                d='M25 43H42'
                stroke={changeOpacity(theme.centerChannelColor, 0.4)}
                strokeLinecap='round'
            />
            <Path
                d='M46 43H64'
                stroke={changeOpacity(theme.centerChannelColor, 0.4)}
                strokeLinecap='round'
            />
            <Circle
                cx={78}
                cy={19}
                r={19}
                fill='#32539A'
            />
            <Path
                d='M98 49L80 49'
                stroke={changeOpacity(theme.centerChannelColor, 0.8)}
                strokeLinecap='round'
                strokeLinejoin='round'
            />
            <Path
                d='M76 49L70 49'
                stroke={changeOpacity(theme.centerChannelColor, 0.8)}
                strokeLinecap='round'
                strokeLinejoin='round'
            />
            <Path
                d='M67 49L65 49'
                stroke={changeOpacity(theme.centerChannelColor, 0.8)}
                strokeLinecap='round'
                strokeLinejoin='round'
            />
            <Circle
                cx={44}
                cy={75}
                r={2}
                fill={changeOpacity(theme.centerChannelColor, 0.32)}
            />
            <Circle
                cx={52}
                cy={75}
                r={2}
                fill={changeOpacity(theme.centerChannelColor, 0.32)}
            />
            <Circle
                cx={60}
                cy={75}
                r={2}
                fill={changeOpacity(theme.centerChannelColor, 0.32)}
            />
            <Rect
                x={70.5}
                y={15.5}
                width={15}
                height={12}
                rx={1.5}
                stroke={theme.buttonColor}
            />
            <Path
                d='M73 16V13C73 10.2386 75.2386 8 78 8V8C80.7614 8 83 10.2386 83 13V16'
                stroke={theme.buttonColor}
            />
        </G>
        <Defs>
            <ClipPath id='clip0_4212_90419'>
                <Rect
                    width={130}
                    height={102}
                    fill='white'
                />
            </ClipPath>
        </Defs>
    </Svg>
);

export default PrivateChannelIllustration;
