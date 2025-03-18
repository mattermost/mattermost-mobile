// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {FormattedMessage} from 'react-intl';

import FormattedTime from '@components/formatted_time';
import {getUserTimezone} from '@utils/user';

import type ScheduledPostModel from '@typings/database/models/servers/scheduled_post';
import type UserModel from '@typings/database/models/servers/user';

type Props = {
    scheduledPosts: ScheduledPostModel[];
    currentUser: UserModel | undefined;
    isMilitaryTime: boolean;
}

const ScheduledPostIndicatorWithDatetime = ({
    scheduledPosts,
    currentUser,
    isMilitaryTime,
}: Props) => {
    const dateTime = (
        <FormattedTime
            timezone={getUserTimezone(currentUser)}
            isMilitaryTime={isMilitaryTime}
            value={scheduledPosts[0].scheduledAt}
            testID='scheduled_post_indicator_single_time'
        />
    );

    return (
        <FormattedMessage
            id='scheduled_post.channel_indicator.single'
            defaultMessage='Message scheduled for {dateTime}.'
            values={{
                dateTime,
            }}
        />
    );
};

export default ScheduledPostIndicatorWithDatetime;
