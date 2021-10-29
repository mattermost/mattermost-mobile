// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {Text, View} from 'react-native';

import CompassIcon, {COMPASS_ICONS} from '@app/components/compass_icon';
import {useTheme} from '@app/context/theme';
import {typography} from '@app/utils/typography';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

type Props = {
    heading: string;
    subheading?: string;
    iconPad?: boolean;
}

const getStyles = makeStyleSheetFromTheme((theme: Theme) => ({
    headingStyles: {
        color: theme.sidebarText,
        ...typography('Heading', 700),
    },
    subHeadingStyles: {
        color: changeOpacity(theme.sidebarText, 0.64),
        ...typography('Heading', 50),
    },
    chevronRow: {
        flexDirection: 'row',
        textAlignVertical: 'center',
        justifyContents: 'center',
        alignItems: 'center',
    },
    icon: {
        color: changeOpacity(theme.sidebarText, 0.8),
        fontSize: 24,
        marginLeft: 4,
    },
    iconPad: {
        marginLeft: 44,
    },
}));

const ChannelListHeader = (props: Props) => {
    const theme = useTheme();
    const styles = getStyles(theme);

    return (
        <View style={props.iconPad && styles.iconPad}>
            <View style={styles.chevronRow}>
                <Text style={styles.headingStyles}>
                    {props.heading}
                </Text>
                <CompassIcon
                    style={styles.icon}
                    name={COMPASS_ICONS['chevron-down']}
                />
            </View>
            <Text style={styles.subHeadingStyles}>
                {props.subheading}
            </Text>
        </View>
    );
};

export default ChannelListHeader;
