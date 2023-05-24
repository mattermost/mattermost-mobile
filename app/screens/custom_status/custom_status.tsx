// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import moment from 'moment-timezone';
import React, {useCallback, useEffect, useMemo, useReducer} from 'react';
import {useIntl} from 'react-intl';
import {DeviceEventEmitter, Keyboard, KeyboardAvoidingView, Platform, ScrollView, View} from 'react-native';
import {type Edge, SafeAreaView} from 'react-native-safe-area-context';

import {updateLocalCustomStatus} from '@actions/local/user';
import {removeRecentCustomStatus, updateCustomStatus, unsetCustomStatus} from '@actions/remote/user';
import TabletTitle from '@components/tablet_title';
import {Events, Screens} from '@constants';
import {CustomStatusDurationEnum, SET_CUSTOM_STATUS_FAILURE} from '@constants/custom_status';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import {useIsTablet} from '@hooks/device';
import useNavButtonPressed from '@hooks/navigation_button_pressed';
import {dismissModal, goToScreen, openAsBottomSheet, showModal} from '@screens/navigation';
import {getCurrentMomentForTimezone, getRoundedTime} from '@utils/helpers';
import {logDebug} from '@utils/log';
import {mergeNavigationOptions} from '@utils/navigation';
import {preventDoubleTap} from '@utils/tap';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {
    getTimezone,
    getUserCustomStatus,
    isCustomStatusExpired as verifyExpiredStatus,
} from '@utils/user';

import ClearAfter from './components/clear_after';
import CustomStatusInput from './components/custom_status_input';
import CustomStatusSuggestions from './components/custom_status_suggestions';
import RecentCustomStatuses from './components/recent_custom_statuses';

import type UserModel from '@typings/database/models/servers/user';
import type {AvailableScreens} from '@typings/screens/navigation';

type NewStatusType = {
    emoji?: string;
    text?: string;
    duration: CustomStatusDuration;
    expiresAt: moment.Moment;
}

type Props = {
    customStatusExpirySupported: boolean;
    currentUser?: UserModel;
    recentCustomStatuses: UserCustomStatus[];
    componentId: AvailableScreens;
}

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        container: {
            flex: 1,
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.03),
        },
        contentContainerStyle: {
            height: '99%',
        },
        scrollView: {
            flex: 1,
            paddingTop: 32,
        },
        separator: {
            marginTop: 32,
        },
        block: {
            borderBottomColor: changeOpacity(theme.centerChannelColor, 0.1),
            borderBottomWidth: 1,
            borderTopColor: changeOpacity(theme.centerChannelColor, 0.1),
            borderTopWidth: 1,
        },
    };
});

const DEFAULT_DURATION: CustomStatusDuration = 'today';
const BTN_UPDATE_STATUS = 'update-custom-status';
const edges: Edge[] = ['bottom', 'left', 'right'];

const calculateExpiryTime = (duration: CustomStatusDuration, currentUser: UserModel | undefined, expiresAt: moment.Moment): string => {
    const userTimezone = getTimezone(currentUser?.timezone);
    const currentTime = getCurrentMomentForTimezone(userTimezone);

    switch (duration) {
        case 'thirty_minutes':
            return currentTime.add(30, 'minutes').seconds(0).milliseconds(0).toISOString();
        case 'one_hour':
            return currentTime.add(1, 'hour').seconds(0).milliseconds(0).toISOString();
        case 'four_hours':
            return currentTime.add(4, 'hours').seconds(0).milliseconds(0).toISOString();
        case 'today':
            return currentTime.endOf('day').toISOString();
        case 'this_week':
            return currentTime.endOf('week').toISOString();
        case 'date_and_time':
            return expiresAt.toISOString();
        case CustomStatusDurationEnum.DONT_CLEAR:
        default:
            return '';
    }
};

function reducer(state: NewStatusType, action: {
    type: 'clear' | 'fromUserCustomStatus' | 'fromUserCustomStatusIgnoringExpire' | 'text' | 'emoji' | 'duration';
    status?: UserCustomStatus;
    value?: string;
    duration?: CustomStatusDuration;
    expiresAt?: string;
}): NewStatusType {
    switch (action.type) {
        case 'clear':
            return {emoji: '', text: '', duration: DEFAULT_DURATION, expiresAt: state.expiresAt};
        case 'fromUserCustomStatus': {
            const status = action.status;
            if (status) {
                return {emoji: status.emoji, text: status.text, duration: status.duration!, expiresAt: moment(status.expires_at)};
            }
            return state;
        }
        case 'fromUserCustomStatusIgnoringExpire': {
            const status = action.status;
            if (status) {
                return {emoji: status.emoji, text: status.text, duration: status.duration!, expiresAt: state.expiresAt};
            }
            return state;
        }
        case 'text':
            return {...state, text: action.value};
        case 'emoji':
            return {...state, emoji: action.value};
        case 'duration':
            if (action.duration != null) {
                return {
                    ...state,
                    duration: action.duration,
                    expiresAt: action.duration === 'date_and_time' && action.expiresAt ? moment(action.expiresAt) : state.expiresAt,
                };
            }
            return state;
        default:
            return state;
    }
}

