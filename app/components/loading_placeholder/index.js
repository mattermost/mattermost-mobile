// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import AnimatedEllipsis from 'react-native-animated-ellipsis';
import FormattedText from 'app/components/formatted_text';

import {Text} from 'react-native';

const LoadingPlaceholder = () => (
    <Text>
        <FormattedText
            id='loading_screen.loading'
            defaultMessage='Loading'
        />
        <AnimatedEllipsis
            minOpacity={0.4}
            style={{
                fontSize: 28,
                lineHeight: 30,
                letterSpacing: -3,
                marginLeft: 5,
            }}
        />
    </Text>
);

export default LoadingPlaceholder;
