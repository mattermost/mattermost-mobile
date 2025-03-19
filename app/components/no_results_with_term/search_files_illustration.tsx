// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React from 'react';
import Svg, {Circle, ClipPath, Defs, G, Line, Path, Rect} from 'react-native-svg';

import {useTheme} from '@context/theme';

function SearchFilesIllustration() {
    const theme = useTheme();

    return (
        <Svg
            width={132}
            height={108}
            viewBox='0 0 132 108'
            fill='none'
        >
            <Rect
                x={1}
                y={51}
                width={131}
                height={35}
                rx={2}
                fill={theme.centerChannelBg}
            />
            <Rect
                opacity={0.12}
                x={1}
                y={51}
                width={131}
                height={35}
                rx={2}
                fill={theme.buttonBg}
            />
            <Path
                d='M11.5 44.5L11.5 91.5H100'
                stroke={theme.centerChannelColor}
                strokeOpacity={0.32}
                strokeLinecap='round'
            />
            <Path
                d='M14 20.5L19.5 26V80H40.5'
                stroke={theme.centerChannelColor}
                strokeOpacity={0.32}
                strokeLinecap='round'
            />
            <Rect
                x={34}
                y={26}
                width={67}
                height={82}
                rx={2}
                fill={theme.buttonBg}
            />
            <Rect
                x={27}
                y={13}
                width={70.3182}
                height={91}
                rx={2}
                fill={theme.centerChannelBg}
            />
            <Rect
                x={27.5}
                y={13.5}
                width={69.3182}
                height={90}
                rx={1.5}
                stroke={theme.centerChannelColor}
                strokeOpacity={0.8}
            />
            <Path
                d='M37 22H49'
                stroke={theme.centerChannelColor}
                strokeOpacity={0.48}
                strokeLinecap='round'
            />
            <Path
                d='M36 68H69'
                stroke={theme.centerChannelColor}
                strokeOpacity={0.48}
                strokeLinecap='round'
            />
            <Path
                d='M36 86H75'
                stroke={theme.centerChannelColor}
                strokeOpacity={0.48}
                strokeLinecap='round'
            />
            <Path
                d='M37 27H59'
                stroke={theme.centerChannelColor}
                strokeOpacity={0.48}
                strokeLinecap='round'
            />
            <Path
                d='M36 74H87'
                stroke={theme.centerChannelColor}
                strokeOpacity={0.48}
                strokeLinecap='round'
            />
            <Path
                d='M36 92H87'
                stroke={theme.centerChannelColor}
                strokeOpacity={0.48}
                strokeLinecap='round'
            />
            <Path
                d='M37 33H46'
                stroke={theme.centerChannelColor}
                strokeOpacity={0.48}
                strokeLinecap='round'
            />
            <Path
                d='M36 80H55'
                stroke={theme.centerChannelColor}
                strokeOpacity={0.48}
                strokeLinecap='round'
            />
            <Path
                d='M48 33H57'
                stroke={theme.centerChannelColor}
                strokeOpacity={0.48}
                strokeLinecap='round'
            />
            <Path
                d='M60 80H72'
                stroke={theme.centerChannelColor}
                strokeOpacity={0.48}
                strokeLinecap='round'
            />
            <Rect
                x={57}
                y={43}
                width={30}
                height={16}
                rx={1}
                fill={theme.centerChannelColor}
                fillOpacity={0.32}
            />
            <G clipPath='url(#clip0_4210_65740)'>
                <Path
                    d='M44.0003 51.0001L51.867 52.4611C52.665 48.1187 49.7882 43.9429 45.4448 43.1362C41.0993 42.3295 36.9296 45.1946 36.1337 49.5391C35.3357 53.8815 38.2125 58.0572 42.5559 58.8639C43.869 59.1078 45.166 59.0163 46.3599 58.6485L44.0003 51.0001Z'
                    fill={theme.centerChannelBg}
                />
                <Path
                    d='M46.3599 58.6485L51.867 52.4611C52.665 48.1187 49.7882 43.9429 45.4448 43.1362C41.0993 42.3295 36.9316 45.1946 36.1337 49.5391C35.3357 53.8815 38.2125 58.0572 42.5559 58.8639C43.869 59.1078 45.166 59.0163 46.3599 58.6485Z'
                    fill={theme.centerChannelColor}
                    fillOpacity={0.32}
                />
                <Path
                    d='M46.3596 58.6485C49.1131 57.8011 51.3111 55.4907 51.8667 52.461L44 51L46.3596 58.6485Z'
                    fill={theme.buttonBg}
                />
                <Path
                    d='M46.62 53.7927C48.1539 52.3373 48.2244 49.9066 46.7774 48.3638C45.3304 46.8209 42.9139 46.75 41.3799 48.2055C39.846 49.6609 39.7756 52.0916 41.2226 53.6344C42.6696 55.1773 45.0861 55.2482 46.62 53.7927Z'
                    fill={theme.centerChannelBg}
                />
            </G>
            <Circle
                cx={97.8574}
                cy={17.8576}
                r={17.8576}
                fill={theme.centerChannelBg}
            />
            <Circle
                cx={97.8574}
                cy={17.8576}
                r={17.1433}
                stroke={theme.centerChannelColor}
                strokeOpacity={0.8}
                strokeWidth={1.42861}
                strokeLinecap='round'
                strokeLinejoin='round'
            />
            <Circle
                cx={97.8574}
                cy={17.8576}
                r={17.1433}
                stroke={theme.centerChannelColor}
                strokeOpacity={0.8}
                strokeWidth={1.42861}
                strokeLinecap='round'
                strokeLinejoin='round'
            />
            <Path
                d='M85 19C85 25.6274 90.3726 31 97 31'
                stroke={theme.centerChannelColor}
                strokeOpacity={0.48}
                strokeWidth={1.42861}
                strokeLinecap='round'
                strokeLinejoin='round'
            />
            <Line
                x1={110.768}
                y1={30.8945}
                x2={119.5}
                y2={39.6265}
                stroke={theme.centerChannelColor}
                strokeOpacity={0.8}
                strokeWidth={1.42861}
                strokeLinecap='round'
                strokeLinejoin='round'
            />
            <Circle
                cx={11.5}
                cy={42.5}
                r={2.5}
                fill={theme.centerChannelColor}
                fillOpacity={0.48}
            />
            <Circle
                cx={12.5}
                cy={18.5}
                r={2.5}
                fill={theme.centerChannelColor}
                fillOpacity={0.48}
            />
            <Path
                d='M119 46.5V68H91.5'
                stroke={theme.centerChannelColor}
                strokeOpacity={0.8}
                strokeLinecap='round'
                strokeLinejoin='round'
            />
            <Path
                d='M88 68H82'
                stroke={theme.centerChannelColor}
                strokeOpacity={0.8}
                strokeLinecap='round'
            />
            <Path
                d='M79 68H73'
                stroke={theme.centerChannelColor}
                strokeOpacity={0.8}
                strokeLinecap='round'
            />
            <Defs>
                <ClipPath id='clip0_4210_65740'>
                    <Rect
                        width={16}
                        height={16}
                        fill={theme.centerChannelBg}
                        x={36}
                        y={43}
                    />
                </ClipPath>
            </Defs>
        </Svg>
    );
}

export default SearchFilesIllustration;
