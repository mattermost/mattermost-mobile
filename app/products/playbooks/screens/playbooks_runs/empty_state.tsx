// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {defineMessages, useIntl} from 'react-intl';
import {View, Text} from 'react-native';

import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import EmptyStateIcon from './empty_state_icon';

type Props = {
    tab: 'in-progress' | 'finished';
}

const getStylesFromTheme = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        container: {
            paddingHorizontal: 32,
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
        },
        title: {
            ...typography('Heading', 400, 'SemiBold'),
            color: theme.centerChannelColor,
            textAlign: 'center',
            marginTop: 24,
            marginBottom: 8,
        },
        description: {
            ...typography('Body', 200, 'Regular'),
            color: changeOpacity(theme.centerChannelColor, 0.75),
            textAlign: 'center',
        },
    };
});

const messages = defineMessages({
    inProgressTitle: {
        id: 'playbooks.runs.in_progress.title',
        defaultMessage: 'No in progress runs',
    },
    finishedTitle: {
        id: 'playbooks.runs.finished.title',
        defaultMessage: 'No finished runs',
    },
    inProgressDescription: {
        id: 'playbooks.runs.in_progress.description',
        defaultMessage: 'When a run starts in this channel, you’ll see it here.',
    },
    finishedDescription: {
        id: 'playbooks.runs.finished.description',
        defaultMessage: 'When a run in this channel finishes, you’ll see it here.',
    },
});

function EmptyState({tab}: Props) {
    const intl = useIntl();
    const theme = useTheme();
    const styles = getStylesFromTheme(theme);

    const title = tab === 'in-progress' ? messages.inProgressTitle : messages.finishedTitle;
    const description = tab === 'in-progress' ? messages.inProgressDescription : messages.finishedDescription;
    return (
        <View style={styles.container}>
            <EmptyStateIcon/>
            <Text style={styles.title}>{intl.formatMessage(title)}</Text>
            <Text style={styles.description}>{intl.formatMessage(description)}</Text>
        </View>
    );
}

export default EmptyState;
