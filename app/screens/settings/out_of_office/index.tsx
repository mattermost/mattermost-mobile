// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import DateTimePicker, {DateTimePickerAndroid, type DateTimePickerChangeEvent} from '@react-native-community/datetimepicker';
import React, {useCallback, useEffect, useState} from 'react';
import {defineMessages, useIntl} from 'react-intl';
import {Platform, Text, View} from 'react-native';

import Button from '@components/button';
import FormattedText from '@components/formatted_text';
import SettingContainer from '@components/settings/container';
import SettingOption from '@components/settings/option';
import {Screens} from '@constants';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import {usePreventDoubleTap} from '@hooks/utils';
import {navigateBack} from '@screens/navigation';
import {getOutOfOfficeSettings, saveOutOfOfficeSettings, type WeeklyOutOfOfficeSettings} from '@utils/out_of_office';
import {makeStyleSheetFromTheme} from '@utils/theme';
import {getDeviceTimezone} from '@utils/timezone';
import {typography} from '@utils/typography';

const messages = defineMessages({
    enable: {id: 'out_of_office.enable', defaultMessage: 'Enable out of office'},
    description: {id: 'out_of_office.description', defaultMessage: 'Pause notifications on this device for this server during quiet hours and days off every week. This schedule repeats until you turn it off. Exceptions only allow notifications already enabled in your notification settings. On iOS, silent notifications may still appear and a call may briefly appear on screen. Mention exceptions require server support.'},
    quietHours: {id: 'out_of_office.quiet_hours', defaultMessage: 'Daily quiet hours'},
    start: {id: 'out_of_office.start', defaultMessage: 'Starts'},
    end: {id: 'out_of_office.end', defaultMessage: 'Ends'},
    daysOff: {id: 'out_of_office.days_off', defaultMessage: 'Days off'},
    daysOffDescription: {id: 'out_of_office.days_off_description', defaultMessage: 'Pause notifications all day on the selected days.'},
    timezone: {id: 'out_of_office.timezone', defaultMessage: 'Times follow your device’s local timezone, including when you travel. Quiet hours can continue overnight.'},
    legacy: {id: 'out_of_office.replace_date_schedule', defaultMessage: 'You have a previous date-based out of office schedule. Saving here replaces it with this recurring weekly schedule. Your previous schedule stays in effect until you save.'},
    calls: {id: 'out_of_office.allow_calls', defaultMessage: 'Allow calls during out of office'},
    mentions: {id: 'out_of_office.allow_mentions', defaultMessage: 'Allow mentions during out of office'},
    invalid: {id: 'out_of_office.invalid_hours', defaultMessage: 'Choose different start and end times for quiet hours.'},
    empty: {id: 'out_of_office.empty_schedule', defaultMessage: 'Enable daily quiet hours or select at least one day off.'},
    loadError: {id: 'out_of_office.load_error', defaultMessage: 'Unable to load your out of office settings. Go back and try again.'},
    saveError: {id: 'out_of_office.save_error', defaultMessage: 'Unable to save your out of office settings. Please try again.'},
});

const WEEKDAYS = [0, 1, 2, 3, 4, 5, 6];

function getDefaultSettings(): WeeklyOutOfOfficeSettings {
    return {schedule: 'weekly', enabled: false, quietHoursEnabled: true, startMinute: 18 * 60, endMinute: 9 * 60, daysOff: [], allowCalls: false, allowMentions: false};
}

function timeFromMinutes(minutes: number) {
    return new Date(2024, 0, 15, Math.floor(minutes / 60), minutes % 60, 0, 0);
}

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {gap: 16, paddingBottom: 24},
    text: {color: theme.centerChannelColor, ...typography('Body', 100, 'Regular')},
    label: {color: theme.centerChannelColor, ...typography('Body', 200, 'SemiBold')},
    error: {color: theme.errorTextColor, ...typography('Body', 100, 'Regular')},
}));

