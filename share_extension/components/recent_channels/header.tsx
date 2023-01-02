// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {View} from 'react-native';

import FormattedText from '@components/formatted_text';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

const getStyles = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {
        paddingVertical: 8,
        paddingTop: 12,
        paddingLeft: 2,
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: theme.centerChannelBg,
    },
    heading: {
        color: changeOpacity(theme.centerChannelColor, 0.64),
        textTransform: 'uppercase',
        ...typography('Heading', 75, 'SemiBold'),
    },
}));

type Props = {
    theme: Theme;
}

const RecentHeader = ({theme}: Props) => {
    const styles = getStyles(theme);

    return (
        <View style={styles.container}>
            <FormattedText
                id='mobile.channel_list.recent'
                defaultMessage='Recent'
                style={styles.heading}
            />
        </View>
    );
};

export default RecentHeader;
