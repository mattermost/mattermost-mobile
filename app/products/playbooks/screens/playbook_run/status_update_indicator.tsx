// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useMemo} from 'react';
import {defineMessages, useIntl} from 'react-intl';
import {View, Text} from 'react-native';

import CompassIcon from '@components/compass_icon';
import FriendlyDate from '@components/friendly_date';
import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

type StatusUpdateIndicatorProps = {
    isFinished: boolean;
    timestamp: number;
}

const getStyleSheet = makeStyleSheetFromTheme((theme) => ({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 8,
        borderTopWidth: 1,
        borderBottomWidth: 1,
        borderColor: changeOpacity(theme.centerChannelColor, 0.16),
        gap: 8,
    },
    icon: {
        fontSize: 24,
        color: changeOpacity(theme.centerChannelColor, 0.72),
    },
    textContainer: {
        flex: 1,
    },
    text: {
        ...typography('Body', 200, 'Regular'),
        color: changeOpacity(theme.centerChannelColor, 0.72),
    },
    overdueText: {
        color: theme.dndIndicator,
    },
}));

const messages = defineMessages({
    updateOverdue: {
        id: 'playbooks.playbook_run.status_update_overdue',
        defaultMessage: 'Status update overdue {time}',
    },
    updateDue: {
        id: 'playbooks.playbook_run.status_update_due',
        defaultMessage: 'Status update due {time}',
    },
    finished: {
        id: 'playbooks.playbook_run.status_update_finished',
        defaultMessage: 'Run finished {time}',
    },
});

const StatusUpdateIndicator = ({
    isFinished,
    timestamp,
}: StatusUpdateIndicatorProps) => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);
    const intl = useIntl();

    const values = {time: <FriendlyDate value={timestamp}/>};

    let message = messages.updateDue;
    if (isFinished) {
        message = messages.finished;
    } else if (timestamp < Date.now()) {
        message = messages.updateOverdue;
    }

    const textStyle = useMemo(() => {
        return [
            styles.text,
            !isFinished && timestamp < Date.now() && styles.overdueText,
        ];
    }, [styles.text, styles.overdueText, isFinished, timestamp]);
    const iconStyle = useMemo(() => {
        return [
            styles.icon,
            !isFinished && timestamp < Date.now() && styles.overdueText,
        ];
    }, [styles.icon, styles.overdueText, isFinished, timestamp]);

    const icon = isFinished ? 'flag-checkered' : 'clock-outline';
    return (
        <View style={styles.container}>
            <CompassIcon
                name={icon}
                style={iconStyle}
            />
            <Text style={textStyle}>
                {intl.formatMessage(message, values)}
            </Text>
        </View>
    );
};

export default StatusUpdateIndicator;
