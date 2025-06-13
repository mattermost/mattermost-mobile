// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {Platform} from 'react-native';
import Svg, {Rect} from 'react-native-svg';

type Props = {
    size?: number;
    color?: string;
};

const PauseIcon: React.FC<Props> = ({size = 66, color = 'white'}) => {
    const platformProps = Platform.select({
        default: {},
        ios: {rx: 2}, // iOS specific corner radius
    });

    return (
        <Svg
            width={size}
            height={size}
            viewBox='0 0 24 24'
            fill='none'
        >
            <Rect
                x='6'
                y='4'
                width='4'
                height='16'
                fill={color}
                {...platformProps}
            />
            <Rect
                x='14'
                y='4'
                width='4'
                height='16'
                fill={color}
                {...platformProps}
            />
        </Svg>
    );
};

export default PauseIcon;
