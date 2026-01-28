// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import DateTimePicker, {type DateTimePickerEvent} from '@react-native-community/datetimepicker';
import React, {useCallback, useMemo, useState} from 'react';
import {useIntl} from 'react-intl';
import {Platform, Text, TouchableOpacity, View} from 'react-native';

import Button from '@components/button';
import CompassIcon from '@components/compass_icon';
import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

type Props = {
    onSubmit: (since: Date, until: Date) => void;
    onCancel: () => void;
};

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {
        paddingHorizontal: 20,
        paddingBottom: 24,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        marginBottom: 8,
    },
    backButton: {
        marginRight: 12,
    },
    headerTitle: {
        color: theme.centerChannelColor,
        ...typography('Heading', 300, 'SemiBold'),
    },
    label: {
        color: changeOpacity(theme.centerChannelColor, 0.72),
        marginBottom: 4,
        marginTop: 16,
        ...typography('Body', 75, 'SemiBold'),
    },
    dateBox: {
        borderWidth: 1,
        borderColor: changeOpacity(theme.centerChannelColor, 0.16),
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 12,
    },
    dateText: {
        color: theme.centerChannelColor,
        ...typography('Body', 200, 'Regular'),
    },
    datePlaceholder: {
        color: changeOpacity(theme.centerChannelColor, 0.56),
        ...typography('Body', 200, 'Regular'),
    },
    error: {
        marginTop: 8,
        color: theme.errorTextColor,
        ...typography('Body', 75, 'SemiBold'),
    },
    footer: {
        marginTop: 24,
    },
}));

const formatDate = (date?: Date) => {
    if (!date) {
        return '';
    }
    return date.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
};

type PickerTarget = 'since' | 'until' | undefined;

const DateRangePicker = ({onSubmit, onCancel}: Props) => {
    const intl = useIntl();
    const theme = useTheme();
    const styles = getStyleSheet(theme);

    const [since, setSince] = useState<Date | undefined>();
    const [until, setUntil] = useState<Date | undefined>();
    const [pickerTarget, setPickerTarget] = useState<PickerTarget>();
    const [errorText, setErrorText] = useState<string | undefined>();

    const dateIsValid = useMemo(() => {
        if (!since || !until) {
            return false;
        }
        return since.getTime() <= until.getTime();
    }, [since, until]);

    const openPicker = useCallback((target: 'since' | 'until') => {
        setPickerTarget(target);
    }, []);

    const onChangeDate = useCallback((_: DateTimePickerEvent, date?: Date) => {
        if (Platform.OS === 'ios') {
            // iOS uses an inline picker that can stay visible
            const currentTarget = pickerTarget;

            if (!currentTarget || !date) {
                setPickerTarget(undefined);
                return;
            }

            if (currentTarget === 'since') {
                setSince(date);
            } else {
                setUntil(date);
            }

            // Don't close picker on iOS - user can continue adjusting
        } else {
            // Android: Set date inside functional updater to batch both state updates,
            // preventing React re-renders from causing the picker to reopen.
            setPickerTarget((currentTarget) => {
                if (currentTarget && date) {
                    if (currentTarget === 'since') {
                        setSince(date);
                    } else {
                        setUntil(date);
                    }
                }
                return undefined; // Always close on Android (modal auto-dismisses)
            });
        }
    }, [pickerTarget]);

    const handleSubmit = () => {
        setErrorText(undefined);
        if (!since || !until) {
            setErrorText(intl.formatMessage({id: 'agents.channel_summary.range_error', defaultMessage: 'Select a valid date range'}));
            return;
        }
        if (!dateIsValid) {
            setErrorText(intl.formatMessage({id: 'agents.channel_summary.range_error', defaultMessage: 'Select a valid date range'}));
            return;
        }
        onSubmit(since, until);
    };

    return (
        <View style={styles.container}>
            {/* Header with back button */}
            <View style={styles.header}>
                <TouchableOpacity
                    onPress={onCancel}
                    style={styles.backButton}
                    testID='agents.channel_summary.date_picker.back'
                >
                    <CompassIcon
                        name='arrow-left'
                        size={24}
                        color={theme.centerChannelColor}
                    />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>
                    {intl.formatMessage({id: 'agents.channel_summary.date_picker.title', defaultMessage: 'Select date range'})}
                </Text>
            </View>

            {/* Start Date */}
            <Text style={styles.label}>
                {intl.formatMessage({id: 'agents.channel_summary.since', defaultMessage: 'Start'})}
            </Text>
            <TouchableOpacity
                onPress={() => openPicker('since')}
                style={styles.dateBox}
                testID='agents.channel_summary.date_from'
            >
                <Text style={since ? styles.dateText : styles.datePlaceholder}>
                    {since ? formatDate(since) : intl.formatMessage({id: 'agents.channel_summary.since_placeholder', defaultMessage: 'Select date'})}
                </Text>
            </TouchableOpacity>

            {/* End Date */}
            <Text style={styles.label}>
                {intl.formatMessage({id: 'agents.channel_summary.until', defaultMessage: 'End'})}
            </Text>
            <TouchableOpacity
                onPress={() => openPicker('until')}
                style={styles.dateBox}
                testID='agents.channel_summary.date_to'
            >
                <Text style={until ? styles.dateText : styles.datePlaceholder}>
                    {until ? formatDate(until) : intl.formatMessage({id: 'agents.channel_summary.until_placeholder', defaultMessage: 'Select date'})}
                </Text>
            </TouchableOpacity>

            {errorText && <Text style={styles.error}>{errorText}</Text>}

            {/* Submit Button */}
            <View style={styles.footer}>
                <Button
                    onPress={handleSubmit}
                    size='lg'
                    text={intl.formatMessage({id: 'agents.channel_summary.date_picker.submit', defaultMessage: 'Summarize'})}
                    theme={theme}
                    disabled={!since || !until}
                    testID='agents.channel_summary.date_picker.submit'
                />
            </View>

            {/* Date Picker (iOS) */}
            {pickerTarget && Platform.OS === 'ios' && (
                <DateTimePicker
                    value={(pickerTarget === 'since' ? since : until) || new Date()}
                    mode='date'
                    display='spinner'
                    onChange={onChangeDate}
                    maximumDate={pickerTarget === 'since' ? until : new Date()}
                    minimumDate={pickerTarget === 'until' ? since : undefined}
                />
            )}

            {/* Date Picker (Android) */}
            {pickerTarget && Platform.OS === 'android' && (
                <DateTimePicker
                    value={(pickerTarget === 'since' ? since : until) || new Date()}
                    mode='date'
                    display='calendar'
                    onChange={onChangeDate}
                    maximumDate={pickerTarget === 'since' ? until : new Date()}
                    minimumDate={pickerTarget === 'until' ? since : undefined}
                />
            )}
        </View>
    );
};

export default DateRangePicker;

