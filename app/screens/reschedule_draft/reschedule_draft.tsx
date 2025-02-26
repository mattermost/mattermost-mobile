// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useRef, useState} from 'react';
import {useIntl} from 'react-intl';
import {Keyboard, SafeAreaView, StyleSheet, View} from 'react-native';

import {updateScheduledPost} from '@actions/remote/scheduled_post';
import Loading from '@components/loading';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import DatabaseManager from '@database/manager';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import useNavButtonPressed from '@hooks/navigation_button_pressed';
import {usePreventDoubleTap} from '@hooks/utils';
import DateTimeSelector from '@screens/custom_status_clear_after/components/date_time_selector';
import PostError from '@screens/edit_post/post_error';
import {buildNavigationButton, dismissModal, setButtons} from '@screens/navigation';
import {logDebug} from '@utils/log';
import {changeOpacity} from '@utils/theme';
import {getTimezone} from '@utils/user';

import type ScheduledPostModel from '@typings/database/models/servers/scheduled_post';
import type {AvailableScreens} from '@typings/screens/navigation';
import type {Moment} from 'moment-timezone';

type Props = {
    currentUserTimezone?: UserTimezone | null;
    componentId: AvailableScreens;
    closeButtonId: string;
    draft: ScheduledPostModel;
}

const OPTIONS_PADDING = 12;

const styles = StyleSheet.create({
    body: {
        flex: 1,
    },
    container: {
        flex: 1,
    },
    loader: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    optionsContainer: {
        paddingTop: OPTIONS_PADDING,
    },
});

const RIGHT_BUTTON = buildNavigationButton('reschedule-draft', 'reschedule_draft.save.button');

const RescheduledDraft: React.FC<Props> = ({
    currentUserTimezone,
    componentId,
    closeButtonId,
    draft,
}) => {
    const theme = useTheme();
    const intl = useIntl();
    const serverUrl = useServerUrl();
    const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
    const mainView = useRef<View>(null);
    const [isUpdating, setIsUpdating] = useState(false);
    const [errorLine, setErrorLine] = useState<string | undefined>();
    const [errorExtra, setErrorExtra] = useState<string | undefined>();
    const selectedTime = useRef<string | null>(null);
    const userTimezone = getTimezone(currentUserTimezone);

    const toggleSaveButton = useCallback((enabled = false) => {
        setButtons(componentId, {
            rightButtons: [{
                ...RIGHT_BUTTON,
                color: theme.sidebarHeaderTextColor,
                disabledColor: changeOpacity(theme.sidebarHeaderTextColor, 0.32),
                text: intl.formatMessage({id: 'edit_post.save', defaultMessage: 'Save'}),
                enabled,
            }],
        });
    }, [componentId, intl, theme]);

    const onClose = useCallback(() => {
        Keyboard.dismiss();
        dismissModal({componentId});
    }, [componentId]);

    const handleUIUpdates = useCallback((res: {error?: unknown}) => {
        if (res.error) {
            setIsUpdating(false);
            const errorMessage = intl.formatMessage({id: 'mobile.scheduled_post.update.error', defaultMessage: 'There was a problem editing this message. Please try again.'});
            setErrorLine(errorMessage);
        } else {
            setIsUpdating(false);
            onClose();
        }
    }, [intl, onClose]);

    const onSavePostMessage = usePreventDoubleTap(useCallback(async () => {
        setIsUpdating(true);
        setErrorLine(undefined);
        setErrorExtra(undefined);
        toggleSaveButton(false);
        if (!selectedTime.current) {
            logDebug('ScheduledPostOptions', 'No time selected');
            setIsUpdating(false);
            const errorMessage = intl.formatMessage({id: 'mobile.scheduled_post.error', defaultMessage: 'No time selected'});
            setErrorLine(errorMessage);
            return;
        }
        const draftPayload = await draft.toApi(database);
        draftPayload.scheduled_at = parseInt(selectedTime.current, 10);

        const res = await updateScheduledPost(serverUrl, draftPayload);
        handleUIUpdates(res);
    }, [database, draft, handleUIUpdates, intl, selectedTime, serverUrl, toggleSaveButton]));

    // Initialize the save button as disabled when component mounts
    React.useEffect(() => {
        toggleSaveButton(false);
    }, [toggleSaveButton]);

    useNavButtonPressed(closeButtonId, componentId, onClose, []);
    useNavButtonPressed(RIGHT_BUTTON.id, componentId, onSavePostMessage, []);
    useAndroidHardwareBackHandler(componentId, onClose);

    const handleCustomTimeChange = useCallback((updatedSelectedTime: Moment) => {
        const newSelecteTime = updatedSelectedTime.valueOf().toString();
        selectedTime.current = newSelecteTime;
        toggleSaveButton(parseInt(newSelecteTime, 10) !== draft.scheduledAt);
    }, [draft.scheduledAt, toggleSaveButton]);

    if (isUpdating) {
        return (
            <View style={styles.loader}>
                <Loading color={theme.buttonBg}/>
            </View>
        );
    }

    return (
        <>
            <SafeAreaView
                testID='edit_post.screen'
                style={styles.container}
            >
                <View
                    style={styles.body}
                    ref={mainView}
                >
                    {Boolean((errorLine || errorExtra)) &&
                        <PostError
                            errorExtra={errorExtra}
                            errorLine={errorLine}
                        />
                    }
                    <View style={styles.optionsContainer}>
                        <DateTimeSelector
                            handleChange={handleCustomTimeChange}
                            theme={theme}
                            timezone={userTimezone}
                            showInitially='date'
                        />
                    </View>
                </View>
            </SafeAreaView>
        </>
    );
};

export default RescheduledDraft;
