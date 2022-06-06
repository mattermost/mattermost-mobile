// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {useIntl} from 'react-intl';
import {View, Text} from 'react-native';

import {useTheme} from '@context/theme';
import {makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import SearchHintSVG from './illustrations/search_hint.svg';

const getStyles = makeStyleSheetFromTheme((theme: Theme) => ({
    title: {
        ...typography('Heading', 300),
        color: theme.centerChannelColor,
    },
    subtitle: {
        ...typography('Body', 100),
        color: theme.centerChannelColor,
    },
    container: {
        flex: 1,
        flexDirection: 'row',
        paddingTop: 16,
        paddingRight: 16,
        paddingLeft: 32,
    },
    right: {
        flexDirection: 'column',
        flex: 1,
        paddingLeft: 8,
    },
}));

function EndOfList() {
    const intl = useIntl();
    const theme = useTheme();
    const styles = getStyles(theme);

    const title = intl.formatMessage({
        id: 'threads.end_of_list.title',
        defaultMessage: 'That\'s the end of the list!',
    });

    const subtitle = intl.formatMessage({
        id: 'threads.end_of_list.subtitle',
        defaultMessage: 'If you\'re looking for older conversations, try searching instead',
    });

    return (
        <View style={styles.container}>
            <View>
                <SearchHintSVG/>
            </View>
            <View style={styles.right}>
                <Text style={styles.title}>{title}</Text>
                <Text style={styles.subtitle}>{subtitle}</Text>
            </View>
        </View>
    );
}

export default EndOfList;
