// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import DateTimePicker, {type DateTimePickerEvent} from '@react-native-community/datetimepicker';
import React, {useCallback, useMemo, useState} from 'react';
import {useIntl} from 'react-intl';
import {Platform, TouchableOpacity, View} from 'react-native';
import tinyColor from 'tinycolor2';

import Button from '@components/button';
import CompassIcon from '@components/compass_icon';
import FormattedDate, {type FormattedDateFormat} from '@components/formatted_date';
import FormattedText from '@components/formatted_text';
import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

type Props = {
    onSubmit: (since: Date, until: Date) => void;
    onCancel: () => void;
};

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {
        paddingBottom: 8,
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

const DATE_FORMAT: FormattedDateFormat = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
};

type PickerTarget = 'since' | 'until' | undefined;

type DateInputFieldProps = {
    labelId: string;
    labelDefault: string;
    date: Date | undefined;
    placeholderId: string;
    placeholderDefault: string;
    onPress: () => void;
    testID: string;
    styles: ReturnType<typeof getStyleSheet>;
    isActive: boolean;
};

const DateInputField = ({labelId, labelDefault, date, placeholderId, placeholderDefault, onPress, testID, styles, isActive}: DateInputFieldProps) => (
    <>
        <FormattedText
            id={labelId}
            defaultMessage={labelDefault}
            style={styles.label}
        />
        <TouchableOpacity
            onPress={onPress}
            style={[styles.dateBox, isActive && styles.dateBoxActive]}
            testID={testID}
        >
            {date ? (
                <FormattedDate
                    value={date}
                    format={DATE_FORMAT}
                    style={styles.dateText}
                />
            ) : (
                <FormattedText
                    id={placeholderId}
                    defaultMessage={placeholderDefault}
                    style={styles.datePlaceholder}
                />
            )}
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
    const [showError, setShowError] = useState(false);

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
        setShowError(false);
        if (!since || !until || !dateIsValid) {
            setShowError(true);
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
                <FormattedText
                    id='agents.channel_summary.date_picker.title'
                    defaultMessage='Select date range'
                    style={styles.headerTitle}
                />
            </View>

            {/* Start Date */}
            <DateInputField
                labelId='agents.channel_summary.since'
                labelDefault='Start'
                date={since}
                placeholderId='agents.channel_summary.since_placeholder'
                placeholderDefault='Select date'
                onPress={openSincePicker}
                testID='agents.channel_summary.date_from'
                styles={styles}
                isActive={pickerTarget === 'since'}
            />

            {/* End Date */}
            <DateInputField
                labelId='agents.channel_summary.until'
                labelDefault='End'
                date={until}
                placeholderId='agents.channel_summary.until_placeholder'
                placeholderDefault='Select date'
                onPress={openUntilPicker}
                testID='agents.channel_summary.date_to'
                styles={styles}
                isActive={pickerTarget === 'until'}
            />

            {showError && (
                <FormattedText
                    id='agents.channel_summary.range_error'
                    defaultMessage='Select a valid date range'
                    style={styles.error}
                />
            )}

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
