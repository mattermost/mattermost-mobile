// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {useIntl} from 'react-intl';

import {updateMe} from '@actions/remote/user';
import {Screens} from '@constants';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import useNavButtonPressed from '@hooks/navigation_button_pressed';
import {goToScreen, popTopScreen, setButtons} from '@screens/navigation';
import {preventDoubleTap} from '@utils/tap';
import {getDeviceTimezone} from '@utils/timezone';
import {getTimezoneRegion, getUserTimezoneProps} from '@utils/user';

import {getSaveButton} from '../config';
import SettingContainer from '../setting_container';
import SettingOption from '../setting_option';
import SettingSeparator from '../settings_separator';

import type UserModel from '@typings/database/models/servers/user';

const SAVE_TIMEZONE_BUTTON_ID = 'save_timezone';

type DisplayTimezoneProps = {
    currentUser: UserModel;
    componentId: string;
}
const DisplayTimezone = ({currentUser, componentId}: DisplayTimezoneProps) => {
    const intl = useIntl();
    const serverUrl = useServerUrl();
    const initialTimezone = useMemo(() => getUserTimezoneProps(currentUser), []); // deps array should remain empty
    const [userTimezone, setUserTimezone] = useState(initialTimezone);
    const theme = useTheme();

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
        const timeZone = {
            useAutomaticTimezone: userTimezone.useAutomaticTimezone.toString(),
            automaticTimezone: userTimezone.automaticTimezone,
            manualTimezone: userTimezone.manualTimezone,
        };

        updateMe(serverUrl, {timezone: timeZone});
        close();
    }, [userTimezone, currentUser.timezone, serverUrl]);

    const saveButton = useMemo(() => getSaveButton(SAVE_TIMEZONE_BUTTON_ID, intl, theme.sidebarHeaderTextColor), [theme.sidebarHeaderTextColor]);

    useEffect(() => {
        const enabled =
            initialTimezone.useAutomaticTimezone !== userTimezone.useAutomaticTimezone ||
            initialTimezone.automaticTimezone !== userTimezone.automaticTimezone ||
            initialTimezone.manualTimezone !== userTimezone.manualTimezone;

        const buttons = {
            rightButtons: [{
                ...saveButton,
                enabled,
            }],
        };
        setButtons(componentId, buttons);
    }, [componentId, currentUser.timezone]);

    useNavButtonPressed(SAVE_TIMEZONE_BUTTON_ID, componentId, saveTimezone, [saveTimezone]);

    useAndroidHardwareBackHandler(componentId, close);

    const toggleDesc = useMemo(() => {
        if (userTimezone.useAutomaticTimezone) {
            return getTimezoneRegion(userTimezone.automaticTimezone);
        }
        return intl.formatMessage({id: 'settings_display.timezone.off', defaultMessage: 'Off'});
    }, [userTimezone.useAutomaticTimezone]);

    return (
        <SettingContainer>
            <SettingOption
                action={updateAutomaticTimezone}
                description={toggleDesc}
                label={intl.formatMessage({id: 'settings_display.timezone.automatically', defaultMessage: 'Set automatically'})}
                selected={userTimezone.useAutomaticTimezone}
                type='toggle'
            />
            <SettingSeparator/>
            {!userTimezone.useAutomaticTimezone && (
                <>
                    {/* <SettingSeparator/> */}
                    <SettingOption
                        action={goToSelectTimezone}
                        info={getTimezoneRegion(userTimezone.manualTimezone)}
                        label={intl.formatMessage({id: 'settings_display.timezone.manual', defaultMessage: 'Change timezone'})}
                        type='arrow'
                    />
                </>
            )}
            {/* <SettingSeparator/> */}
        </SettingContainer>
    );
};

export default DisplayTimezone;
