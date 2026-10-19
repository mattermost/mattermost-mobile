// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import Svg, {
    Circle,
    ClipPath,
    Defs,
    Ellipse,
    G,
    Path,
    Rect,
} from 'react-native-svg';

import type {StyleProp, ViewStyle} from 'react-native';

type Props = {
    theme: Theme;
    styles: StyleProp<ViewStyle>;
};

const IntegrationsSvg = ({theme, styles}: Props) => {
    return (
        <Svg
            width={333}
            height={203}
            viewBox='0 0 333 203'
            fill='none'
            style={styles}
        >
            <Rect
                width={123}
                height={117}
                rx={4.52381}
                transform='matrix(1 0 0 -1 181.5 125.5)'
                fill={theme.centerChannelColor}
                fillOpacity={0.16}
            />
            <Rect
                width={94.5}
                height={78}
                rx={4.52381}
                transform='matrix(1 0 0 -1 28.5 196)'
                fill={theme.centerChannelColor}
                fillOpacity={0.16}
            />
            <Path
                d='M18 37.4444L18 58L214.501 58L214.501 6.25'
                stroke={theme.centerChannelColor}
                strokeOpacity={0.32}
                strokeWidth={1.5}
                strokeLinecap='round'
            />
            <Ellipse
                cx={3}
                cy={3}
                rx={3}
                ry={3}
                transform='matrix(1 8.74228e-08 8.74228e-08 -1 15 37)'
                fill={theme.centerChannelColor}
                fillOpacity={0.48}
            />
            <Path
                d='M17.3594 191.848L17.3594 155.401L53.132 155.401'
                stroke={theme.centerChannelColor}
                strokeOpacity={0.32}
                strokeWidth={1.5}
                strokeLinecap='round'
            />
            <Circle
                cx={3.37477}
                cy={3.37477}
                r={3.37477}
                transform='matrix(1 8.74228e-08 8.74228e-08 -1 13.9846 198.598)'
                fill={theme.centerChannelColor}
                fillOpacity={0.48}
            />
            <Rect
                x={56.52}
                y={25.8229}
                width={224.058}
                height={146.664}
                rx={8.12598}
                fill={theme.centerChannelBg}
                stroke={theme.centerChannelColor}
                strokeWidth={8.12598}
            />
            <G clipPath='url(#integrationsDesktopClip)'>
                <Rect
                    width={206.536}
                    height={128.241}
                    transform='translate(65.2812 35.2589)'
                    fill={theme.centerChannelBg}
                />
                <Rect
                    x={65.2812}
                    y={35.2589}
                    width={68.5141}
                    height={147.569}
                    fill={theme.buttonBg}
                    fillOpacity={0.16}
                />
                <Path
                    d='M88.998 45.7996L114.032 45.7996'
                    stroke={theme.centerChannelColor}
                    strokeOpacity={0.32}
                    strokeWidth={1.5}
                    strokeLinecap='round'
                />
                <Path
                    d='M88.998 49.7523L103.491 49.7523'
                    stroke={theme.centerChannelColor}
                    strokeOpacity={0.32}
                    strokeWidth={1.5}
                    strokeLinecap='round'
                />
                <Path
                    d='M141.701 46.4586H173.323'
                    stroke={theme.centerChannelColor}
                    strokeOpacity={0.32}
                    strokeWidth={1.5}
                    strokeLinecap='round'
                />
                <Path
                    d='M71.8694 62.9283H91.6331'
                    stroke={theme.centerChannelColor}
                    strokeOpacity={0.32}
                    strokeWidth={1.5}
                    strokeLinecap='round'
                />
                <Circle
                    cx={76.5455}
                    cy={46.5232}
                    r={6.52157}
                    fill={theme.centerChannelColor}
                    fillOpacity={0.32}
                />
                <Circle
                    cx={73.5002}
                    cy={70.0001}
                    r={3}
                    fill={theme.centerChannelColor}
                    fillOpacity={0.32}
                />
                <Path
                    d='M82.4094 70.0001H119.302'
                    stroke={theme.centerChannelColor}
                    strokeOpacity={0.32}
                    strokeWidth={1.5}
                    strokeLinecap='round'
                />
                <Circle
                    cx={156}
                    cy={67.0002}
                    r={7.5}
                    fill={theme.centerChannelColor}
                    fillOpacity={0.32}
                />
                <Path
                    d='M168 67.0002H247.585'
                    stroke={theme.centerChannelColor}
                    strokeOpacity={0.32}
                    strokeWidth={1.5}
                    strokeLinecap='round'
                />
                <Path
                    d='M168 73.0002H247.585'
                    stroke={theme.centerChannelColor}
                    strokeOpacity={0.32}
                    strokeWidth={1.5}
                    strokeLinecap='round'
                />
                <Path
                    d='M168 61.0002H187.764'
                    stroke={theme.centerChannelColor}
                    strokeOpacity={0.32}
                    strokeWidth={1.5}
                    strokeLinecap='round'
                />
                <Circle
                    cx={156}
                    cy={95.4999}
                    r={7.5}
                    fill={theme.centerChannelColor}
                    fillOpacity={0.32}
                />
                <Path
                    d='M168 95.4999H247.585'
                    stroke={theme.centerChannelColor}
                    strokeOpacity={0.32}
                    strokeWidth={1.5}
                    strokeLinecap='round'
                />
                <Path
                    d='M168 101.5H247.585'
                    stroke={theme.centerChannelColor}
                    strokeOpacity={0.32}
                    strokeWidth={1.5}
                    strokeLinecap='round'
                />
                <Path
                    d='M168 89.4999H187.764'
                    stroke={theme.centerChannelColor}
                    strokeOpacity={0.32}
                    strokeWidth={1.5}
                    strokeLinecap='round'
                />
                <Circle
                    cx={156}
                    cy={124}
                    r={7.5}
                    fill={theme.centerChannelColor}
                    fillOpacity={0.32}
                />
                <Path
                    d='M168 124H247.585'
                    stroke={theme.centerChannelColor}
                    strokeOpacity={0.32}
                    strokeWidth={1.5}
                    strokeLinecap='round'
                />
                <Path
                    d='M168 130H247.585'
                    stroke={theme.centerChannelColor}
                    strokeOpacity={0.32}
                    strokeWidth={1.5}
                    strokeLinecap='round'
                />
                <Path
                    d='M168 118H187.764'
                    stroke={theme.centerChannelColor}
                    strokeOpacity={0.32}
                    strokeWidth={1.5}
                    strokeLinecap='round'
                />
                <Circle
                    cx={73.5002}
                    cy={80.5002}
                    r={3}
                    fill={theme.centerChannelColor}
                    fillOpacity={0.32}
                />
                <Path
                    d='M82.4094 80.5002H111.396'
                    stroke={theme.centerChannelColor}
                    strokeOpacity={0.32}
                    strokeWidth={1.5}
                    strokeLinecap='round'
                />
                <Circle
                    cx={73.5002}
                    cy={92.4996}
                    r={3}
                    fill={theme.centerChannelColor}
                    fillOpacity={0.32}
                />
                <Path
                    d='M82.4094 92.4996H123.254'
                    stroke={theme.centerChannelColor}
                    strokeOpacity={0.32}
                    strokeWidth={1.5}
                    strokeLinecap='round'
                />
                <Circle
                    cx={73.5002}
                    cy={103}
                    r={3}
                    fill={theme.centerChannelColor}
                    fillOpacity={0.32}
                />
                <Path
                    d='M82.4094 103H119.302'
                    stroke={theme.centerChannelColor}
                    strokeOpacity={0.32}
                    strokeWidth={1.5}
                    strokeLinecap='round'
                />
                <Circle
                    cx={73.5002}
                    cy={113.5}
                    r={3}
                    fill={theme.centerChannelColor}
                    fillOpacity={0.32}
                />
                <Path
                    d='M82.4094 113.5H111.396'
                    stroke={theme.centerChannelColor}
                    strokeOpacity={0.32}
                    strokeWidth={1.5}
                    strokeLinecap='round'
                />
                <Circle
                    cx={73.5002}
                    cy={124}
                    r={3}
                    fill={theme.centerChannelColor}
                    fillOpacity={0.32}
                />
                <Path
                    d='M82.4094 124H123.254'
                    stroke={theme.centerChannelColor}
                    strokeOpacity={0.32}
                    strokeWidth={1.5}
                    strokeLinecap='round'
                />
            </G>
            <Circle
                cx={35.6992}
                cy={79.6992}
                r={33.9291}
                fill={theme.centerChannelBg}
                stroke={theme.centerChannelColor}
                strokeWidth={1.54027}
            />
            <Circle
                cx={195.276}
                cy={180.276}
                r={21.0342}
                fill={theme.centerChannelBg}
                stroke={theme.centerChannelColor}
                strokeWidth={1.51588}
            />
            <Circle
                cx={269}
                cy={30}
                r={29.25}
                fill={theme.centerChannelBg}
                stroke={theme.centerChannelColor}
                strokeWidth={1.5}
            />
            <Circle
                cx={294.5}
                cy={156.5}
                r={36.75}
                fill={theme.centerChannelBg}
                stroke={theme.centerChannelColor}
                strokeWidth={1.5}
            />
            <Circle
                cx={3}
                cy={3}
                r={3}
                transform='matrix(1 8.74228e-08 8.74228e-08 -1 211.5 7)'
                fill={theme.centerChannelColor}
                fillOpacity={0.48}
            />
            <Circle
                cx={269.5}
                cy={30.5}
                r={21.5}
                fill='#BABEC9'
            />
            <Circle
                cx={195}
                cy={180}
                r={17}
                fill='#339970'
            />
            <Circle
                cx={294.5}
                cy={156.5}
                r={29.5}
                fill='#C43133'
            />
            <Circle
                cx={35.5}
                cy={79.5}
                r={27.5}
                fill='#5D89EA'
            />
            <Path
                d='M279.8 29.7999C279.8 36.4599 275.192 42.6879 269 44.1999C262.808 42.6879 258.2 36.4599 258.2 29.7999V22.5999L269 17.7999L279.8 22.5999V29.7999ZM269 41.7999C273.5 40.5999 277.4 35.2479 277.4 30.0639V24.1599L269 20.4159L260.6 24.1599V30.0639C260.6 35.2479 264.5 40.5999 269 41.7999Z'
                fill='#fff'
            />
            <Path
                d='M195 170.791C189.935 170.791 185.791 174.935 185.791 180C185.791 185.065 189.935 189.209 195 189.209C200.065 189.209 204.209 185.065 204.209 180C204.209 174.935 200.065 170.791 195 170.791ZM195 187.368C190.939 187.368 187.632 184.061 187.632 180C187.632 175.939 190.939 172.633 195 172.633C199.061 172.633 202.367 175.939 202.367 180C202.367 184.061 199.061 187.368 195 187.368ZM199.227 175.93L193.158 181.998L190.773 179.622L189.474 180.921L193.158 184.605L200.525 177.237L199.227 175.93Z'
                fill='#fff'
            />
            <Path
                d='M294 139.535C284.944 139.535 277.535 146.944 277.535 156C277.535 165.056 284.944 172.465 294 172.465C303.056 172.465 310.465 165.056 310.465 156C310.465 146.944 303.056 139.535 294 139.535ZM294 169.172C286.755 169.172 280.828 163.245 280.828 156C280.828 148.755 286.755 142.828 294 142.828C301.244 142.828 307.172 148.755 307.172 156C307.172 163.245 301.244 169.172 294 169.172ZM294.825 157.646H293.178L292.355 147.767H295.648L294.825 157.646ZM295.646 162.586C295.646 163.495 294.909 164.232 294 164.232C293.091 164.232 292.353 163.495 292.353 162.586C292.353 161.677 293.091 160.939 294 160.939C294.909 160.939 295.646 161.677 295.646 162.586Z'
                fill='#fff'
            />
            <Path
                d='M36.8792 84.256L32.9806 80.4034L33.0267 80.3574C35.6974 77.3797 37.6006 73.9569 38.7211 70.3346H43.2183V67.2648H32.4741V64.1951H29.4043V67.2648H18.6602V70.3346H35.8048C34.7764 73.2816 33.1495 76.0904 30.9392 78.5462C29.5118 76.9653 28.3299 75.2309 27.3936 73.4044H24.3239C25.4443 75.9062 26.9792 78.27 28.8978 80.4034L21.0853 88.1086L23.2648 90.2881L30.9392 82.6137L35.7127 87.3872L36.8792 84.256ZM45.5206 76.4741H42.4509L35.5439 94.8927H38.6136L40.3327 90.2881H47.6234L49.3578 94.8927H52.4276L45.5206 76.4741ZM41.4992 87.2183L43.9857 80.5723L46.4723 87.2183H41.4992Z'
                fill='#fff'
            />
            <Defs>
                <ClipPath id='integrationsDesktopClip'>
                    <Rect
                        width={206.536}
                        height={128.241}
                        transform='translate(65.2812 35.2589)'
                    />
                </ClipPath>
            </Defs>
        </Svg>
    );
};

export default IntegrationsSvg;
