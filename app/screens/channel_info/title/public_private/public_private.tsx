// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {Text} from 'react-native';

import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

type Props = {
    displayName?: string;
    purpose?: string;
}

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    title: {
        color: theme.centerChannelColor,
        ...typography('Heading', 700, 'SemiBold'),
    },
    purpose: {
        color: changeOpacity(theme.centerChannelColor, 0.72),
        marginTop: 8,
        ...typography('Body', 200),
    },
}));

const PublicPrivate = ({displayName, purpose}: Props) => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);

    return (
        <>
            <Text style={styles.title}>
                {displayName}
            </Text>
            {Boolean(purpose) &&
            <Text style={styles.purpose}>
                {purpose}
            </Text>
            }
        </>
    );
};

export default PublicPrivate;
