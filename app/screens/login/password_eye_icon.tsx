// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import * as React from 'react';
import Svg, {Path} from 'react-native-svg';

import {useTheme} from '@app/context/theme';

interface PasswordEyeIconProps {
    isVisible: Boolean;
}

const EYE_ON_PATH =
    'M12 9a3 3 0 0 1 3 3 3 3 0 0 1-3 3 3 3 0 0 1-3-3 3 3 0 0 1 3-3m0-4.5c5 0 9.27 3.11 11 7.5-1.73 4.39-6 7.5-11 7.5S2.73 16.39 1 12c1.73-4.39 6-7.5 11-7.5M3.18 12a9.821 9.821 0 0 0 17.64 0 9.821 9.821 0 0 0-17.64 0Z';
const EYE_OFF_PATH =
    'M2 5.27 3.28 4 20 20.72 18.73 22l-3.08-3.08c-1.15.38-2.37.58-3.65.58-5 0-9.27-3.11-11-7.5.69-1.76 1.79-3.31 3.19-4.54L2 5.27M12 9a3 3 0 0 1 3 3 3 3 0 0 1-.17 1L11 9.17A3 3 0 0 1 12 9m0-4.5c5 0 9.27 3.11 11 7.5a11.79 11.79 0 0 1-4 5.19l-1.42-1.43A9.862 9.862 0 0 0 20.82 12 9.821 9.821 0 0 0 12 6.5c-1.09 0-2.16.18-3.16.5L7.3 5.47c1.44-.62 3.03-.97 4.7-.97M3.18 12A9.821 9.821 0 0 0 12 17.5c.69 0 1.37-.07 2-.21L11.72 15A3.064 3.064 0 0 1 9 12.28L5.6 8.87c-.99.85-1.82 1.91-2.42 3.13Z';

export const PasswordEyeIcon: React.FC<PasswordEyeIconProps> = ({
    isVisible,
}) => {
    const theme = useTheme();

    return (
        <Svg
            style={{
                width: 18,
                height: 18,
            }}
            viewBox='0 0 24 24'
            color={theme.centerChannelColor}
            opacity={0.64}
        >
            <Path
                fill='currentColor'
                d={isVisible ? EYE_OFF_PATH : EYE_ON_PATH}
            />
        </Svg>
    );
};
