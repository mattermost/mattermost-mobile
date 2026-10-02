// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import FormattedText from '@components/formatted_text';
import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    text: {
        color: changeOpacity(theme.centerChannelColor, 0.64),
        paddingTop: 8,
        ...typography('Body', 75, 'Regular'),
    },
}));

const PrivacyFooter = ({testID}: {testID: string}) => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);

    return (
        <FormattedText
            id='agents.channel_summary.only_visible_to_you'
            defaultMessage='Agents post responses in a direct message which will only be visible to you.'
            style={styles.text}
            testID={testID}
        />
    );
};

export default PrivacyFooter;
