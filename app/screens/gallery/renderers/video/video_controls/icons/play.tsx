// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import Svg, {Path} from 'react-native-svg';

type Props = {
    size?: number;
    color?: string;
};

const PlayIcon: React.FC<Props> = ({size = 66, color = 'white'}) => {
    return (
        <Svg
            width={size}
            height={size}
            viewBox='0 0 24 24'
            fill='none'
        >
            <Path
                d='M8 5.14v13.72c0 .79.87 1.27 1.54.84l11.28-7.32a1 1 0 0 0 0-1.68L9.54 4.38A1 1 0 0 0 8 5.14z'
                fill={color}
            />
        </Svg>
    );
};

export default PlayIcon;
