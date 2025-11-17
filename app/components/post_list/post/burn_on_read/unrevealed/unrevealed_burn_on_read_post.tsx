// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import Button from '@components/button';
import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    buttonBackgroundStyle: {
        backgroundColor: changeOpacity(theme.centerChannelColor, 0.08),
        height: 56,
        marginBottom: 8,
    },
    buttonTextStyle: {
        color: changeOpacity(theme.centerChannelColor, 0.56),
    },
}));

export default function UnrevealedBurnOnReadPost() {
    const theme = useTheme();
    const styles = getStyleSheet(theme);

    return (
        <Button
            text={'View message'}
            iconName='eye-outline'
            theme={theme}
            backgroundStyle={styles.buttonBackgroundStyle}
            textStyle={styles.buttonTextStyle}
        />
    );
}
