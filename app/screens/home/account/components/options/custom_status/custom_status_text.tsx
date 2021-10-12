// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import CustomText from '@components/custom_status/custom_status_text';
import FormattedText from '@components/formatted_text';
import {makeStyleSheetFromTheme} from '@utils/theme';

type CustomStatusTextProps = {
    customStatus?: UserCustomStatus;
    isStatusSet: boolean;
    theme: Theme;
};

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    text: {
        color: theme.centerChannelColor,
    },
}));

const CustomStatusText = ({isStatusSet, customStatus, theme}: CustomStatusTextProps) => {
    let text: React.ReactNode | string;

    text = (
        <FormattedText
            id='mobile.routes.custom_status'
            defaultMessage='Set a Status'
        />
    );

    if (isStatusSet && customStatus?.text) {
        text = customStatus.text;
    }

    const styles = getStyleSheet(theme);
    return (
        <CustomText
            text={text}
            theme={theme}
            textStyle={styles.text}
        />
    );
};

export default CustomStatusText;
