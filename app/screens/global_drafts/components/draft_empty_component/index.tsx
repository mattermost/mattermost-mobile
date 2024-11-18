// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {useIntl} from 'react-intl';
import {Image, Text, View} from 'react-native';

import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import { typography } from '@utils/typography';

const draft_message_image = require('@assets/images/Draft_Message.png');

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
            ...typography('Heading'),
            color: theme.centerChannelColor,
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
    const intl = useIntl();
    const theme = useTheme();
    const styles = getStyleSheet(theme);
    return (
        <View style={styles.container}>
            <Image
                source={draft_message_image}
            />
            <Text style={styles.title}>
                {intl.formatMessage({id: 'drafts.empty.title', defaultMessage: 'No drafts at the moment'})}
            </Text>
            <Text style={styles.subtitle}>
                {intl.formatMessage({id: 'drafts.empty.subtitle', defaultMessage: 'Any message you have started will show here.'})}
            </Text>
        </View>
    );
};

export default DraftEmptyComponent;
