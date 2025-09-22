// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import Svg, {Circle, Ellipse, Path, Rect} from 'react-native-svg';

import {useTheme} from '@context/theme';

const LoadingError = () => {
    const theme = useTheme();

    return (
        <Svg
            width={122}
            height={94}
            viewBox='0 0 122 94'
            fill='none'
        >
            <Rect
                y={32}
                width={107}
                height={31}
                rx={3.75}
                fill={theme.sidebarText}
                fillOpacity={0.12}
            />
            <Rect
                x={46}
                width={76}
                height={27}
                rx={3.75}
                fill={theme.sidebarText}
                fillOpacity={0.12}
            />
            <Rect
                x={46}
                y={67}
                width={76}
                height={27}
                rx={3.75}
                fill={theme.sidebarText}
                fillOpacity={0.12}
            />
            <Path
                d='M18 29.2963L18 43L59.5 43'
                stroke={theme.sidebarText}
                strokeOpacity={0.24}
                strokeLinecap='round'
            />
            <Ellipse
                cx={2}
                cy={2}
                rx={2}
                ry={2}
                transform='matrix(1 8.74228e-08 8.74228e-08 -1 16 29)'
                fill={theme.sidebarText}
                fillOpacity={0.32}
            />
            <Path
                d='M19.5 27C19.5 26.1716 18.8284 25.5 18 25.5C17.1716 25.5 16.5 26.1716 16.5 27C16.5 27.8284 17.1716 28.5 18 28.5C18.8284 28.5 19.5 27.8284 19.5 27Z'
                stroke={theme.sidebarText}
                strokeOpacity={0.24}
            />
            <Path
                d='M100.75 80.2319L100.75 55.9336L76.9016 55.9336'
                stroke={theme.sidebarText}
                strokeOpacity={0.24}
                strokeLinecap='round'
            />
            <Circle
                cx={100.75}
                cy={82.4818}
                r={2.24985}
                transform='rotate(180 100.75 82.4818)'
                fill={theme.sidebarText}
                fillOpacity={0.32}
            />
            <Circle
                cx={100.75}
                cy={82.4818}
                r={1.74985}
                transform='rotate(180 100.75 82.4818)'
                stroke={theme.sidebarText}
                strokeOpacity={0.24}
            />
            <Path
                d='M66.542 16.24L69.8888 22.72M91.922 65.38L85.5073 52.96L83.8339 49.72L81.6027 45.4L78.5348 39.46M76.3036 35.14L72.12 27.04'
                stroke={theme.sidebarText}
                strokeWidth={1.08}
                strokeLinecap='round'
            />
            <Path
                d='M60.2322 16.5361L88.2681 72.1242C89.1067 73.7869 87.8982 75.75 86.0359 75.75H29.9641C28.1018 75.75 26.8933 73.7869 27.7319 72.1242L55.7678 16.5361C56.6919 14.7039 59.3081 14.7039 60.2322 16.5361Z'
                fill={theme.sidebarBg}
                stroke='#F5AB00'
            />
            <Path
                d='M54.5164 37.2833L56.7971 51.9301C56.8191 52.2208 56.9554 52.4927 57.1786 52.6912C57.4018 52.8897 57.6954 53 58.0002 53C58.3051 53 58.5986 52.8897 58.8219 52.6912C59.0451 52.4927 59.1814 52.2208 59.2034 51.9301L61.484 37.2833C61.8987 31.5722 54.0955 31.5722 54.5164 37.2833Z'
                fill={theme.sidebarText}
            />
            <Path
                d='M58.0072 59C58.798 59.0014 59.5706 59.2372 60.2275 59.6776C60.8843 60.118 61.396 60.7432 61.6976 61.4742C61.9993 62.2053 62.0774 63.0093 61.9222 63.7848C61.7671 64.5602 61.3856 65.2723 60.8259 65.831C60.2662 66.3897 59.5535 66.7699 58.7777 66.9237C58.002 67.0774 57.1981 66.9978 56.4676 66.6948C55.7371 66.3919 55.1128 65.8792 54.6736 65.2215C54.2344 64.5639 54 63.7908 54 63C54 62.4741 54.1036 61.9534 54.3051 61.4676C54.5066 60.9818 54.8019 60.5406 55.1741 60.169C55.5463 59.7975 55.9881 59.503 56.4743 59.3024C56.9604 59.1018 57.4813 58.9991 58.0072 59Z'
                fill={theme.sidebarText}
            />
            <Path
                d='M65.462 80.5H87.062'
                stroke={theme.sidebarText}
                strokeWidth={1.08}
                strokeLinecap='round'
            />
        </Svg>
    );
};

export default LoadingError;
