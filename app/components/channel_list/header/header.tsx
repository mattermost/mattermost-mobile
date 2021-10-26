// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {Text, View} from 'react-native';

import {useServerDisplayName} from '@app/context/server_display_name';
import {useTheme} from '@app/context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@app/utils/theme';
import {typography} from '@app/utils/typography';

const getStyles = makeStyleSheetFromTheme((theme: Theme) => ({
    headingStyles: {
        color: theme.sidebarText,
        ...typography('Heading', 700),
    },
    subHeadingStyles: {
        color: changeOpacity(theme.sidebarText, 0.64),
        ...typography('Heading', 50),
    },
}));

type ChannelListHeaderProps = {
    teamName: string;
}

const ChannelListHeader = ({teamName}: ChannelListHeaderProps) => {
    const theme = useTheme();
    const styles = getStyles(theme);

    const serverName = useServerDisplayName();

    return (
        <View>
            <Text style={styles.headingStyles}>
                {teamName}
            </Text>
            <Text style={styles.subHeadingStyles}>
                {serverName}
            </Text>
        </View>
    );
};

export default ChannelListHeader;
