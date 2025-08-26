// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import moment from 'moment/moment';
import React, {useCallback, useState} from 'react';
import {useIntl} from 'react-intl';
import {View} from 'react-native';

import DateTimeSelector from '@components/data_time_selector';
import {useTheme} from '@context/theme';
import PickerOption from '@screens/post_priority_picker/components/picker_option';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {getFormattedTime} from '@utils/time';

import type {Moment} from 'moment-timezone';

const optionKeysOptionMonday = 'scheduledPostOptionMonday';
const optionKeyOptionTomorrow = 'scheduledPostOptionTomorrow';
const optionKeyOptionNextMonday = 'scheduledPostOptionNextMonday';
const optionKeyOptionCustom = 'scheduledPostOptionCustom';

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    optionsSeparator: {
        backgroundColor: changeOpacity(theme.centerChannelColor, 0.08),
        height: 1,
    },
}));

type Props = {
    userTimezone: string;
    isMilitaryTime: boolean;
    onSelectOption: (selectedTime: string) => void;
    onCustomTimeSelected: (customTimeSelected: boolean) => void;
}

export function ScheduledPostCoreOptions({userTimezone, isMilitaryTime, onSelectOption, onCustomTimeSelected}: Props) {
    const intl = useIntl();
    const theme = useTheme();

    const style = getStyleSheet(theme);

    const [selectedOption, setSelectedOptions] = useState<string>();
    const [showDateTimePicker, setShowDateTimePicker] = useState(false);

    const now = moment().tz(userTimezone);

    const handleSelectOption = useCallback((optionKey: string) => {
        setSelectedOptions(optionKey);
        onCustomTimeSelected(optionKey === optionKeyOptionCustom);
        setShowDateTimePicker(optionKey === optionKeyOptionCustom);

        let selectedTime: Moment | undefined;
        switch (optionKey) {
            case optionKeyOptionNextMonday:
            case optionKeysOptionMonday: {
                selectedTime = now.clone().isoWeekday(1).add(1, 'week').startOf('day').hour(9).minute(0);
                break;
            }
            case optionKeyOptionTomorrow: {
                selectedTime = now.clone().add(1, 'day').startOf('day').hour(9).minute(0);
                break;
            }
        }

        if (selectedTime) {
            onSelectOption(selectedTime.valueOf().toString());
        }
    }, [now, onSelectOption]);

    const handleCustomTimeChange = useCallback((selectedTime: Moment) => {
        onSelectOption(selectedTime.valueOf().toString());
    }, [onSelectOption]);

    const nineAmTime = moment().
        tz(userTimezone).
        set({hour: 9, minute: 0, second: 0, millisecond: 0}).
        valueOf();
    const formattedTimeString = getFormattedTime(isMilitaryTime, userTimezone, nineAmTime);

    const optionMonday = (
        <PickerOption
            key={optionKeysOptionMonday}
            label={intl.formatMessage({id: 'scheduled_post.picker.monday', defaultMessage: 'Monday at {9amTime}'}, {'9amTime': formattedTimeString})}
            action={handleSelectOption}
            value={optionKeysOptionMonday}
            selected={selectedOption === optionKeysOptionMonday}
        />
    );

    const optionTomorrow = (
        <PickerOption
            key={optionKeyOptionTomorrow}
            label={intl.formatMessage({id: 'scheduled_post.picker.tomorrow', defaultMessage: 'Tomorrow at {9amTime}'}, {'9amTime': formattedTimeString})}
            action={handleSelectOption}
            value={optionKeyOptionTomorrow}
            selected={selectedOption === optionKeyOptionTomorrow}
        />
    );

    const optionNextMonday = (
        <PickerOption
            key={optionKeyOptionNextMonday}
            label={intl.formatMessage({id: 'scheduled_post.picker.next_monday', defaultMessage: 'Next Monday at {9amTime}'}, {'9amTime': formattedTimeString})}
            action={handleSelectOption}
            value={optionKeyOptionNextMonday}
            selected={selectedOption === optionKeyOptionNextMonday}
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
            <View style={style.optionsSeparator}/>
            <PickerOption
                key={optionKeyOptionCustom}
                label={intl.formatMessage({id: 'scheduled_post.picker.custom', defaultMessage: 'Custom Time'})}
                action={handleSelectOption}
                value={optionKeyOptionCustom}
                selected={selectedOption === optionKeyOptionCustom}
            />
            {showDateTimePicker && (
                <DateTimeSelector
                    handleChange={handleCustomTimeChange}
                    theme={theme}
                    timezone={userTimezone}
                    showInitially='date'
                />
            )}
        </View>
    );
}
