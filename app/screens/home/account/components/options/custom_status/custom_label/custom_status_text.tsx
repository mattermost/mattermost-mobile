// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import CustomText from '@components/custom_status/custom_status_text';
import FormattedText from '@components/formatted_text';
import {useTheme} from '@context/theme';
import {makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

type CustomStatusTextProps = {
    customStatus?: UserCustomStatus;
    isStatusSet: boolean;
    testID?: string;
};

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    text: {
        color: theme.centerChannelColor,
        ...typography('Body', 200),
    },
}));

const CustomStatusText = ({isStatusSet, customStatus, testID}: CustomStatusTextProps) => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);

    let text: React.ReactNode | string;

    text = (
        <FormattedText
            id='mobile.routes.custom_status'
            defaultMessage='Set a custom status'
            style={styles.text}
        />
    );

    if (isStatusSet && customStatus?.text) {
        text = customStatus.text;
    }

    return (
        <CustomText
            text={text}
            theme={theme}
            textStyle={styles.text}
            testID={testID}
        />
    );
};

export default CustomStatusText;
