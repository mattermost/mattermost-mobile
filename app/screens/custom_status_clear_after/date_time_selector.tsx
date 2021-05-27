// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React, {useState} from 'react';
import {View, Button, Platform} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import {useSelector} from 'react-redux';
import {GlobalState} from '@mm-redux/types/store';
import {getCurrentUserTimezone, isTimezoneEnabled} from '@mm-redux/selectors/entities/timezone';
import {getCurrentDateAndTimeForTimezone} from '@utils/timezone';
import {getBool} from '@mm-redux/selectors/entities/preferences';
import Preferences from '@mm-redux/constants/preferences';
import {Theme} from '@mm-redux/types/preferences';
import {makeStyleSheetFromTheme} from '@utils/theme';
import moment from 'moment';
import {Moment} from 'moment-timezone';

type Props = {
    theme: Theme;
    handleChange: (currentDate: Moment) => void;
}

type AndroidMode = 'date' | 'time';

const DateTimeSelector = (props: Props) => {
    const {theme} = props;
    const styles = getStyleSheet(theme);
    const enableTimezone = useSelector((state: GlobalState) => isTimezoneEnabled(state));
    const militaryTime = useSelector((state: GlobalState) => getBool(state, Preferences.CATEGORY_DISPLAY_SETTINGS, 'use_military_time'));
    const timezone = useSelector((state: GlobalState) => getCurrentUserTimezone(state));
    let currentTime = moment();
    if (enableTimezone && timezone) {
        currentTime = getCurrentDateAndTimeForTimezone(timezone);
    }
    const [date, setDate] = useState<Moment>(currentTime);
    const [mode, setMode] = useState<AndroidMode>('date');
    const [show, setShow] = useState<boolean>(false);

    const onChange = (event: React.ChangeEvent<HTMLInputElement>, selectedDate: Date) => {
        const currentDate = selectedDate || date;
        setShow(Platform.OS === 'ios');
        setDate(moment(currentDate));
        props.handleChange(moment(currentDate));
    };

    const showMode = (currentMode: AndroidMode) => {
        setShow(true);
        setMode(currentMode);
    };

    const showDatepicker = () => {
        showMode('date');
    };

    const showTimepicker = () => {
        showMode('time');
    };

    const renderDateTimePicker = show && (
        <DateTimePicker
            testID='dateTimePicker'
            value={moment(date).toDate()}
            mode={mode}
            is24Hour={militaryTime}
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={onChange}
        />
    );

    return (
        <View style={styles.container}>
            <View style={styles.datePicker}>
                <Button
                    onPress={showDatepicker}
                    title='Select Date'
                    color={theme.buttonBg}
                />
            </View>
            <View>
                <Button
                    onPress={showTimepicker}
                    title='Select Time'
                    color={theme.buttonBg}
                />
            </View>
            {renderDateTimePicker}
        </View>
    );
};

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        container: {
            flex: 1,
            flexDirection: 'row',
            backgroundColor: theme.centerChannelBg,
            alignItems: 'center',
            justifyContent: 'center',
            paddingBottom: 10,
        },
        datePicker: {
            marginRight: 10,
        },

    };
});
export default DateTimeSelector;