export default function OutOfOffice() {
    const intl = useIntl();
    const serverUrl = useServerUrl();
    const theme = useTheme();
    const styles = getStyleSheet(theme);
    const [settings, setSettings] = useState<WeeklyOutOfOfficeSettings>(getDefaultSettings);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<'loadError' | 'saveError' | 'invalid' | 'empty'>();
    const [loadFailed, setLoadFailed] = useState(false);
    const [legacy, setLegacy] = useState(false);
    const [editingTime, setEditingTime] = useState<'startMinute' | 'endMinute'>();

    useEffect(() => {
        let active = true;
        setLoading(true);
        setSettings(getDefaultSettings());
        setLoadFailed(false);
        setLegacy(false);
        setEditingTime(undefined);
        setError(undefined);
        getOutOfOfficeSettings(serverUrl).then((saved) => {
            if (active && saved) {
                if (saved.schedule === 'weekly') {
                    setSettings(saved);
                } else {
                    setLegacy(true);
                    setSettings({...getDefaultSettings(), allowCalls: saved.allowCalls, allowMentions: saved.allowMentions});
                }
            }
        }).catch(() => {
            if (active) {
                setLoadFailed(true);
                setError('loadError');
            }
        }).finally(() => {
            if (active) {
                setLoading(false);
            }
        });
        return () => {
            active = false;
        };
    }, [serverUrl]);

    useAndroidHardwareBackHandler(Screens.SETTINGS_OUT_OF_OFFICE, navigateBack);

    const setEnabled = useCallback((enabled: boolean) => setSettings((previous) => ({...previous, enabled})), []);
    const setQuietHours = useCallback((quietHoursEnabled: boolean) => setSettings((previous) => ({...previous, quietHoursEnabled})), []);
    const setAllowCalls = useCallback((allowCalls: boolean) => setSettings((previous) => ({...previous, allowCalls})), []);
    const setAllowMentions = useCallback((allowMentions: boolean) => setSettings((previous) => ({...previous, allowMentions})), []);
    const updateTime = useCallback((field: 'startMinute' | 'endMinute', date: Date) => {
        const minute = (date.getHours() * 60) + date.getMinutes();
        setSettings((previous) => ({...previous, [field]: minute}));
    }, []);

    const openTime = useCallback((field: 'startMinute' | 'endMinute') => {
        if (Platform.OS === 'android') {
            DateTimePickerAndroid.open({
                mode: 'time',
                value: timeFromMinutes(field === 'startMinute' ? settings.startMinute : settings.endMinute),
                timeZoneName: getDeviceTimezone(),
                onValueChange: (_event, date) => updateTime(field, date),
            });
        } else {
            setEditingTime(field);
        }
    }, [settings.startMinute, settings.endMinute, updateTime]);

    const openStart = useCallback(() => openTime('startMinute'), [openTime]);
    const openEnd = useCallback(() => openTime('endMinute'), [openTime]);
    const dismissTime = useCallback(() => setEditingTime(undefined), []);
    const setTime = useCallback((_event: DateTimePickerChangeEvent, date: Date) => {
        if (editingTime) {
            updateTime(editingTime, date);
        }
    }, [editingTime, updateTime]);

    const setDayOff = (day: number, selected: string | boolean) => {
        const otherDays = settings.daysOff.filter((value) => value !== day);
        setSettings({...settings, daysOff: selected ? [...otherDays, day].sort() : otherDays});
    };

    const save = useCallback(async () => {
        if (loading || saving || loadFailed) {
            return;
        }
        if (settings.enabled && settings.quietHoursEnabled && settings.startMinute === settings.endMinute) {
            setError('invalid');
            return;
        }
        if (settings.enabled && !settings.quietHoursEnabled && settings.daysOff.length === 0) {
            setError('empty');
            return;
        }
        setSaving(true);
        setError(undefined);
        try {
            await saveOutOfOfficeSettings(serverUrl, settings);
            navigateBack();
        } catch {
            setError('saveError');
        } finally {
            setSaving(false);
        }
    }, [loading, saving, loadFailed, settings, serverUrl]);

    const onSave = usePreventDoubleTap(save);

    return (
        <SettingContainer testID='out_of_office_settings'>
            <View style={styles.container}>
                <FormattedText
                    id={messages.description.id}
                    defaultMessage={messages.description.defaultMessage}
                    style={styles.text}
                />
                {legacy && (
                    <FormattedText
                        id={messages.legacy.id}
                        defaultMessage={messages.legacy.defaultMessage}
                        style={styles.text}
                        testID='out_of_office_settings.legacy'
                    />
                )}
                {!loading && !loadFailed && !saving && (
                    <>
                        <SettingOption
                            type='toggle'
                            label={intl.formatMessage(messages.enable)}
                            selected={settings.enabled}
                            action={setEnabled}
                            testID='out_of_office_settings.enable'
                        />
                        {settings.enabled && (
                            <>
                                <FormattedText
                                    id={messages.timezone.id}
                                    defaultMessage={messages.timezone.defaultMessage}
                                    style={styles.text}
                                />
                                <SettingOption
                                    type='toggle'
                                    label={intl.formatMessage(messages.quietHours)}
                                    selected={settings.quietHoursEnabled}
                                    action={setQuietHours}
                                    testID='out_of_office_settings.quiet_hours'
                                />
                                {settings.quietHoursEnabled && (
                                    <>
                                        <Button
                                            theme={theme}
                                            text={`${intl.formatMessage(messages.start)}: ${intl.formatTime(new Date(Date.UTC(2024, 0, 15, 0, settings.startMinute)), {timeZone: 'UTC'})}`}
                                            onPress={openStart}
                                            testID='out_of_office_settings.start'
                                        />
                                        <Button
                                            theme={theme}
                                            text={`${intl.formatMessage(messages.end)}: ${intl.formatTime(new Date(Date.UTC(2024, 0, 15, 0, settings.endMinute)), {timeZone: 'UTC'})}`}
                                            onPress={openEnd}
                                            testID='out_of_office_settings.end'
                                        />
                                        {Platform.OS === 'ios' && editingTime && (
                                            <DateTimePicker
                                                mode='time'
                                                value={timeFromMinutes(settings[editingTime])}
                                                onValueChange={setTime}
                                                onDismiss={dismissTime}
                                                display='spinner'
                                                timeZoneName={getDeviceTimezone()}
                                                textColor={theme.centerChannelColor}
                                                testID='out_of_office_settings.time_picker'
                                            />
                                        )}
                                    </>
                                )}
                                <FormattedText
                                    id={messages.daysOff.id}
                                    defaultMessage={messages.daysOff.defaultMessage}
                                    style={styles.label}
                                />
                                <FormattedText
                                    id={messages.daysOffDescription.id}
                                    defaultMessage={messages.daysOffDescription.defaultMessage}
                                    style={styles.text}
                                />
                                {WEEKDAYS.map((day) => (
                                    <SettingOption
                                        key={day}
                                        type='toggle'
                                        label={intl.formatDate(new Date(Date.UTC(2024, 0, 7 + day)), {weekday: 'long', timeZone: 'UTC'})}
                                        selected={settings.daysOff.includes(day)}
                                        action={(selected: boolean) => setDayOff(day, selected)}
                                        testID={`out_of_office_settings.day.${day}`}
                                    />
                                ))}
                                <SettingOption
                                    type='toggle'
                                    label={intl.formatMessage(messages.calls)}
                                    selected={settings.allowCalls}
                                    action={setAllowCalls}
                                    testID='out_of_office_settings.allow_calls'
                                />
                                <SettingOption
                                    type='toggle'
                                    label={intl.formatMessage(messages.mentions)}
                                    selected={settings.allowMentions}
                                    action={setAllowMentions}
                                    testID='out_of_office_settings.allow_mentions'
                                />
                            </>
                        )}
                    </>
                )}
                {error && (
                    <Text
                        accessibilityRole='alert'
                        style={styles.error}
                        testID='out_of_office_settings.error'
                    >
                        {intl.formatMessage(messages[error])}
                    </Text>
                )}
                <Button
                    theme={theme}
                    text={intl.formatMessage({id: 'settings.save', defaultMessage: 'Save'})}
                    onPress={onSave}
                    disabled={loading || saving || loadFailed}
                    showLoader={loading || saving}
                    testID='out_of_office_settings.save'
                />
            </View>
        </SettingContainer>
    );
}
