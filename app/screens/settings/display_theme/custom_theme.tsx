// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {useIntl} from 'react-intl';

import {useTheme} from '@context/theme';
import SettingSeparator from '@screens/settings/settings_separator';

import SettingOption from '../setting_option';

const radioItemProps = {checkedBody: true};

type CustomThemeProps = {
    setTheme: (themeKey: string) => void;
    displayTheme: string | undefined;
}
const CustomTheme = ({setTheme, displayTheme}: CustomThemeProps) => {
    const intl = useIntl();
    const theme = useTheme();
    return (
        <>
            <SettingSeparator isGroupSeparator={true}/>
            <SettingOption
                action={setTheme}
                type='select'
                value={theme.type}
                label={intl.formatMessage({id: 'settings_display.custom_theme', defaultMessage: 'Custom Theme'})}
                selected={theme.type?.toLowerCase() === displayTheme?.toLowerCase()}
                radioItemProps={radioItemProps}
            />
        </>
    );
};

export default CustomTheme;
