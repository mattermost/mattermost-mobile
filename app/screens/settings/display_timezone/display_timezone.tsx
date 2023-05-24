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
import {goToScreen, popTopScreen} from '@screens/navigation';
import {preventDoubleTap} from '@utils/tap';
import {getDeviceTimezone} from '@utils/timezone';
import {getTimezoneRegion, getUserTimezoneProps} from '@utils/user';

import type UserModel from '@typings/database/models/servers/user';
import type {AvailableScreens} from '@typings/screens/navigation';

type DisplayTimezoneProps = {
    currentUser?: UserModel;
    componentId: AvailableScreens;
}
const DisplayTimezone = ({currentUser, componentId}: DisplayTimezoneProps) => {
    const intl = useIntl();
    const serverUrl = useServerUrl();
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

    const updateManualTimezone = (mtz: string) => {
        setUserTimezone({
            useAutomaticTimezone: false,
            automaticTimezone: '',
            manualTimezone: mtz,
        });
    };

    const goToSelectTimezone = preventDoubleTap(() => {
        const screen = Screens.SETTINGS_DISPLAY_TIMEZONE_SELECT;
        const title = intl.formatMessage({id: 'settings_display.timezone.select', defaultMessage: 'Select Timezone'});

        const passProps = {
            currentTimezone: userTimezone.manualTimezone || initialTimezone.manualTimezone || initialTimezone.automaticTimezone,
            onBack: updateManualTimezone,
        };

        goToScreen(screen, title, passProps);
    });

    const close = () => popTopScreen(componentId);

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

        close();
    }, [userTimezone, serverUrl]);

    useBackNavigation(saveTimezone);

    useAndroidHardwareBackHandler(componentId, saveTimezone);

    const toggleDesc = useMemo(() => {
        if (userTimezone.useAutomaticTimezone) {
            return getTimezoneRegion(userTimezone.automaticTimezone);
        }
        return intl.formatMessage({id: 'settings_display.timezone.off', defaultMessage: 'Off'});
    }, [userTimezone.useAutomaticTimezone]);

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
