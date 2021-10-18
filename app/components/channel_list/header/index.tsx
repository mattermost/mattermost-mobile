// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {Text, View} from 'react-native';

import {useTheme} from '@app/context/theme';
import {typography} from '@app/utils/typography';
import {changeOpacity} from '@utils/theme';

type Props = {
    heading: string;
    subheading?: string;
}

const ChannelListHeader = (props: Props) => {
    const theme = useTheme();

    const headingStyles = [
        typography('Heading', 700),
        {color: theme.sidebarText},
    ];
    const subHeadingStyles = [
        typography('Heading', 50),
        {color: changeOpacity(theme.sidebarText, 0.64)},
    ];

    return (
        <View>
            <Text style={headingStyles}>
                {props.heading}
            </Text>
            <Text style={subHeadingStyles}>
                {props.subheading}
            </Text>
        </View>
    );
};

export default ChannelListHeader;
