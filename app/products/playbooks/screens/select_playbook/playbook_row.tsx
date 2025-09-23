// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {useIntl} from 'react-intl';
import {View, Text, TouchableOpacity} from 'react-native';

import CompassIcon from '@components/compass_icon';
import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

type Props = {
    playbook: Playbook;
    onPress?: (playbook: Playbook) => void;
    testID?: string;
};

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        container: {
            flexDirection: 'row',
            alignItems: 'flex-start',
            gap: 16,
            paddingVertical: 12,
        },
        contentContainer: {
            flex: 1,
            flexDirection: 'column',
            gap: 2,
        },
        title: {
            color: theme.centerChannelColor,
            ...typography('Body', 200, 'Regular'),
        },
        statusText: {
            color: changeOpacity(theme.centerChannelColor, 0.64),
            ...typography('Body', 75, 'Regular'),
        },
    };
});

const PlaybookRow = ({playbook, onPress, testID}: Props) => {
    const theme = useTheme();
    const intl = useIntl();
    const styles = getStyleSheet(theme);

    const handlePress = () => {
        onPress?.(playbook);
    };

    const formatLastUsed = (lastRunAt: number) => {
        if (!lastRunAt) {
            return intl.formatMessage({
                id: 'playbooks.row.never_used',
                defaultMessage: 'Never used',
            });
        }

        const now = Date.now();
        const diff = now - lastRunAt;
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const days = Math.floor(hours / 24);

        if (days > 0) {
            return intl.formatMessage({
                id: 'playbooks.row.days_ago',
                defaultMessage: 'Last used {days} {days, plural, one {day} other {days}} ago',
            }, {days});
        }
        if (hours > 0) {
            return intl.formatMessage({
                id: 'playbooks.row.hours_ago',
                defaultMessage: 'Last used {hours} {hours, plural, one {hour} other {hours}} ago',
            }, {hours});
        }
        return intl.formatMessage({
            id: 'playbooks.row.just_now',
            defaultMessage: 'Last used just now',
        });
    };

    const formatRunsInProgress = (activeRuns: number) => {
        if (activeRuns === 0) {
            return intl.formatMessage({
                id: 'playbooks.row.no_runs',
                defaultMessage: 'No runs in progress',
            });
        }
        return intl.formatMessage({
            id: 'playbooks.row.runs',
            defaultMessage: '{count} {count, plural, one {run} other {runs}} in progress',
        }, {count: activeRuns});
    };

    const statusText = `${formatLastUsed(playbook.last_run_at)} • ${formatRunsInProgress(playbook.active_runs)}`;

    return (
        <TouchableOpacity
            onPress={handlePress}
            style={styles.container}
            testID={testID}
            activeOpacity={0.7}
        >
            <CompassIcon
                name={playbook.public ? 'book-outline' : 'book-lock-outline'}
                size={24}
                color={changeOpacity(theme.centerChannelColor, 0.64)}
            />
            <View style={styles.contentContainer}>
                <Text
                    style={styles.title}
                    numberOfLines={1}
                    ellipsizeMode='tail'
                >
                    {playbook.title}
                </Text>
                <Text
                    style={styles.statusText}
                    numberOfLines={1}
                    ellipsizeMode='tail'
                >
                    {statusText}
                </Text>
            </View>
        </TouchableOpacity>
    );
};

export default PlaybookRow;
