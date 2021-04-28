// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React, {useState} from 'react';
import {StyleSheet, View, Button, Platform} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

type Props = {
    handleChange: (currentDate: Date) => void;
}

type AndroidMode = 'date' | 'time';

const DateTimeSelector = (props: Props) => {
    const [date, setDate] = useState<Date>(new Date());
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
