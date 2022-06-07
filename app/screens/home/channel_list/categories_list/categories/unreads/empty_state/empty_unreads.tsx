// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import * as React from 'react';
import Svg, {Ellipse, Path} from 'react-native-svg';

import {useTheme} from '@context/theme';

function SvgComponent() {
    const theme = useTheme();

    return (
        <Svg
            width={140}
            height={140}
            viewBox='0 0 140 140'
            fill='none'
        >
            <Ellipse
                cx={70}
                cy={114}
                rx={45}
                ry={3}
                fill='#000'
                fillOpacity={0.08}
            />
            <Path
                d='M107.838 26.436h-75.65a10.577 10.577 0 00-7.475 3.06 10.533 10.533 0 00-3.117 7.44v47.977a10.516 10.516 0 003.117 7.44 10.56 10.56 0 007.475 3.06h11.165v17.959l16.746-17.96h47.712a10.576 10.576 0 007.476-3.06 10.52 10.52 0 003.117-7.439V36.937a10.521 10.521 0 00-3.108-7.43 10.567 10.567 0 00-7.458-3.07z'
                fill='#FFBC1F'
            />
            <Path
                d='M60.1 95.413h47.711a10.576 10.576 0 007.476-3.06 10.52 10.52 0 003.117-7.439V55.785s-3.331 26.935-3.93 29.306c-.598 2.37-1.786 5.918-7.413 6.506-5.627.588-46.962 3.815-46.962 3.815z'
                fill='#CC8F00'
            />
            <Path
                d='M29.447 46.526a21.375 21.375 0 013.823-7.464 21.426 21.426 0 016.403-5.424.74.74 0 00-.303-1.4c-4.77-.285-14.398.731-11.38 14.217a.749.749 0 001.171.469.748.748 0 00.286-.398z'
                fill='#FFD470'
            />
            <Path
                d='M86.565 44.167L66.313 66.44l-5.878-4.455h-3.268l9.146 14.848 23.52-32.664h-3.268z'
                fill={theme.sidebarBg}
            />
        </Svg>
    );
}

export default SvgComponent;