const CustomStatus = ({
    customStatusExpirySupported,
    currentUser,
    recentCustomStatuses,
    componentId,
}: Props) => {
    const intl = useIntl();
    const isTablet = useIsTablet();
    const theme = useTheme();
    const style = getStyleSheet(theme);
    const serverUrl = useServerUrl();

    const storedStatus = useMemo(() => {
        return getUserCustomStatus(currentUser);
    }, [currentUser]);

    const initialStatus = useMemo(() => {
        const userTimezone = getTimezone(currentUser?.timezone);

        // May be a ref
        const isCustomStatusExpired = verifyExpiredStatus(currentUser);

        const currentTime = getCurrentMomentForTimezone(userTimezone ?? '');

        let initialCustomExpiryTime = getRoundedTime(currentTime);
        const isCurrentCustomStatusSet = !isCustomStatusExpired && (storedStatus?.text || storedStatus?.emoji);
        if (isCurrentCustomStatusSet && storedStatus?.duration === 'date_and_time' && storedStatus?.expires_at) {
            initialCustomExpiryTime = moment(storedStatus?.expires_at);
        }

        return {
            duration: isCurrentCustomStatusSet ? storedStatus?.duration ?? CustomStatusDurationEnum.DONT_CLEAR : DEFAULT_DURATION,
            emoji: isCurrentCustomStatusSet ? storedStatus?.emoji : '',
            expiresAt: initialCustomExpiryTime,
            text: isCurrentCustomStatusSet ? storedStatus?.text : '',
        };
    }, []);

    const [newStatus, dispatchStatus] = useReducer(reducer, initialStatus);

    const isStatusSet = Boolean(newStatus.emoji || newStatus.text);

    const handleClear = useCallback(() => {
        dispatchStatus({type: 'clear'});
    }, []);

    const handleTextChange = useCallback((value: string) => {
        dispatchStatus({type: 'text', value});
    }, []);

    const handleEmojiClick = useCallback((value: string) => {
        dispatchStatus({type: 'emoji', value});
    }, []);

    const handleClearAfterClick = useCallback((duration: CustomStatusDuration, expiresAt: string) => {
        dispatchStatus({type: 'duration', duration, expiresAt});
    }, []);

    const handleRecentCustomStatusClear = useCallback((status: UserCustomStatus) => removeRecentCustomStatus(serverUrl, status), [serverUrl]);

    const handleCustomStatusSuggestionClick = useCallback((status: UserCustomStatus) => {
        if (!status.duration) {
            // This should never happen, but we add a safeguard here
            logDebug('clicked on a custom status with no duration');
            return;
        }
        dispatchStatus({type: 'fromUserCustomStatusIgnoringExpire', status});
    }, []);

    const openClearAfterModal = useCallback(() => {
        const screen = Screens.CUSTOM_STATUS_CLEAR_AFTER;
        const title = intl.formatMessage({id: 'mobile.custom_status.clear_after.title', defaultMessage: 'Clear Custom Status After'});
        const passProps = {
            handleClearAfterClick,
            initialDuration: newStatus.duration,
            intl,
            theme,
        };

        if (isTablet) {
            showModal(screen, title, passProps);
        } else {
            goToScreen(screen, title, passProps);
        }
    }, [intl, theme, isTablet, newStatus.duration, handleClearAfterClick]);

    const handleRecentCustomStatusSuggestionClick = useCallback((status: UserCustomStatus) => {
        dispatchStatus({type: 'fromUserCustomStatusIgnoringExpire', status: {...status, duration: status.duration || CustomStatusDurationEnum.DONT_CLEAR}});
        if (status.duration === 'date_and_time') {
            openClearAfterModal();
        }
    }, [openClearAfterModal]);

    const handleSetStatus = useCallback(async () => {
        if (!currentUser) {
            return;
        }

        if (isStatusSet) {
            let isStatusSame =
                storedStatus?.emoji === newStatus.emoji &&
                storedStatus?.text === newStatus.text &&
                storedStatus?.duration === newStatus.duration;
            const newExpiresAt = calculateExpiryTime(newStatus.duration!, currentUser, newStatus.expiresAt);
            if (isStatusSame && newStatus.duration === 'date_and_time') {
                isStatusSame = storedStatus?.expires_at === newExpiresAt;
            }

            if (!isStatusSame) {
                const status: UserCustomStatus = {
                    emoji: newStatus.emoji || 'speech_balloon',
                    text: newStatus.text?.trim(),
                    duration: CustomStatusDurationEnum.DONT_CLEAR,
                };

                if (customStatusExpirySupported) {
                    status.duration = newStatus.duration;
                    status.expires_at = newExpiresAt;
                }
                const {error} = await updateCustomStatus(serverUrl, status);
                if (error) {
                    DeviceEventEmitter.emit(SET_CUSTOM_STATUS_FAILURE);
                    return;
                }

                updateLocalCustomStatus(serverUrl, currentUser, status);
                dispatchStatus({type: 'fromUserCustomStatus', status});
            }
        } else if (storedStatus?.emoji) {
            const {error} = await unsetCustomStatus(serverUrl);

            if (!error) {
                updateLocalCustomStatus(serverUrl, currentUser, undefined);
            }
        }
        Keyboard.dismiss();
        if (isTablet) {
            DeviceEventEmitter.emit(Events.ACCOUNT_SELECT_TABLET_VIEW, '');
        } else {
            dismissModal();
        }
    }, [newStatus, isStatusSet, storedStatus, currentUser]);

    const openEmojiPicker = useCallback(preventDoubleTap(() => {
        openAsBottomSheet({
            closeButtonId: 'close-emoji-picker',
            screen: Screens.EMOJI_PICKER,
            theme,
            title: intl.formatMessage({id: 'mobile.custom_status.choose_emoji', defaultMessage: 'Choose an emoji'}),
            props: {onEmojiPress: handleEmojiClick},
        });
    }), [theme, intl, handleEmojiClick]);

    const handleBackButton = useCallback(() => {
        if (isTablet) {
            DeviceEventEmitter.emit(Events.ACCOUNT_SELECT_TABLET_VIEW, '');
        } else {
            dismissModal({componentId});
        }
    }, [isTablet]);

    useAndroidHardwareBackHandler(componentId, handleBackButton);
    useNavButtonPressed(BTN_UPDATE_STATUS, componentId, handleSetStatus, [handleSetStatus]);

    useEffect(() => {
        mergeNavigationOptions(componentId, {
            topBar: {
                rightButtons: [
                    {
                        enabled: true,
                        id: BTN_UPDATE_STATUS,
                        showAsAction: 'always',
                        testID: 'custom_status.done.button',
                        text: intl.formatMessage({id: 'mobile.custom_status.modal_confirm', defaultMessage: 'Done'}),
                        color: theme.sidebarHeaderTextColor,
                    },
                ],
            },
        });
    }, []);

    return (
        <>
            {isTablet &&
                <TabletTitle
                    action={intl.formatMessage({id: 'mobile.custom_status.modal_confirm', defaultMessage: 'Done'})}
                    onPress={handleSetStatus}
                    testID='custom_status'
                    title={intl.formatMessage({id: 'mobile.routes.custom_status', defaultMessage: 'Set a custom status'})}
                />
            }
            <SafeAreaView
                edges={edges}
                style={style.container}
                testID='custom_status.screen'
            >
                <KeyboardAvoidingView
                    behavior='padding'
                    enabled={Platform.OS === 'ios'}
                    keyboardVerticalOffset={100}
                    contentContainerStyle={style.contentContainerStyle}
                >
                    <ScrollView
                        bounces={false}
                        keyboardDismissMode='none'
                        keyboardShouldPersistTaps='always'
                        testID='custom_status.scroll_view'
                    >
                        <View style={style.scrollView}>
                            <View style={style.block}>
                                <CustomStatusInput
                                    emoji={newStatus.emoji}
                                    isStatusSet={isStatusSet}
                                    onChangeText={handleTextChange}
                                    onClearHandle={handleClear}
                                    onOpenEmojiPicker={openEmojiPicker}
                                    text={newStatus.text}
                                    theme={theme}
                                />
                                {isStatusSet && customStatusExpirySupported && (
                                    <ClearAfter
                                        duration={newStatus.duration}
                                        expiresAt={newStatus.expiresAt}
                                        onOpenClearAfterModal={openClearAfterModal}
                                        theme={theme}
                                    />
                                )}
                            </View>
                            {recentCustomStatuses.length > 0 && (
                                <RecentCustomStatuses
                                    onHandleClear={handleRecentCustomStatusClear}
                                    onHandleSuggestionClick={handleRecentCustomStatusSuggestionClick}
                                    recentCustomStatuses={recentCustomStatuses}
                                    theme={theme}
                                />
                            )
                            }
                            <CustomStatusSuggestions
                                intl={intl}
                                onHandleCustomStatusSuggestionClick={handleCustomStatusSuggestionClick}
                                recentCustomStatuses={recentCustomStatuses}
                                theme={theme}
                            />
                        </View>
                        <View style={style.separator}/>
                    </ScrollView>
                </KeyboardAvoidingView>
            </SafeAreaView>
        </>
    );
};

export default CustomStatus;
