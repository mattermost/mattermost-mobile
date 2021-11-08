// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {Text, View} from 'react-native';

import CompassIcon from '@components/compass_icon';
import TouchableWithFeedback from '@components/touchable_with_feedback';
import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

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
    iconPad: {
        marginLeft: 44,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    chevronButton: {
        marginLeft: 4,
    },
    chevronIcon: {
        color: changeOpacity(theme.sidebarText, 0.8),
        fontSize: 24,
    },
    plusButton: {
        backgroundColor: changeOpacity(theme.sidebarText, 0.08),
        height: 28,
        width: 28,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    plusIcon: {
        color: changeOpacity(theme.sidebarText, 0.8),
        fontSize: 18,
    },
}));

const ChannelListHeader = (props: Props) => {
    const theme = useTheme();
    const styles = getStyles(theme);

    return (
        <View style={props.iconPad && styles.iconPad}>
            <View style={styles.headerRow}>
                <View style={styles.headerRow}>
                    <Text style={styles.headingStyles}>
                        {props.heading}
                    </Text>
                    <TouchableWithFeedback style={styles.chevronButton}>
                        <CompassIcon
                            style={styles.chevronIcon}
                            name={'chevron-down'}
                        />
                    </TouchableWithFeedback>
                </View>
                <TouchableWithFeedback style={styles.plusButton}>
                    <CompassIcon
                        style={styles.plusIcon}
                        name={'plus'}
                    />
                </TouchableWithFeedback>
            </View>
            <Text style={styles.subHeadingStyles}>
                {props.subheading}
            </Text>
        </View>
    );
};

export default ChannelListHeader;
