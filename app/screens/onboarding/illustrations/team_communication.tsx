// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import Svg, {
    Path,
    G,
    Circle,
    Rect,
    Defs,
    ClipPath,
} from 'react-native-svg';

import type {StyleProp, ViewStyle} from 'react-native';

type Props = {
    theme: Theme;
    styles: StyleProp<ViewStyle>;
}

const TeamCommunicationSvg = ({theme, styles}: Props) => {
    return (
        <Svg
            width={303}
            height={176}
            viewBox='0 0 303 176'
            fill='none'
            style={styles}
        >
            <Rect
                x={303}
                y={19.5}
                width={99}
                height={289.5}
                rx={3}
                transform='rotate(90 303 19.5)'
                fill={theme.centerChannelColor}
                fillOpacity={0.16}
            />
            <Rect
                x={54}
                y={3}
                width={184.5}
                height={121}
                rx={6}
                fill={theme.centerChannelBg}
                stroke={theme.centerChannelColor}
                strokeWidth={6}
            />
            <Path
                d='M57 8.25C57 7.00736 58.0074 6 59.25 6H233.25C234.493 6 235.5 7.00736 235.5 8.25V19.5H57V8.25Z'
                fill={theme.buttonBg}
                fillOpacity={0.16}
            />
            <Rect
                x={104.729}
                y={12.75}
                width={75.6422}
                height={98.3311}
                rx={2.25}
                fill={theme.centerChannelBg}
                stroke={theme.centerChannelColor}
                strokeWidth={1.5}
            />
            <Path
                d='M114.949 21.8735H128.114'
                stroke={theme.centerChannelColor}
                strokeOpacity={0.56}
                strokeWidth={1.5}
                strokeLinecap='round'
            />
            <Path
                d='M113.852 73.8376H150.054'
                stroke={theme.centerChannelColor}
                strokeOpacity={0.56}
                strokeWidth={1.5}
                strokeLinecap='round'
            />
            <Path
                d='M113.852 90.5845H156.636'
                stroke={theme.centerChannelColor}
                strokeOpacity={0.56}
                strokeWidth={1.5}
                strokeLinecap='round'
            />
            <Path
                d='M114.949 27.3585H139.084'
                stroke={theme.centerChannelColor}
                strokeOpacity={0.56}
                strokeWidth={1.5}
                strokeLinecap='round'
            />
            <Path
                d='M113.852 98.6664H169.801'
                stroke={theme.centerChannelColor}
                strokeOpacity={0.56}
                strokeWidth={1.5}
                strokeLinecap='round'
            />
            <Path
                d='M114.949 33.9407H124.823'
                stroke={theme.centerChannelColor}
                strokeOpacity={0.56}
                strokeWidth={1.5}
                strokeLinecap='round'
            />
            <Path
                d='M113.852 82.5022H134.695'
                stroke={theme.centerChannelColor}
                strokeOpacity={0.56}
                strokeWidth={1.5}
                strokeLinecap='round'
            />
            <Path
                d='M127.018 33.9407H136.891'
                stroke={theme.centerChannelColor}
                strokeOpacity={0.56}
                strokeWidth={1.5}
                strokeLinecap='round'
            />
            <Path
                d='M140.18 82.5022H155.18'
                stroke={theme.centerChannelColor}
                strokeOpacity={0.56}
                strokeWidth={1.5}
                strokeLinecap='round'
            />
            <Path
                d='M159.68 82.5022H167.18'
                stroke={theme.centerChannelColor}
                strokeOpacity={0.56}
                strokeWidth={1.5}
                strokeLinecap='round'
            />
            <Rect
                x={136.891}
                y={44.9114}
                width={32.9113}
                height={17.5527}
                rx={1.5}
                fill={theme.centerChannelColor}
                fillOpacity={0.32}
            />
            <G clipPath='url(#clip0_4216_125878)'>
                <Path
                    d='M122.627 53.6879L131.258 55.2907C132.133 50.5269 128.977 45.9459 124.212 45.0609C119.445 44.1759 114.871 47.3191 113.997 52.0851C113.122 56.8489 116.278 61.4299 121.043 62.3149C122.483 62.5824 123.906 62.4821 125.216 62.0786L122.627 53.6879Z'
                    fill={theme.centerChannelBg}
                />
                <Path
                    d='M125.216 62.0786L131.258 55.2907C132.133 50.5269 128.977 45.9459 124.212 45.0609C119.445 44.1759 114.873 47.3191 113.997 52.0851C113.122 56.8489 116.278 61.4299 121.043 62.3149C122.483 62.5824 123.906 62.4821 125.216 62.0786Z'
                    fill={theme.centerChannelColor}
                    fillOpacity={0.32}
                />
                <Path
                    d='M125.217 62.0785C128.238 61.1489 130.65 58.6143 131.259 55.2905L122.629 53.6877L125.217 62.0785Z'
                    fill={theme.centerChannelColor}
                    fillOpacity={0.64}
                />
                <Path
                    d='M125.503 56.7516C127.185 55.1549 127.263 52.4883 125.675 50.7957C124.088 49.1031 121.437 49.0254 119.754 50.6221C118.071 52.2188 117.994 54.8853 119.581 56.5779C121.169 58.2705 123.82 58.3483 125.503 56.7516Z'
                    fill={theme.centerChannelBg}
                />
            </G>
            <Path
                d='M75.1607 157.714L93.1699 175.5V84C93.1699 82.3431 91.8268 81 90.1699 81H3.0009C1.34405 81 0.000900269 82.3431 0.000900269 84V153.849C0.000900269 155.506 1.34405 156.849 3.0009 156.849H73.0526C73.8418 156.849 74.5992 157.16 75.1607 157.714Z'
                fill='#28427B'
            />
            <Circle
                opacity={0.48}
                cx={23.9554}
                cy={106.289}
                r={11.9789}
                fill='#fff'
            />
            <Path
                opacity={0.48}
                d='M43.9219 100.965H65.2177'
                stroke='#fff'
                strokeWidth={1.5}
                strokeLinecap='round'
            />
            <Path
                opacity={0.48}
                d='M13.3086 134.413H57.2311'
                stroke='#fff'
                strokeWidth={1.5}
                strokeLinecap='round'
            />
            <Path
                opacity={0.48}
                d='M13.3086 142.63H42.5903'
                stroke='#fff'
                strokeWidth={1.5}
                strokeLinecap='round'
            />
            <Path
                opacity={0.48}
                d='M43.9219 108.95H77.1965'
                stroke='#fff'
                strokeWidth={1.5}
                strokeLinecap='round'
            />
            <Path
                opacity={0.48}
                d='M13.3086 124.923H35.9354'
                stroke='#fff'
                strokeWidth={1.5}
                strokeLinecap='round'
            />
            <Path
                opacity={0.48}
                d='M41.2617 124.923H65.2195'
                stroke='#fff'
                strokeWidth={1.5}
                strokeLinecap='round'
            />
            <Rect
                x={222.75}
                y={30.75}
                width={64.5}
                height={118.5}
                rx={11.25}
                fill={theme.centerChannelBg}
                stroke={theme.centerChannelColor}
                strokeWidth={4.5}
            />
            <Path
                d='M225 41.25C225 36.6937 228.694 33 233.25 33H276.75C281.306 33 285 36.6937 285 41.25V43.5H225V41.25Z'
                fill={theme.buttonBg}
                fillOpacity={0.16}
            />
            <Circle
                cx={239.746}
                cy={97.2465}
                r={8.74648}
                fill={theme.centerChannelColor}
                fillOpacity={0.32}
            />
            <Path
                d='M254.324 94.5H269.874'
                stroke={theme.centerChannelColor}
                strokeOpacity={0.48}
                strokeWidth={1.5}
                strokeLinecap='round'
            />
            <Path
                d='M232.5 111H271.5'
                stroke={theme.centerChannelColor}
                strokeOpacity={0.48}
                strokeWidth={1.5}
                strokeLinecap='round'
            />
            <Path
                d='M232.5 123H262.5'
                stroke={theme.centerChannelColor}
                strokeOpacity={0.48}
                strokeWidth={1.5}
                strokeLinecap='round'
            />
            <Path
                d='M254.324 100.5H278.62'
                stroke={theme.centerChannelColor}
                strokeOpacity={0.48}
                strokeWidth={1.5}
                strokeLinecap='round'
            />
            <Path
                d='M232.5 117H256.5'
                stroke={theme.centerChannelColor}
                strokeOpacity={0.48}
                strokeWidth={1.5}
                strokeLinecap='round'
            />
            <Path
                d='M261 117L279 117'
                stroke={theme.centerChannelColor}
                strokeOpacity={0.48}
                strokeWidth={1.5}
                strokeLinecap='round'
            />
            <Rect
                x={243}
                y={37.5}
                width={24}
                height={1.5}
                rx={0.75}
                fill={theme.centerChannelColor}
            />
            <Circle
                cx={63.75}
                cy={12.75}
                r={2.25}
                fill={theme.centerChannelColor}
                fillOpacity={0.32}
            />
            <Circle
                cx={75.75}
                cy={12.75}
                r={2.25}
                fill={theme.centerChannelColor}
                fillOpacity={0.32}
            />
            <Circle
                cx={87.75}
                cy={12.75}
                r={2.25}
                fill={theme.centerChannelColor}
                fillOpacity={0.32}
            />
            <Path
                d='M168 135L181.5 135'
                stroke={theme.centerChannelColor}
                strokeWidth={1.5}
                strokeLinecap='round'
            />
            <Path
                d='M186 135L192 135'
                stroke={theme.centerChannelColor}
                strokeWidth={1.5}
                strokeLinecap='round'
            />
            <Path
                d='M196.5 135L241.5 135'
                stroke={theme.centerChannelColor}
                strokeWidth={1.5}
                strokeLinecap='round'
            />
            <Path
                d='M163.5 135L145.5 135L145.5 105'
                stroke={theme.centerChannelColor}
                strokeWidth={1.5}
                strokeLinecap='round'
                strokeLinejoin='round'
            />
            <Defs>
                <ClipPath id='clip0_4216_125878'>
                    <Rect
                        width={17.5527}
                        height={17.5527}
                        fill='#fff'
                        transform='translate(113.852 44.9114)'
                    />
                </ClipPath>
            </Defs>
        </Svg>
    );
};

export default TeamCommunicationSvg;
