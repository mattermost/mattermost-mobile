// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React, { useState } from 'react';
import { StyleSheet, View, Button, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useSelector } from 'react-redux';
import { GlobalState } from '@mm-redux/types/store';
import { getCurrentUserId } from '@mm-redux/selectors/entities/users';
import { getUserTimezone } from '@mm-redux/selectors/entities/timezone';
import { getCurrentDateAndTimeForTimezone } from '@utils/timezone';

type Props = {
    handleChange: (currentDate: Date) => void;
}

type AndroidMode = 'date' | 'time';

const DateTimeSelector = (props: Props) => {
    const currentUserId = useSelector((state: GlobalState) => getCurrentUserId(state));
    const userTimezone = useSelector((state: GlobalState) => getUserTimezone(state, currentUserId));
    let currentTime = new Date();
    let timezone: string | undefined;
    timezone = userTimezone.manualTimezone;
    if (userTimezone.useAutomaticTimezone) {
        timezone = userTimezone.automaticTimezone;
    }
    currentTime = getCurrentDateAndTimeForTimezone(timezone);
    const [date, setDate] = useState<Date>(currentTime);
    const [mode, setMode] = useState<AndroidMode>('date');
    const [show, setShow] = useState<boolean>(false);

    const onChange = (event: React.ChangeEvent<HTMLInputElement>, selectedDate: Date) => {
        const currentDate = selectedDate || date;
        setShow(Platform.OS === 'ios');
        setDate(currentDate);
        props.handleChange(currentDate);
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

    return (
        <View style={styles.container}>
            <View style={styles.datePicker}>
                <Button
                    onPress={showDatepicker}
                    title='Select Date'
                />
            </View>
            <View>
                <Button
                    onPress={showTimepicker}
                    title='Select Time'
                />
            </View>
            {show && (
                <DateTimePicker
                    testID='dateTimePicker'
                    value={date}
                    mode={mode}
                    is24Hour={true}
                    display='default'
                    onChange={onChange}
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        flexDirection: 'row',
        backgroundColor: '#fff',
        alignItems: 'center',
        justifyContent: 'center',
    },
    datePicker: {
        marginRight: 10,
    },
});
export default DateTimeSelector;
