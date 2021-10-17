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

    return (
        <View>
            <Text style={[typography('Heading', 700), {color: theme.sidebarText}]}>
                {props.heading}
            </Text>
            <Text style={[typography('Heading', 50), {color: changeOpacity(theme.sidebarText, 0.64)}]}>
                {props.subheading}
            </Text>
        </View>
    );
};

export default ChannelListHeader;
