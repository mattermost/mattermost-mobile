// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {Text, View} from 'react-native';
import {FormattedMessage} from 'react-intl';

export function ScheduledPostIndicator() {
    const [scheduledPostCount, setScheduledPostCount] = React.useState(1);

    if (scheduledPostCount === 0) {
        return null;
    }

    let scheduledPostText: React.ReactNode;

    if (scheduledPostCount === 1) {
        scheduledPostText = (
            <FormattedMessage
                id='scheduled_post.channel_indicator.single'
                defaultMessage='Message scheduled for {dateTime}.'
            />

        );
    }

    return (
        <View>
            <Text>
                {'Hello, world!'}
            </Text>
        </View>
    );
}
