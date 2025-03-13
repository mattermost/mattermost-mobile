// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {Circle, ClipPath, Defs, G, Path, Rect, Svg} from 'react-native-svg';

import {changeOpacity} from '@utils/theme';

type Props = {
    theme: Theme;
};

const PublicChannelIllustration = ({theme}: Props) => (
    <Svg
        width={130}
        height={102}
        viewBox='0 0 130 102'
        fill='none'
    >
        <G clipPath='url(#clip0_1_2)'>
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
                cy={13.5}
                r={2.5}
                fill={changeOpacity(theme.centerChannelColor, 0.32)}
            />
            <Circle
                cx={2.5}
                cy={71.5}
                r={2.5}
                fill={changeOpacity(theme.centerChannelColor, 0.32)}
            />
            <Circle
                cx={18.5}
                cy={71.5}
                r={2.5}
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
                fill={'#28427B'}
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
                fill={'#32539A'}
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
            <Circle
                cx={78}
                cy={19}
                r={9.5}
                stroke={theme.buttonColor}
            />
            <Path
                d='M87.5 20.2525C86.1859 21.8482 82.4292 23 78 23C73.5708 23 69.8141 21.8482 68.5 20.2525'
                stroke={theme.buttonColor}
            />
            <Path
                d='M86.6622 15C84.9331 16.1956 81.7014 17 78 17C74.2986 17 71.0669 16.1956 69.3378 15'
                stroke={theme.buttonColor}
            />
            <Path
                d='M81.5 19C81.5 21.7141 81.059 24.1482 80.3642 25.8854C80.0162 26.7553 79.6144 27.4258 79.1937 27.8706C78.7741 28.3143 78.3705 28.5 78 28.5C77.6295 28.5 77.2259 28.3143 76.8063 27.8706C76.3856 27.4258 75.9838 26.7553 75.6358 25.8854C74.941 24.1482 74.5 21.7141 74.5 19C74.5 16.2859 74.941 13.8518 75.6358 12.1146C75.9838 11.2447 76.3856 10.5742 76.8063 10.1294C77.2259 9.6857 77.6295 9.5 78 9.5C78.3705 9.5 78.7741 9.6857 79.1937 10.1294C79.6144 10.5742 80.0162 11.2447 80.3642 12.1146C81.059 13.8518 81.5 16.2859 81.5 19Z'
                stroke={theme.buttonColor}
            />
        </G>
        <Defs>
            <ClipPath id='clip0_4212_90121'>
                <Rect
                    width={130}
                    height={102}
                    fill={theme.centerChannelBg}
                />
            </ClipPath>
        </Defs>
    </Svg>
);

export default PublicChannelIllustration;
