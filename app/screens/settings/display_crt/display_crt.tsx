// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useState} from 'react';
import {useIntl} from 'react-intl';

import {savePreference} from '@actions/remote/preference';
import {Preferences} from '@constants';
import {useServerUrl} from '@context/server';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import useBackNavigation from '@hooks/navigate_back';
import {t} from '@i18n';
import {popTopScreen} from '@screens/navigation';

import SettingBlock from '../setting_block';
import SettingContainer from '../setting_container';
import SettingOption from '../setting_option';
import SettingSeparator from '../settings_separator';

const crtDescription = {
    id: t('settings_display.crt.desc'),
    defaultMessage: 'When enabled, reply messages are not shown in the channel and you\'ll be notified about threads you\'re following in the "Threads" view.',
};

type Props = {
    componentId: string;
    currentUserId: string;
    isCRTEnabled: boolean;
}

const DisplayCRT = ({componentId, currentUserId, isCRTEnabled}: Props) => {
    const [isEnabled, setIsEnabled] = useState(isCRTEnabled);
    const serverUrl = useServerUrl();
    const intl = useIntl();

    const close = () => popTopScreen(componentId);

    const saveCRTPreference = useCallback(() => {
        if (isCRTEnabled !== isEnabled) {
            const crtPreference: PreferenceType = {
                category: Preferences.CATEGORY_DISPLAY_SETTINGS,
                name: Preferences.COLLAPSED_REPLY_THREADS,
                user_id: currentUserId,
                value: isEnabled ? Preferences.COLLAPSED_REPLY_THREADS_ON : Preferences.COLLAPSED_REPLY_THREADS_OFF,
            };
            savePreference(serverUrl, [crtPreference]);
        }
        close();
    }, [isEnabled, isCRTEnabled, serverUrl]);

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
