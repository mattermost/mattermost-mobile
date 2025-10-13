// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useMemo} from 'react';
import {defineMessages, useIntl} from 'react-intl';
import {View, Text} from 'react-native';

import Button from '@components/button';
import CompassIcon from '@components/compass_icon';
import FriendlyDate from '@components/friendly_date';
import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import {goToPostUpdate} from '../navigation';

type StatusUpdateIndicatorProps = {
    isFinished: boolean;
    isParticipant: boolean;
    timestamp: number;
    playbookRunId: string;
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
    due: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        flex: 1,
    },
    dueTextContainer: {
        flex: 1,
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
    update: {
        id: 'playbooks.playbook_run.status_update',
        defaultMessage: 'Post update',
    },
});

const StatusUpdateIndicator = ({
    isFinished,
    timestamp,
    isParticipant,
    playbookRunId,
}: StatusUpdateIndicatorProps) => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);
    const intl = useIntl();

    const values = {time: <FriendlyDate value={timestamp}/>};
    const readOnly = !isParticipant || isFinished;

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

    const onUpdatePress = useCallback(async () => {
        if (readOnly) {
            return;
        }

        await goToPostUpdate(intl, playbookRunId);
    }, [intl, playbookRunId, readOnly]);

    const icon = isFinished ? 'flag-checkered' : 'clock-outline';
    return (
        <View style={styles.container}>
            <View style={styles.due}>
                <CompassIcon
                    name={icon}
                    style={iconStyle}
                />
                <View style={styles.dueTextContainer}>
                    <Text style={textStyle}>
                        {intl.formatMessage(message, values)}
                    </Text>
                </View>
            </View>
            <Button
                text={intl.formatMessage(messages.update)}
                onPress={onUpdatePress}
                theme={theme}
                size='lg'
                disabled={readOnly}
            />
        </View>
    );
};

export default StatusUpdateIndicator;
