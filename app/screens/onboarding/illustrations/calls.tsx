// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import Svg, {
    Path,
    Rect,
    Circle,
} from 'react-native-svg';

import type {StyleProp, ViewStyle} from 'react-native';

type Props = {
    theme: Theme;
    styles: StyleProp<ViewStyle>;
};

const CallsSvg = ({theme, styles}: Props) => {
    return (
        <Svg
            width={293}
            height={174}
            viewBox='0 0 293 174'
            fill='none'
            style={styles}
        >
            <Rect
                y={36}
                width={292.5}
                height={100.5}
                rx={4.5}
                fill={theme.centerChannelColor}
                fillOpacity={0.12}
            />
            <Path
                d='M281.25 54L281.25 94.5L241.5 94.5'
                stroke={theme.centerChannelColor}
                strokeOpacity={0.32}
                strokeWidth={1.5}
                strokeLinecap='round'
            />
            <Circle
                cx={3.75}
                cy={3.75}
                r={3.75}
                transform='matrix(-1 -8.74228e-08 -8.74228e-08 1 285 46.5)'
                fill={theme.centerChannelColor}
                fillOpacity={0.48}
            />
            <Path
                d='M281.25 153L281.25 112.5H241.5'
                stroke={theme.centerChannelColor}
                strokeOpacity={0.32}
                strokeWidth={1.5}
                strokeLinecap='round'
            />
            <Circle
                cx={281.25}
                cy={156.75}
                r={3.75}
                transform='rotate(180 281.25 156.75)'
                fill={theme.centerChannelColor}
                fillOpacity={0.48}
            />
            <Path
                d='M9.75 30L9.75 70.5L49.5 70.5'
                stroke={theme.centerChannelColor}
                strokeOpacity={0.32}
                strokeWidth={1.5}
                strokeLinecap='round'
            />
            <Circle
                cx={9.75}
                cy={26.25}
                r={3.75}
                fill={theme.centerChannelColor}
                fillOpacity={0.48}
            />
            <Rect
                x={78}
                y={22.5}
                width={184.5}
                height={121}
                rx={6}
                fill={theme.centerChannelBg}
                stroke={theme.centerChannelColor}
                strokeWidth={6}
            />
            <Path
                d='M81 27.75C81 26.5074 82.0074 25.5 83.25 25.5H257.25C258.493 25.5 259.5 26.5074 259.5 27.75V39H81V27.75Z'
                fill={theme.buttonBg}
                fillOpacity={0.16}
            />
            <Circle
                cx={87.75}
                cy={32.25}
                r={2.25}
                fill={theme.centerChannelColor}
                fillOpacity={0.48}
            />
            <Circle
                cx={99.75}
                cy={32.25}
                r={2.25}
                fill={theme.centerChannelColor}
                fillOpacity={0.48}
            />
            <Circle
                cx={111.75}
                cy={32.25}
                r={2.25}
                fill={theme.centerChannelColor}
                fillOpacity={0.48}
            />
            <Rect
                opacity={0.32}
                x={90.75}
                y={47.25}
                width={160.5}
                height={64.5}
                rx={2.25}
                stroke={theme.centerChannelColor}
                strokeWidth={1.5}
            />
            <Circle
                cx={151.5}
                cy={127.5}
                r={4.5}
                fill={theme.centerChannelColor}
                fillOpacity={0.4}
            />
            <Circle
                cx={169.5}
                cy={127.5}
                r={9}
                fill={theme.onlineIndicator}
            />
            <Circle
                cx={187.5}
                cy={127.5}
                r={4.5}
                fill={theme.centerChannelColor}
                fillOpacity={0.4}
            />
            <Path
                d='M139.5 58.5V99H204'
                stroke={theme.centerChannelColor}
                strokeWidth={1.5}
                strokeLinejoin='round'
            />
            <Rect
                x={150}
                y={66}
                width={4.5}
                height={28.5}
                fill={theme.centerChannelColor}
                fillOpacity={0.4}
            />
            <Rect
                x={157.5}
                y={67.5}
                width={4.5}
                height={27}
                fill={theme.centerChannelColor}
                fillOpacity={0.4}
            />
            <Rect
                x={165}
                y={79.5}
                width={4.5}
                height={15}
                fill={theme.centerChannelColor}
                fillOpacity={0.4}
            />
            <Rect
                x={172.5}
                y={78}
                width={4.5}
                height={16.5}
                fill={theme.centerChannelColor}
                fillOpacity={0.4}
            />
            <Rect
                x={180}
                y={72}
                width={4.5}
                height={22.5}
                fill={theme.centerChannelColor}
                fillOpacity={0.4}
            />
            <Rect
                x={187.5}
                y={69}
                width={4.5}
                height={25.5}
                fill={theme.centerChannelColor}
                fillOpacity={0.4}
            />
            <Path
                d='M169.5 122.25C169.791 122.25 170.057 122.325 170.296 122.475C170.545 122.626 170.741 122.829 170.887 123.085C171.033 123.333 171.105 123.607 171.105 123.907V127.222C171.105 127.522 171.033 127.801 170.887 128.057C170.741 128.304 170.545 128.503 170.296 128.653C170.057 128.804 169.791 128.879 169.5 128.879C169.209 128.879 168.939 128.804 168.691 128.653C168.451 128.503 168.259 128.304 168.113 128.057C167.967 127.801 167.895 127.522 167.895 127.222V123.907C167.895 123.607 167.967 123.333 168.113 123.085C168.259 122.829 168.451 122.626 168.691 122.475C168.939 122.325 169.209 122.25 169.5 122.25ZM173.25 127.222C173.25 127.858 173.109 128.459 172.826 129.025C172.544 129.564 172.158 130.015 171.67 130.377C171.182 130.739 170.639 130.965 170.039 131.053V132.75H168.961V131.053C168.361 130.965 167.818 130.739 167.33 130.377C166.842 130.015 166.456 129.564 166.174 129.025C165.891 128.459 165.75 127.858 165.75 127.222H166.829C166.829 127.593 166.893 127.946 167.021 128.282C167.158 128.618 167.351 128.919 167.599 129.184C167.856 129.44 168.147 129.639 168.473 129.78C168.798 129.922 169.14 129.992 169.5 129.992C169.86 129.992 170.202 129.922 170.527 129.78C170.853 129.639 171.14 129.44 171.388 129.184C171.645 128.919 171.837 128.618 171.966 128.282C172.103 127.946 172.171 127.593 172.171 127.222H173.25Z'
                fill={theme.centerChannelBg}
            />
            <Rect
                x={35.85}
                y={3.75015}
                width={90.3}
                height={165.9}
                rx={15.75}
                fill={theme.centerChannelBg}
                stroke={theme.centerChannelColor}
                strokeWidth={6.3}
            />
            <Path
                d='M39 16.3501C39 11.1311 43.2309 6.90015 48.45 6.90015H113.55C118.769 6.90015 123 11.1311 123 16.3501V21.6001H39V16.3501Z'
                fill={theme.buttonBg}
                fillOpacity={0.16}
            />
            <Circle
                cx={80.9988}
                cy={86.7}
                r={25.2}
                fill={theme.onlineIndicator}
            />
            <Rect
                x={64.2012}
                y={13.2002}
                width={33.6}
                height={2.1}
                rx={1.05}
                fill={theme.centerChannelColor}
            />
            <Path
                d='M83.7984 87.7502C83.7984 87.0521 83.6239 86.4155 83.2748 85.8406C82.9258 85.2451 82.4535 84.7729 81.858 84.4238C81.2831 84.0747 80.6466 83.9002 79.9484 83.9002V81.3438C81.1188 81.3438 82.1866 81.6313 83.1516 82.2062C84.1372 82.7811 84.9175 83.5614 85.4924 84.547C86.0674 85.5121 86.3548 86.5798 86.3548 87.7502H83.7984ZM88.942 87.7502C88.942 86.1281 88.5314 84.6189 87.71 83.2226C86.9092 81.8674 85.8312 80.7894 84.476 79.9886C83.0798 79.1673 81.5706 78.7566 79.9484 78.7566V76.2002C82.0428 76.2002 83.9832 76.7238 85.7696 77.771C87.515 78.7977 88.901 80.1734 89.9276 81.8982C90.9748 83.7051 91.4984 85.6558 91.4984 87.7502H88.942ZM90.2048 92.247C90.5539 92.247 90.8516 92.3702 91.098 92.6166C91.365 92.863 91.4984 93.1607 91.4984 93.5098V98.0066C91.4984 98.3557 91.365 98.6534 91.098 98.8998C90.8516 99.1667 90.5539 99.3002 90.2048 99.3002C87.248 99.3002 84.4144 98.7253 81.704 97.5754C79.0963 96.4871 76.7863 94.9369 74.774 92.9246C72.7618 90.9123 71.2115 88.6023 70.1232 85.9946C68.9734 83.2842 68.3984 80.4506 68.3984 77.4938C68.3984 77.1447 68.5216 76.847 68.768 76.6006C69.035 76.3337 69.343 76.2002 69.692 76.2002H74.1888C74.5379 76.2002 74.8356 76.3337 75.082 76.6006C75.3284 76.847 75.4516 77.1447 75.4516 77.4938C75.4516 79.0133 75.698 80.5327 76.1908 82.0522C76.273 82.2781 76.2832 82.5142 76.2216 82.7606C76.16 82.9865 76.0471 83.1918 75.8828 83.3766L73.0492 86.2102C73.9732 88.0171 75.1539 89.6495 76.5912 91.1074C78.0491 92.5447 79.6815 93.7254 81.4884 94.6494L84.322 91.8158C84.5068 91.6515 84.7122 91.5386 84.938 91.477C85.1844 91.4154 85.4206 91.4257 85.6464 91.5078C87.1659 92.0006 88.6854 92.247 90.2048 92.247Z'
                fill={theme.centerChannelBg}
            />
            <Path
                d='M149.812 154.5L138 154.5'
                stroke={theme.centerChannelColor}
                strokeWidth={1.5}
                strokeLinecap='round'
            />
            <Path
                d='M134.062 154.5L128.812 154.5'
                stroke={theme.centerChannelColor}
                strokeWidth={1.5}
                strokeLinecap='round'
            />
            <Path
                d='M124.875 154.5L85.5 154.5'
                stroke={theme.centerChannelColor}
                strokeWidth={1.5}
                strokeLinecap='round'
            />
            <Path
                d='M153.75 154.5L169.5 154.5L169.5 135'
                stroke={theme.centerChannelColor}
                strokeWidth={1.5}
                strokeLinecap='round'
                strokeLinejoin='round'
            />
        </Svg>
    );
};

export default CallsSvg;
