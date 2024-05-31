// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useMemo, useState} from 'react';
import {useIntl} from 'react-intl';
import InCallManager from 'react-native-incall-manager';

import {updateMe} from '@actions/remote/user';
import SettingBlock from '@components/settings/block';
import SettingContainer from '@components/settings/container';
import SettingOption from '@components/settings/option';
import SettingSeparator from '@components/settings/separator';
import {Calls} from '@constants';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import useBackNavigation from '@hooks/navigate_back';
import {t} from '@i18n';
import {popTopScreen} from '@screens/navigation';
import {changeOpacity} from '@utils/theme';
import {getNotificationProps} from '@utils/user';

import type UserModel from '@typings/database/models/servers/user';
import type {AvailableScreens} from '@typings/screens/navigation';

type Props = {
    componentId: AvailableScreens;
    currentUser?: UserModel;
};

const footerText = {
    id: t('notification_settings.calls.callsInfo'),
    defaultMessage: 'After selecting a ringtone, select it again to preview the sound. Select it once more to stop the preview. Note: silent mode must be off to hear the ringtone.',
};

const NotificationCall = ({componentId, currentUser}: Props) => {
    const serverUrl = useServerUrl();
    const intl = useIntl();
    const theme = useTheme();

    const notifyProps = useMemo(() => getNotificationProps(currentUser), [currentUser?.notifyProps]);

    const initialCallsMobileSound = useMemo(() => Boolean(notifyProps?.calls_mobile_sound ? notifyProps.calls_mobile_sound === 'true' : notifyProps?.calls_desktop_sound === 'true'),
        [/* dependency array should remain empty */]);
    const [callsMobileSound, setCallsMobileSound] = useState(initialCallsMobileSound);
    const initialCallsMobileNotificationSound = useMemo(() => {
        let initialSound = notifyProps?.calls_mobile_notification_sound ? notifyProps.calls_mobile_notification_sound : notifyProps?.calls_notification_sound;
        if (!initialSound) {
            initialSound = Calls.RINGTONE_DEFAULT;
        }
        return initialSound;
    }, [/* dependency array should remain empty */]);
    const [callsMobileNotificationSound, setCallsMobileNotificationSound] = useState(initialCallsMobileNotificationSound);
    const [playingRingtone, setPlayingRingtone] = useState(false);

    const close = useCallback(() => {
        if (playingRingtone) {
            InCallManager.stopRingtone();
            setPlayingRingtone(false);
        }
        popTopScreen(componentId);
    }, [componentId, playingRingtone]);

    const selectOption = useCallback((value: string) => {
        if (value !== callsMobileNotificationSound) {
            setCallsMobileNotificationSound(value);
            return;
        }

        if (playingRingtone) {
            InCallManager.stopRingtone();
            setPlayingRingtone(false);
        } else {
            const tone = 'calls_' + value.toLowerCase();
            InCallManager.startRingtone(tone, Calls.RINGTONE_VIBRATE_PATTERN);
            setPlayingRingtone(true);
        }
    }, [callsMobileNotificationSound, playingRingtone]);

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
    }, [serverUrl, canSaveSettings, close, notifyProps, callsMobileSound, callsMobileNotificationSound, playingRingtone]);

    useBackNavigation(saveNotificationSettings);

    useAndroidHardwareBackHandler(componentId, saveNotificationSettings);

    return (
        <SettingContainer testID='call_notification_settings'>
            <SettingOption
                label={intl.formatMessage({
                    id: 'notification_settings.calls.enable_sound',
                    defaultMessage: 'Notification sound for incoming calls',
                })}
                action={setCallsMobileSound}
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
                        selected={callsMobileNotificationSound === 'Dynamic'}
                        testID='notification_settings.calls.dynamic.option'
                        type='select'
                        value='Dynamic'
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
                        selected={callsMobileNotificationSound === 'Calm'}
                        testID='notification_settings.calls.calm.option'
                        type='select'
                        value='Calm'
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
                        selected={callsMobileNotificationSound === 'Urgent'}
                        testID='notification_settings.calls.urgent.option'
                        type='select'
                        value='Urgent'
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
                        selected={callsMobileNotificationSound === 'Cheerful'}
                        testID='notification_settings.calls.cheerful.option'
                        type='select'
                        value='Cheerful'
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
