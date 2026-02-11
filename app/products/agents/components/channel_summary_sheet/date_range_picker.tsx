// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import DateTimePicker, {type DateTimePickerEvent} from '@react-native-community/datetimepicker';
import React, {useCallback, useMemo, useState} from 'react';
import {type IntlShape, useIntl} from 'react-intl';
import {Platform, Text, TouchableOpacity, View} from 'react-native';
import tinyColor from 'tinycolor2';

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
        paddingBottom: 24,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
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
        marginTop: 8,
        ...typography('Body', 75, 'SemiBold'),
    },
    dateBox: {
        borderWidth: 1,
        borderColor: changeOpacity(theme.centerChannelColor, 0.16),
        borderRadius: 4,
        padding: 12,
    },
    dateBoxActive: {
        borderWidth: 2,
        borderColor: theme.buttonBg,
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

const formatDate = (date: Date | undefined, intl: IntlShape) => {
    if (!date) {
        return '';
    }
    return date.toLocaleDateString(intl.locale, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
};

type PickerTarget = 'since' | 'until' | undefined;

type DateInputFieldProps = {
    label: string;
    date: Date | undefined;
    placeholder: string;
    onPress: () => void;
    testID: string;
    styles: ReturnType<typeof getStyleSheet>;
    intl: IntlShape;
    isActive: boolean;
};

const DateInputField = ({label, date, placeholder, onPress, testID, styles, intl, isActive}: DateInputFieldProps) => (
    <>
        <Text style={styles.label}>{label}</Text>
        <TouchableOpacity
            onPress={onPress}
            style={[styles.dateBox, isActive && styles.dateBoxActive]}
            testID={testID}
        >
            <Text style={date ? styles.dateText : styles.datePlaceholder}>
                {date ? formatDate(date, intl) : placeholder}
            </Text>
        </TouchableOpacity>
    </>
);

const DateRangePicker = ({onSubmit, onCancel}: Props) => {
    const intl = useIntl();
    const theme = useTheme();
    const styles = getStyleSheet(theme);

    const [since, setSince] = useState<Date | undefined>(() => {
        const d = new Date();
        d.setDate(d.getDate() - 7);
        return d;
    });
    const [until, setUntil] = useState<Date | undefined>(() => new Date());
    const [pickerTarget, setPickerTarget] = useState<PickerTarget>();
    const [errorText, setErrorText] = useState<string | undefined>();

    const dateIsValid = useMemo(() => {
        if (!since || !until) {
            return false;
        }
        return since.getTime() <= until.getTime();
    }, [since, until]);

    const openSincePicker = useCallback(() => {
        if (!since) {
            const today = new Date();
            setSince(until && until < today ? until : today);
        }
        setPickerTarget('since');
    }, [since, until]);

    const openUntilPicker = useCallback(() => {
        if (!until) {
            const today = new Date();
            setUntil(since && since > today ? since : today);
        }
        setPickerTarget('until');
    }, [until, since]);

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
                    hitSlop={{top: 16, bottom: 16, left: 16, right: 16}}
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
            <DateInputField
                label={intl.formatMessage({id: 'agents.channel_summary.since', defaultMessage: 'Start'})}
                date={since}
                placeholder={intl.formatMessage({id: 'agents.channel_summary.since_placeholder', defaultMessage: 'Select date'})}
                onPress={openSincePicker}
                testID='agents.channel_summary.date_from'
                styles={styles}
                intl={intl}
                isActive={pickerTarget === 'since'}
            />

            {/* End Date */}
            <DateInputField
                label={intl.formatMessage({id: 'agents.channel_summary.until', defaultMessage: 'End'})}
                date={until}
                placeholder={intl.formatMessage({id: 'agents.channel_summary.until_placeholder', defaultMessage: 'Select date'})}
                onPress={openUntilPicker}
                testID='agents.channel_summary.date_to'
                styles={styles}
                intl={intl}
                isActive={pickerTarget === 'until'}
            />

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

            {/* Date Picker */}
            {pickerTarget && (
                <DateTimePicker
                    value={(pickerTarget === 'since' ? since : until) || new Date()}
                    mode='date'
                    display={Platform.select({ios: 'spinner', default: 'calendar'})}
                    onChange={onChangeDate}
                    maximumDate={pickerTarget === 'since' ? until : new Date()}
                    minimumDate={pickerTarget === 'until' ? since : undefined}
                    themeVariant={tinyColor(theme.centerChannelBg).isDark() ? 'dark' : 'light'}
                />
            )}
        </View>
    );
};

export default DateRangePicker;

