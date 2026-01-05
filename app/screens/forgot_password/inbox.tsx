// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import * as React from 'react';
import Svg, {
    Path,
    Mask,
    G,
    Defs,
    Ellipse,
    Rect,
    ClipPath,
} from 'react-native-svg';

type Props = {
    theme: Theme;
};

const Inbox = ({theme}: Props) => {
    return (
        <Svg
            width={205}
            height={179}
            viewBox='0 0 205 179'
            fill='none'
        >
            <G clipPath='url(#clip0_4212_99103)'>
                <Ellipse
                    cx={102.637}
                    cy={89.25}
                    rx={89.25}
                    ry={89.25}
                    fill={theme.centerChannelColor}
                    fillOpacity={0.08}
                />
                <Path
                    d='M2.23047 74.5237L2.23046 87.9112L174.483 87.9112L174.483 102.191L199.919 102.191'
                    stroke={theme.centerChannelColor}
                    strokeOpacity={0.32}
                    strokeWidth={1.5}
                    strokeLinecap='round'
                />
                <Path
                    d='M36.1445 122.272L36.1445 98.175L59.7958 98.175'
                    stroke={theme.centerChannelColor}
                    strokeOpacity={0.32}
                    strokeWidth={1.5}
                    strokeLinecap='round'
                />
                <Ellipse
                    cx={2.23125}
                    cy={2.23125}
                    rx={2.23125}
                    ry={2.23125}
                    transform='matrix(1 8.74228e-08 8.74228e-08 -1 0 74.97)'
                    fill={theme.centerChannelColor}
                    fillOpacity={0.56}
                />
                <Ellipse
                    cx={2.23125}
                    cy={2.23125}
                    rx={2.23125}
                    ry={2.23125}
                    transform='matrix(1 8.74228e-08 8.74228e-08 -1 33.9141 126.735)'
                    fill={theme.centerChannelColor}
                    fillOpacity={0.56}
                />
                <Ellipse
                    cx={2.23125}
                    cy={2.23125}
                    rx={2.23125}
                    ry={2.23125}
                    transform='matrix(1 8.74228e-08 8.74228e-08 -1 198.137 104.423)'
                    fill={theme.centerChannelColor}
                    fillOpacity={0.56}
                />
                <Path
                    d='M48.1914 65.1526L103.308 23.2051C125.366 39.9928 157.969 65.1526 157.969 65.1526V142.8H48.1914V65.1526Z'
                    fill={theme.centerChannelBg}
                    stroke={theme.centerChannelColor}
                    strokeWidth={1.5}
                    strokeLinejoin='round'
                />
                <Path
                    fillRule='evenodd'
                    clipRule='evenodd'
                    d='M51.4766 66.2182L103.303 26.7751C124.044 42.5605 154.7 66.2182 154.7 66.2182H51.4766ZM154.7 66.2183H51.4766V139.23H154.7V66.2183Z'
                    fill={theme.centerChannelColor}
                    fillOpacity={0.24}
                />
                <G mask='url(#mask0_4212_99103)'>
                    <Rect
                        x={137.59}
                        y={38.235}
                        width={99.3525}
                        height={69.0075}
                        transform='rotate(90 137.59 38.235)'
                        fill={theme.centerChannelBg}
                        stroke={theme.centerChannelColor}
                        strokeWidth={1.5}
                    />
                </G>
                <Path
                    d='M103.532 88.845C111.911 88.845 118.704 82.052 118.704 73.6725C118.704 65.2929 111.911 58.5 103.532 58.5C95.1523 58.5 88.3594 65.2929 88.3594 73.6725C88.3594 82.052 95.1523 88.845 103.532 88.845Z'
                    fill={theme.onlineIndicator}
                />
                <Path
                    d='M96.7539 73.9999L101.652 78.4249L111.004 68.7499'
                    stroke={theme.centerChannelBg}
                    strokeWidth={1.785}
                    strokeLinecap='round'
                    strokeLinejoin='round'
                />
                <Path
                    d='M103.301 106.156L156.188 66.045V141.908H49.9805V66.045L103.301 106.156Z'
                    fill={theme.centerChannelBg}
                />
                <Path
                    d='M50.8711 66.9375L103.299 106.208C124.281 90.4914 155.294 66.9375 155.294 66.9375'
                    stroke={theme.centerChannelColor}
                    strokeWidth={1.5}
                    strokeLinejoin='round'
                />
                <Path
                    d='M129.754 147L102.004 147'
                    stroke={theme.centerChannelColor}
                    strokeWidth={1.5}
                    strokeLinecap='round'
                    strokeLinejoin='round'
                />
                <Path
                    d='M97.5039 147L88.5039 147'
                    stroke={theme.centerChannelColor}
                    strokeWidth={1.5}
                    strokeLinecap='round'
                    strokeLinejoin='round'
                />
                <Path
                    d='M84.0039 147L81.0039 147'
                    stroke={theme.centerChannelColor}
                    strokeWidth={1.5}
                    strokeLinecap='round'
                    strokeLinejoin='round'
                />
                <Path
                    d='M44.4484 44.8193L52.4922 52.8472V13.9575C52.4922 12.9717 51.693 12.1725 50.7072 12.1725H14.5946C13.6087 12.1725 12.8096 12.9717 12.8096 13.9575V43.0343C12.8096 44.0201 13.6087 44.8193 14.5946 44.8193H44.4484Z'
                    fill='#CCC4AE'
                />
                <Path
                    d='M22.7344 22.0932H34.6392'
                    stroke={theme.centerChannelBg}
                    strokeWidth={1.5}
                    strokeLinecap='round'
                />
                <Path
                    d='M22.7344 27.0534H44.5598'
                    stroke={theme.centerChannelBg}
                    strokeWidth={1.5}
                    strokeLinecap='round'
                />
                <Path
                    d='M22.7344 33.0058H31.663'
                    stroke={theme.centerChannelBg}
                    strokeWidth={1.5}
                    strokeLinecap='round'
                />
                <Path
                    d='M33.6445 33.0058H42.5731'
                    stroke={theme.centerChannelBg}
                    strokeWidth={1.5}
                    strokeLinecap='round'
                />
                <Path
                    d='M157.479 50.4967L145.477 62.475V3.57C145.477 2.58418 146.276 1.785 147.262 1.785H202.901C203.887 1.785 204.686 2.58418 204.686 3.57001V48.7117C204.686 49.6975 203.887 50.4967 202.901 50.4967H157.479Z'
                    fill='#28427B'
                />
                <Path
                    d='M160.277 16.5875H178.04'
                    stroke='#fff'
                    strokeWidth={1.5}
                    strokeLinecap='round'
                />
                <Path
                    d='M160.277 23.9887H192.843'
                    stroke='#fff'
                    strokeWidth={1.5}
                    strokeLinecap='round'
                />
                <Path
                    d='M160.277 32.8701H173.6'
                    stroke='#fff'
                    strokeWidth={1.5}
                    strokeLinecap='round'
                />
                <Path
                    d='M176.559 32.8701H189.881'
                    stroke='#fff'
                    strokeWidth={1.5}
                    strokeLinecap='round'
                />
                <Rect
                    x={88.5}
                    y={45}
                    width={29.25}
                    height={6.75}
                    rx={2.25}
                    fill={theme.centerChannelColor}
                    fillOpacity={0.16}
                />
                <Path
                    d='M53.25 77.25V137.25H87M90 137.25H96M99 137.25H102'
                    stroke={theme.centerChannelColor}
                    strokeOpacity={0.32}
                    strokeWidth={1.5}
                    strokeLinecap='round'
                    strokeLinejoin='round'
                />
            </G>
            <Defs>
                <Mask
                    id='mask0_4212_99103'
                    x={50}
                    y={33}
                    width={106}
                    height={74}
                    maskUnits='userSpaceOnUse'
                    maskContentUnits='userSpaceOnUse'
                >
                    <Path
                        d='M103.307 106.208L50.8789 66.9376V33.9151H155.301V66.9376C155.301 66.9376 124.289 90.4914 103.307 106.208Z'
                        fill='#fff'
                    />
                </Mask>
                <ClipPath id='clip0_4212_99103'>
                    <Rect
                        width={204.383}
                        height={178.5}
                        fill='#fff'
                    />
                </ClipPath>
            </Defs>
        </Svg>
    );
};

export default Inbox;
