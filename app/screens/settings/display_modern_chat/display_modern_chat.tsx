// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useState} from 'react';
import {defineMessage, useIntl} from 'react-intl';

import {storeModernChatEnabled} from '@actions/app/global';
import SettingBlock from '@components/settings/block';
import SettingContainer from '@components/settings/container';
import SettingOption from '@components/settings/option';
import SettingSeparator from '@components/settings/separator';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import useBackNavigation from '@hooks/navigate_back';
import {popTopScreen} from '@screens/navigation';

import type {AvailableScreens} from '@typings/screens/navigation';

const modernChatDescription = defineMessage({
    id: 'settings_display.modern_chat.desc',
    defaultMessage: 'Enable the modern chat interface with improved styling and features.',
});

type Props = {
    componentId: AvailableScreens;
    isModernChatEnabled: boolean;
}

const DisplayModernChat = ({componentId, isModernChatEnabled}: Props) => {
    const [isEnabled, setIsEnabled] = useState(isModernChatEnabled);
    const intl = useIntl();

    const saveModernChatPreference = useCallback(async () => {
        popTopScreen(componentId);
        if (isModernChatEnabled !== isEnabled) {
            await storeModernChatEnabled(isEnabled);
        }
    }, [componentId, isModernChatEnabled, isEnabled]);

    useBackNavigation(saveModernChatPreference);
    useAndroidHardwareBackHandler(componentId, saveModernChatPreference);

    return (
        <SettingContainer testID='modern_chat_display_settings'>
            <SettingBlock
                footerText={modernChatDescription}
            >
                <SettingOption
                    action={setIsEnabled}
                    label={intl.formatMessage({id: 'settings_display.modern_chat.label', defaultMessage: 'Modern Chat'})}
                    selected={isEnabled}
                    testID='settings_display.modern_chat.toggle'
                    type='toggle'
                />
                <SettingSeparator/>
            </SettingBlock>
        </SettingContainer>
    );
};

export default DisplayModernChat;
