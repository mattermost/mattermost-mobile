// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useNavigation} from 'expo-router';
import moment, {type Moment} from 'moment-timezone';
import React, {useCallback, useEffect, useRef, useState} from 'react';
import {useIntl} from 'react-intl';
import {Keyboard, SafeAreaView, StyleSheet, View} from 'react-native';

import {updateScheduledPost} from '@actions/remote/scheduled_post';
import DateTimeSelector from '@components/data_time_selector';
import Loading from '@components/loading';
import NavigationButton from '@components/navigation_button';
import {Screens} from '@constants';
import {MESSAGE_TYPE, SNACK_BAR_TYPE} from '@constants/snack_bar';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import {usePreventDoubleTap} from '@hooks/utils';
import {navigateBack} from '@screens/navigation';
import {logDebug} from '@utils/log';
import {showSnackBar} from '@utils/snack_bar';
import {getTimezone} from '@utils/user';

import type ScheduledPostModel from '@typings/database/models/servers/scheduled_post';

type Props = {
    currentUserTimezone?: UserTimezone | null;
    draft: ScheduledPostModel;
}

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
});

const RescheduledDraft: React.FC<Props> = ({
    currentUserTimezone,
    draft,
}) => {
    const navigation = useNavigation();
    const theme = useTheme();
    const intl = useIntl();
    const serverUrl = useServerUrl();
    const [canSave, setCanSave] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);
    const selectedTime = useRef<string | null>(null);
    const userTimezone = getTimezone(currentUserTimezone);

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

        const res = await updateScheduledPost(serverUrl, draft, parseInt(selectedTime.current, 10));
        handleUIUpdates(res);
    }, [draft, handleUIUpdates, intl, selectedTime, serverUrl]));

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

    const handleCustomTimeChange = useCallback((updatedSelectedTime: Moment) => {
        const newSelecteTime = updatedSelectedTime.valueOf().toString();
        selectedTime.current = newSelecteTime;
        setCanSave(parseInt(newSelecteTime, 10) !== draft.scheduledAt);
    }, [draft.scheduledAt]);

    if (isUpdating) {
        return (
            <View style={styles.loader}>
                <Loading color={theme.buttonBg}/>
            </View>
        );
    }

    return (
        <SafeAreaView
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
            </View>
        </SafeAreaView>
    );
};

export default RescheduledDraft;
