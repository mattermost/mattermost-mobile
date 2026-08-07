// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useNavigation} from 'expo-router';
import moment, {type Moment} from 'moment-timezone';
import React, {useCallback, useEffect, useRef, useState} from 'react';
import {useIntl} from 'react-intl';
import {Keyboard, StyleSheet, View} from 'react-native';
import {SafeAreaView, type Edge} from 'react-native-safe-area-context';

import {updateScheduledPost, type UpdateSchedulingInfo} from '@actions/remote/scheduled_post';
import DateTimeSelector from '@components/date_time_selector';
import Loading from '@components/loading';
import NavigationButton from '@components/navigation_button';
import {Screens} from '@constants';
import {MESSAGE_TYPE, SNACK_BAR_TYPE} from '@constants/snack_bar';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import {usePreventDoubleTap} from '@hooks/utils';
import {navigateBack} from '@screens/navigation';
import PickerOption from '@screens/post_priority_picker/components/picker_option';
import {logDebug} from '@utils/log';
import {getScheduledPostRecurrence, isRecurringScheduledPost, repeatWeeklyLabel} from '@utils/scheduled_post';
import {showSnackBar} from '@utils/snack_bar';
import {getTimezone} from '@utils/user';

import type ScheduledPostModel from '@typings/database/models/servers/scheduled_post';

type Props = {
    currentUserTimezone?: UserTimezone | null;
    draft: ScheduledPostModel;
    isRecurringEnabled: boolean;
}

const safeAreaEdges: Edge[] = ['bottom', 'left', 'right'];

const TOGGLE_OPTION_MARGIN_TOP = 16;

// Matches the horizontal gutter DateTimeSelector gives its own rows so the toggle lines up with them.
const TOGGLE_OPTION_HORIZONTAL_PADDING = 15;

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    loader: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    optionsContainer: {
        paddingTop: 12,
    },
    toggleOptionContainer: {
        marginTop: TOGGLE_OPTION_MARGIN_TOP,
        paddingHorizontal: TOGGLE_OPTION_HORIZONTAL_PADDING,
    },
});

const RescheduledDraft: React.FC<Props> = ({
    currentUserTimezone,
    draft,
    isRecurringEnabled,
}) => {
    const navigation = useNavigation();
    const theme = useTheme();
    const intl = useIntl();
    const serverUrl = useServerUrl();
    const [canSave, setCanSave] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);
    const selectedTime = useRef<string | null>(null);
    const userTimezone = getTimezone(currentUserTimezone);
    const wasRepeatingWeekly = isRecurringScheduledPost(draft);
    const [repeatWeekly, setRepeatWeekly] = useState(wasRepeatingWeekly);

    const onClose = useCallback(() => {
        Keyboard.dismiss();
        navigateBack();
    }, []);

    const handleUIUpdates = useCallback((res: {error?: unknown}) => {
        if (res.error) {
            setIsUpdating(false);
            const errorMessage = intl.formatMessage({id: 'mobile.scheduled_post.update.error', defaultMessage: 'There was a problem editing this message. Please try again.'});
            showSnackBar({
                barType: SNACK_BAR_TYPE.RESCHEDULED_POST,
                customMessage: errorMessage,
                type: MESSAGE_TYPE.ERROR,
            });
        } else {
            onClose();
        }
    }, [intl, onClose]);

    const onSavePostMessage = usePreventDoubleTap(useCallback(async () => {
        setIsUpdating(true);
        setCanSave(false);
        if (!selectedTime.current) {
            logDebug('ScheduledPostOptions', 'No time selected');
            setIsUpdating(false);
            const errorMessage = intl.formatMessage({id: 'mobile.scheduled_post.error', defaultMessage: 'No time selected'});
            showSnackBar({
                barType: SNACK_BAR_TYPE.RESCHEDULED_POST,
                customMessage: errorMessage,
                type: MESSAGE_TYPE.ERROR,
            });
            return;
        }

        // Omitting the recurrence preserves whatever the post already has, which is what a server too
        // old to understand it needs.
        let schedulingInfo: UpdateSchedulingInfo = {scheduled_at: parseInt(selectedTime.current, 10)};
        if (isRecurringEnabled) {
            schedulingInfo = {...schedulingInfo, ...getScheduledPostRecurrence(repeatWeekly, currentUserTimezone)};
        }

        const res = await updateScheduledPost(serverUrl, draft, schedulingInfo);
        handleUIUpdates(res);
    }, [currentUserTimezone, draft, handleUIUpdates, intl, isRecurringEnabled, repeatWeekly, selectedTime, serverUrl]));

    useEffect(() => {
        navigation.setOptions({
            headerRight: () => (
                <NavigationButton
                    disabled={!canSave}
                    onPress={onSavePostMessage}
                    testID='reschedule_draft.save.button'
                    text={intl.formatMessage({id: 'edit_post.save', defaultMessage: 'Save'})}
                />
            ),
        });
    }, [canSave, intl, navigation, onSavePostMessage, theme.sidebarHeaderTextColor]);

    useAndroidHardwareBackHandler(Screens.RESCHEDULE_DRAFT, onClose);

    const updateCanSave = useCallback((time: string, weekly: boolean) => {
        setCanSave(parseInt(time, 10) !== draft.scheduledAt || weekly !== wasRepeatingWeekly);
    }, [draft.scheduledAt, wasRepeatingWeekly]);

    const handleCustomTimeChange = useCallback((updatedSelectedTime: Moment) => {
        const newSelecteTime = updatedSelectedTime.valueOf().toString();
        selectedTime.current = newSelecteTime;
        updateCanSave(newSelecteTime, repeatWeekly);
    }, [repeatWeekly, updateCanSave]);

    const onToggleRepeatWeekly = useCallback((value: boolean) => {
        setRepeatWeekly(value);

        // Changing only the recurrence leaves the time picker untouched, so keep the post's own time.
        const time = selectedTime.current ?? draft.scheduledAt.toString();
        selectedTime.current = time;
        updateCanSave(time, value);
    }, [draft.scheduledAt, updateCanSave]);

    if (isUpdating) {
        return (
            <View style={styles.loader}>
                <Loading color={theme.buttonBg}/>
            </View>
        );
    }

    return (
        <SafeAreaView
            edges={safeAreaEdges}
            testID='edit_post.screen'
            style={styles.container}
        >
            <View style={styles.optionsContainer}>
                <DateTimeSelector
                    handleChange={handleCustomTimeChange}
                    theme={theme}
                    timezone={userTimezone}
                    showInitially='date'
                    initialDate={moment(draft.scheduledAt)}
                />
                {isRecurringEnabled && (
                    <View style={styles.toggleOptionContainer}>
                        <PickerOption
                            action={onToggleRepeatWeekly}
                            label={intl.formatMessage(repeatWeeklyLabel)}
                            selected={repeatWeekly}
                            testID='reschedule_draft.repeat_weekly'
                            type='toggle'
                            value='repeat_weekly'
                        />
                    </View>
                )}
            </View>
        </SafeAreaView>
    );
};

export default RescheduledDraft;
