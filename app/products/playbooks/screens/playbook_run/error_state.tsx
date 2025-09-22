// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {defineMessages, useIntl} from 'react-intl';
import {View, Text} from 'react-native';

import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import ErrorStateIcon from './error_state_icon';

const getStylesFromTheme = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        container: {
            paddingHorizontal: 32,
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            gap: 24,
        },
        title: {
            ...typography('Heading', 400, 'SemiBold'),
            color: theme.centerChannelColor,
            textAlign: 'center',
        },
        description: {
            ...typography('Body', 200, 'Regular'),
            color: changeOpacity(theme.centerChannelColor, 0.75),
            textAlign: 'center',
        },
        titleAndDescription: {
            gap: 8,
        },
    };
});

const messages = defineMessages({
    title: {
        id: 'playbooks.playbook_run.error.title',
        defaultMessage: 'Unable to fetch run details',
    },
    description: {
        id: 'playbooks.playbook_run.error.description',
        defaultMessage: 'Please check your network connection or try again later.',
    },
});

function ErrorState() {
    const intl = useIntl();
    const theme = useTheme();
    const styles = getStylesFromTheme(theme);

    const displayTitle = intl.formatMessage(messages.title);
    const displayDescription = intl.formatMessage(messages.description);

    return (
        <View style={styles.container}>
            <ErrorStateIcon/>
            <View style={styles.titleAndDescription}>
                <Text style={styles.title}>{displayTitle}</Text>
                <Text style={styles.description}>{displayDescription}</Text>
            </View>
        </View>
    );
}

export default ErrorState;
