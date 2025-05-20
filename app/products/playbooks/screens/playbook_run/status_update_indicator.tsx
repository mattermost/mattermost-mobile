// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {useIntl} from 'react-intl';
import {View, Text} from 'react-native';

import CompassIcon from '@components/compass_icon';
import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

type StatusUpdateIndicatorProps = {
    lastStatusUpdateAt: number;
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
}));

const StatusUpdateIndicator = ({lastStatusUpdateAt}: StatusUpdateIndicatorProps) => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);
    const intl = useIntl();

    return (
        <View style={styles.container}>
            <CompassIcon
                name='clock-outline'
                style={styles.icon}
            />
            <Text style={styles.text}>
                {intl.formatMessage({
                    id: 'playbooks.playbook_run.status_update_due',
                    defaultMessage: 'Status update due in {time}',
                }, {time: lastStatusUpdateAt})}
            </Text>
        </View>
    );
};

export default StatusUpdateIndicator;
