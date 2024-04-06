// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useMemo} from 'react';
import {StyleSheet, View} from 'react-native';

import FormattedText from '@components/formatted_text';
import {useTheme} from '@context/theme';
import {changeOpacity} from '@utils/theme';
import {typography} from '@utils/typography';

const getStyleSheet = ({theme}: { theme: Theme }) => {
    return StyleSheet.create({
        container: {
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.08),
            borderRadius: 4,
        },
        text: {
            paddingLeft: 4,
            paddingRight: 4,
            ...typography('Heading', 25, 'SemiBold'),
            textTransform: 'uppercase',
            color: theme.centerChannelColor,
        },
    });
};

const HostBadge = () => {
    const theme = useTheme();
    const styles = useMemo(() => getStyleSheet({theme}), [theme]);

    return (
        <View style={styles.container}>
            <FormattedText
                id={'mobile.calls_host'}
                defaultMessage={'host'}
                style={styles.text}
            />
        </View>
    );
};

export default HostBadge;
