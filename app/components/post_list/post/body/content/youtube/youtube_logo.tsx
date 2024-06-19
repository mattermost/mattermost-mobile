// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import * as React from 'react';
import Svg, {Path, type SvgProps} from 'react-native-svg';

const YouTubeLogo = (props: SvgProps) => (
    <Svg
        width={69}
        height={48}
        fill='none'
        {...props}
    >
        <Path
            fill='red'
            d='M67.14 7.496a8.587 8.587 0 0 0-6.062-6.062C55.728 0 34.284 0 34.284 0S12.841 0 7.496 1.434a8.587 8.587 0 0 0-6.062 6.062C0 12.84 0 24 0 24s0 11.159 1.434 16.504a8.587 8.587 0 0 0 6.062 6.062C12.84 48 34.284 48 34.284 48s21.443 0 26.788-1.434a8.586 8.586 0 0 0 6.063-6.062C68.568 35.16 68.568 24 68.568 24s0-11.159-1.433-16.504h.005Z'
            opacity={0.9}
        />
        <Path
            fill='#fff'
            d='M27.426 34.284 45.246 24l-17.82-10.284v20.568Z'
        />
    </Svg>
);
export default YouTubeLogo;
