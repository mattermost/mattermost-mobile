// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {View} from 'react-native';

import FormattedText from '@components/formatted_text';
import DraftEmpty from '@components/illustrations/draft_empty';
import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        container: {
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
        },
        image: {
            width: 120,
            height: 120,
            marginBottom: 20,
        },
        title: {
            ...typography('Heading', 400, 'SemiBold'),
            color: theme.centerChannelColor,
            marginTop: 20,
        },
        subtitle: {
            ...typography('Body'),
            color: changeOpacity(theme.centerChannelColor, 0.72),
            textAlign: 'center',
            marginTop: 8,
        },
    };
});

const DraftEmptyComponent = () => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);
    return (
        <View
            style={styles.container}
            testID='draft_empty_component'
        >
            <DraftEmpty/>
            <FormattedText
                id='drafts.empty.title'
                defaultMessage={'No drafts at the moment'}
                style={styles.title}
            />
            <FormattedText
                id='drafts.empty.subtitle'
                defaultMessage={'Any message you have started will show here.'}
                style={styles.subtitle}
            />
        </View>
    );
};

export default DraftEmptyComponent;
