// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useMemo, useState} from 'react';
import {defineMessages, useIntl} from 'react-intl';
import InCallManager from 'react-native-incall-manager';

import {updateMe} from '@actions/remote/user';
import SettingBlock from '@components/settings/block';
import SettingContainer from '@components/settings/container';
import SettingOption from '@components/settings/option';
import SettingSeparator from '@components/settings/separator';
import {Calls} from '@constants';
import {Ringtone} from '@constants/calls';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import useBackNavigation from '@hooks/navigate_back';
import {popTopScreen} from '@screens/navigation';
import {changeOpacity} from '@utils/theme';
import {getNotificationProps} from '@utils/user';

import type UserModel from '@typings/database/models/servers/user';
import type {AvailableScreens} from '@typings/screens/navigation';

type Props = {
    componentId: AvailableScreens;
    currentUser?: UserModel;
};

const {footerText} = defineMessages({
    footerText: {
        id: 'notification_settings.calls.callsInfo',
        defaultMessage: 'Note: silent mode must be off to hear the ringtone preview.',
    },
});

const NotificationCall = ({componentId, currentUser}: Props) => {
    const serverUrl = useServerUrl();
    const intl = useIntl();
    const theme = useTheme();

    const notifyProps = useMemo(() => getNotificationProps(currentUser), [currentUser?.notifyProps]);

    const [callsMobileSound, setCallsMobileSound] = useState(() => Boolean(notifyProps?.calls_mobile_sound ? notifyProps.calls_mobile_sound === 'true' : notifyProps?.calls_desktop_sound === 'true'));
    const [callsMobileNotificationSound, setCallsMobileNotificationSound] = useState(() => {
        let initialSound = notifyProps?.calls_mobile_notification_sound ? notifyProps.calls_mobile_notification_sound : notifyProps?.calls_notification_sound;
        if (!initialSound) {
            initialSound = Calls.RINGTONE_DEFAULT;
        }
        return initialSound;
    });
    const [playingRingtone, setPlayingRingtone] = useState(false);

    const close = useCallback(() => {
        InCallManager.stopRingtone();
        popTopScreen(componentId);
    }, [componentId]);

    const selectOption = useCallback(async (value: string) => {
        const tone = 'calls_' + value.toLowerCase();

        if (value !== callsMobileNotificationSound) {
            setCallsMobileNotificationSound(value);

            await InCallManager.stopRingtone();
            await InCallManager.startRingtone(tone, Calls.RINGTONE_VIBRATE_PATTERN);
            setPlayingRingtone(true);
            return;
        }

        if (playingRingtone) {
            await InCallManager.stopRingtone();
            setPlayingRingtone(false);
        } else {
            await InCallManager.startRingtone(tone, Calls.RINGTONE_VIBRATE_PATTERN);
            setPlayingRingtone(true);
        }
    }, [callsMobileNotificationSound, playingRingtone]);

    const selectNotificationOnOff = useCallback(async (on: boolean) => {
        setCallsMobileSound(on);
        if (!on) {
            await InCallManager.stopRingtone();
        }
    }, []);

    const canSaveSettings = useCallback(() => {
        const cmsString = callsMobileSound ? 'true' : 'false';
        const cms = cmsString !== notifyProps.calls_mobile_sound;
        const cmns = callsMobileNotificationSound !== notifyProps.calls_mobile_notification_sound;
        return cms || cmns;
    }, [notifyProps, callsMobileSound, callsMobileNotificationSound]);

    const saveNotificationSettings = useCallback(() => {
        const canSave = canSaveSettings();
        if (canSave) {
            const cmsString = callsMobileSound ? 'true' : 'false';
            const notify_props: UserNotifyProps = {
                ...notifyProps,
                calls_mobile_sound: cmsString,
                calls_mobile_notification_sound: callsMobileNotificationSound,
            };
            updateMe(serverUrl, {notify_props});
        }
        close();
    }, [serverUrl, canSaveSettings, close, notifyProps, callsMobileSound, callsMobileNotificationSound]);

    useBackNavigation(saveNotificationSettings);

    useAndroidHardwareBackHandler(componentId, saveNotificationSettings);

    return (
        <SettingContainer testID='call_notification_settings'>
            <SettingOption
                label={intl.formatMessage({
                    id: 'notification_settings.calls.enable_sound',
                    defaultMessage: 'Notification sound for incoming calls',
                })}
                action={selectNotificationOnOff}
                testID='notification_settings.calls.enable_sound.option'
                type='toggle'
                selected={callsMobileSound}
            />
            {callsMobileSound && (
                <SettingBlock footerText={footerText}>
                    <SettingOption
                        action={selectOption}
                        label={intl.formatMessage({
                            id: 'notification_settings.calls.dynamic',
                            defaultMessage: 'Dynamic',
                        })}
                        selected={callsMobileNotificationSound === Ringtone.Dynamic}
                        testID='notification_settings.calls.dynamic.option'
                        type='select'
                        value={Ringtone.Dynamic}
                        icon='volume-high'
                        iconColor={changeOpacity(theme.centerChannelColor, 0.56)}
                    />
                    <SettingSeparator/>
                    <SettingOption
                        action={selectOption}
                        label={intl.formatMessage({
                            id: 'notification_settings.calls.calm',
                            defaultMessage: 'Calm',
                        })}
                        selected={callsMobileNotificationSound === Ringtone.Calm}
                        testID='notification_settings.calls.calm.option'
                        type='select'
                        value={Ringtone.Calm}
                        icon='volume-high'
                        iconColor={changeOpacity(theme.centerChannelColor, 0.56)}
                    />
                    <SettingSeparator/>
                    <SettingOption
                        action={selectOption}
                        label={intl.formatMessage({
                            id: 'notification_settings.calls.urgent',
                            defaultMessage: 'Urgent',
                        })}
                        selected={callsMobileNotificationSound === Ringtone.Urgent}
                        testID='notification_settings.calls.urgent.option'
                        type='select'
                        value={Ringtone.Urgent}
                        icon='volume-high'
                        iconColor={changeOpacity(theme.centerChannelColor, 0.56)}
                    />
                    <SettingSeparator/>
                    <SettingOption
                        action={selectOption}
                        label={intl.formatMessage({
                            id: 'notification_settings.calls.cheerful',
                            defaultMessage: 'Cheerful',
                        })}
                        selected={callsMobileNotificationSound === Ringtone.Cheerful}
                        testID='notification_settings.calls.cheerful.option'
                        type='select'
                        value={Ringtone.Cheerful}
                        icon='volume-high'
                        iconColor={changeOpacity(theme.centerChannelColor, 0.56)}
                    />
                    <SettingSeparator/>
                </SettingBlock>
            )}
        </SettingContainer>
    );
};

export default NotificationCall;
