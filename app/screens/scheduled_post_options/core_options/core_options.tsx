// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import moment from 'moment/moment';
import React from 'react';
import {useIntl} from 'react-intl';
import {View} from 'react-native';

import {UserModel} from '@database/models/server';
import PickerOption from '@screens/post_priority_picker/components/picker_option';
import {getTimezone} from '@utils/user';

type Props = {
    userTimezone: string;
    onSelectOption: (selectedTime: string) => void;
}

export function ScheduledPostCoreOptions({userTimezone, onSelectOption}: Props) {
    const intl = useIntl();

    const now = moment().tz(userTimezone);

    const nextMonday = now.clone().isoWeekday(1).add(1, 'week').startOf('day').hour(9).minute(0);
    const optionMonday = (
        <PickerOption
            key='scheduledPostOptionMonday'
            label={intl.formatMessage({id: 'scheduled_post.picker.monday', defaultMessage: 'Monday at 9 AM'})}
            action={onSelectOption}
            value={nextMonday.unix().toString()}
        />
    );

    const tomorrow = now.clone().add(1, 'day').startOf('day').hour(9).minute(0);
    const optionTomorrow = (
        <PickerOption
            key='scheduledPostOptionTomorrow'
            label={intl.formatMessage({id: 'scheduled_post.picker.tomorrow', defaultMessage: 'Tomorrow at 9 AM'})}
            action={onSelectOption}
            value={tomorrow.unix().toString()}
        />
    );

    const optionNextMonday = (
        <PickerOption
            key='scheduledPostOptionNextMonday'
            label={intl.formatMessage({id: 'scheduled_post.picker.monday', defaultMessage: 'Next Monday at 9 AM'})}
            action={onSelectOption}
            value={nextMonday.unix().toString()}
        />
    );

    let options: React.ReactElement[] = [];

    switch (now.weekday()) {
        // Sunday
        case 7:
            options = [optionTomorrow];
            break;

        // Monday
        case 1:
            options = [optionTomorrow, optionNextMonday];
            break;

        // Friday and Saturday
        case 5:
        case 6:
            options = [optionMonday];
            break;

        // Tuesday to Thursday
        default:
            options = [optionTomorrow, optionMonday];
    }

    return (
        <View>
            {options}
        </View>
    );
}
