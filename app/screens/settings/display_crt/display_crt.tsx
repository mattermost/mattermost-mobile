// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useState} from 'react';
import {defineMessage, useIntl} from 'react-intl';

import {handleCRTToggled, savePreference} from '@actions/remote/preference';
import SettingBlock from '@components/settings/block';
import SettingContainer from '@components/settings/container';
import SettingOption from '@components/settings/option';
import SettingSeparator from '@components/settings/separator';
import {Preferences} from '@constants';
import {useServerUrl} from '@context/server';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import useBackNavigation from '@hooks/navigate_back';
import {popTopScreen} from '@screens/navigation';
import EphemeralStore from '@store/ephemeral_store';

import type {AvailableScreens} from '@typings/screens/navigation';

const crtDescription = defineMessage({
    id: 'settings_display.crt.desc',
    defaultMessage: 'When enabled, reply messages are not shown in the channel and you\'ll be notified about threads you\'re following in the "Threads" view.',
});

type Props = {
    componentId: AvailableScreens;
    currentUserId: string;
    isCRTEnabled: boolean;
}

const DisplayCRT = ({componentId, currentUserId, isCRTEnabled}: Props) => {
    const [isEnabled, setIsEnabled] = useState(isCRTEnabled);
    const serverUrl = useServerUrl();
    const intl = useIntl();

    const saveCRTPreference = useCallback(async () => {
        popTopScreen(componentId);
        if (isCRTEnabled !== isEnabled) {
            const crtPreference: PreferenceType = {
                category: Preferences.CATEGORIES.DISPLAY_SETTINGS,
                name: Preferences.COLLAPSED_REPLY_THREADS,
                user_id: currentUserId,
                value: isEnabled ? Preferences.COLLAPSED_REPLY_THREADS_ON : Preferences.COLLAPSED_REPLY_THREADS_OFF,
            };

            EphemeralStore.setEnablingCRT(true);
            const {error} = await savePreference(serverUrl, [crtPreference]);
            if (!error) {
                handleCRTToggled(serverUrl);
            }
        }
    }, [componentId, isCRTEnabled, isEnabled, currentUserId, serverUrl]);

    useBackNavigation(saveCRTPreference);
    useAndroidHardwareBackHandler(componentId, saveCRTPreference);

    return (
        <SettingContainer testID='crt_display_settings'>
            <SettingBlock
                footerText={crtDescription}
            >
                <SettingOption
                    action={setIsEnabled}
                    label={intl.formatMessage({id: 'settings_display.crt.label', defaultMessage: 'Collapsed Reply Threads'})}
                    selected={isEnabled}
                    testID='settings_display.crt.toggle'
                    type='toggle'
                />
                <SettingSeparator/>
            </SettingBlock>
        </SettingContainer>
    );
};

export default DisplayCRT;
