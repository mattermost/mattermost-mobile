// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useMemo, useState} from 'react';
import {useIntl} from 'react-intl';

import {updateMe} from '@actions/remote/user';
import SettingContainer from '@components/settings/container';
import SettingOption from '@components/settings/option';
import SettingSeparator from '@components/settings/separator';
import {Screens} from '@constants';
import {useServerUrl} from '@context/server';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import useBackNavigation from '@hooks/navigate_back';
import {usePreventDoubleTap} from '@hooks/utils';
import {navigateToSettingsScreen} from '@screens/navigation';
import SettingsStore from '@store/settings_store';
import {getDeviceTimezone} from '@utils/timezone';
import {getTimezoneRegion, getUserTimezoneProps} from '@utils/user';

import type UserModel from '@typings/database/models/servers/user';

type DisplayTimezoneProps = {
    currentUser?: UserModel;
}
const DisplayTimezone = ({currentUser}: DisplayTimezoneProps) => {
    const intl = useIntl();
    const serverUrl = useServerUrl();

    // eslint-disable-next-line react-hooks/exhaustive-deps
    const initialTimezone = useMemo(() => getUserTimezoneProps(currentUser), [/* dependency array should remain empty */]);
    const [userTimezone, setUserTimezone] = useState(initialTimezone);

    const updateAutomaticTimezone = (useAutomaticTimezone: boolean) => {
        const automaticTimezone = getDeviceTimezone();
        setUserTimezone((prev) => ({
            ...prev,
            useAutomaticTimezone,
            automaticTimezone,
        }));
    };

    const goToSelectTimezone = usePreventDoubleTap(useCallback(() => {
        const updateManualTimezone = (mtz: string) => {
            setUserTimezone({
                useAutomaticTimezone: false,
                automaticTimezone: '',
                manualTimezone: mtz,
            });
            SettingsStore.removeUpdateAutomaticTimezoneCallback();
        };

        SettingsStore.setUpdateAutomaticTimezoneCallback(updateManualTimezone);

        navigateToSettingsScreen(Screens.SETTINGS_DISPLAY_TIMEZONE_SELECT);
    }, []));

    const saveTimezone = useCallback(() => {
        const canSave =
            initialTimezone.useAutomaticTimezone !== userTimezone.useAutomaticTimezone ||
            initialTimezone.automaticTimezone !== userTimezone.automaticTimezone ||
            initialTimezone.manualTimezone !== userTimezone.manualTimezone;

        if (canSave) {
            const timeZone = {
                useAutomaticTimezone: userTimezone.useAutomaticTimezone.toString(),
                automaticTimezone: userTimezone.automaticTimezone,
                manualTimezone: userTimezone.manualTimezone,
            };

            updateMe(serverUrl, {timezone: timeZone});
        }
    }, [
        initialTimezone,
        userTimezone.useAutomaticTimezone,
        userTimezone.automaticTimezone,
        userTimezone.manualTimezone,
        serverUrl,
    ]);

    useBackNavigation(saveTimezone);

    useAndroidHardwareBackHandler(Screens.SETTINGS_DISPLAY_TIMEZONE, saveTimezone);

    const toggleDesc = useMemo(() => {
        if (userTimezone.useAutomaticTimezone) {
            return getTimezoneRegion(userTimezone.automaticTimezone);
        }
        return intl.formatMessage({id: 'settings_display.timezone.off', defaultMessage: 'Off'});
    }, [intl, userTimezone.automaticTimezone, userTimezone.useAutomaticTimezone]);

    return (
        <SettingContainer testID='timezone_display_settings'>
            <SettingOption
                action={updateAutomaticTimezone}
                description={toggleDesc}
                label={intl.formatMessage({id: 'settings_display.timezone.automatically', defaultMessage: 'Set automatically'})}
                selected={userTimezone.useAutomaticTimezone}
                testID='timezone_display_settings.automatic.option'
                type='toggle'
            />
            <SettingSeparator/>
            {!userTimezone.useAutomaticTimezone && (
                <SettingOption
                    action={goToSelectTimezone}
                    info={getTimezoneRegion(userTimezone.manualTimezone)}
                    label={intl.formatMessage({id: 'settings_display.timezone.manual', defaultMessage: 'Change timezone'})}
                    testID='timezone_display_settings.manual.option'
                    type='arrow'
                />
            )}
        </SettingContainer>
    );
};

export default DisplayTimezone;
