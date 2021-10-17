// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {Text, View} from 'react-native';

import {useTheme} from '@app/context/theme';
import {typography} from '@app/utils/typography';
import CompassIcon from '@components/compass_icon';
import {makeStyleSheetFromTheme} from '@utils/theme';

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {
        paddingVertical: 4,
        display: 'flex',
        flexDirection: 'row',
    },
    icon: {
        fontSize: 24,
        lineHeight: 28,
        color: theme.sidebarText,
    },
    text: {
        color: theme.sidebarText,
        paddingLeft: 12,
    },
}));

type Props = {
    unreadCount?: number;
    highlight?: boolean;
    archived?: boolean;
    muted?: boolean;
    name: string;
}

const ChannelListItemComponent = (props: Props) => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);

    return (
        <View style={styles.container}>
            <CompassIcon
                name='globe'
                style={styles.icon}
            />
            <Text style={[typography('Body', 200, 'SemiBold'), styles.text]}>
                {props.name}
            </Text>
        </View>
    );
};

export default ChannelListItemComponent;
