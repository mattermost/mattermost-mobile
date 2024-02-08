// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {useIntl} from 'react-intl';

import SettingOption from '@components/settings/option';
import SettingSeparator from '@components/settings/separator';
import {useTheme} from '@context/theme';

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
                value={'custom'}
                label={intl.formatMessage({id: 'settings_display.custom_theme', defaultMessage: 'Custom Theme'})}
                selected={theme.type?.toLowerCase() === displayTheme?.toLowerCase()}
                radioItemProps={radioItemProps}
                testID='theme_display_settings.custom.option'
            />
        </>
    );
};

export default CustomTheme;
