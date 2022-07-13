// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {useIntl} from 'react-intl';
import {StyleSheet} from 'react-native';

import OptionItem from '@components/option_item';
import {useTheme} from '@context/theme';

import SettingBlock from '../setting_block';

const styles = StyleSheet.create({
    containerStyles: {
        paddingHorizontal: 16,
    },
});

type CustomThemeProps = {
    customTheme: Theme;
    setTheme: (themeKey: string) => void;
}

const CustomTheme = ({customTheme, setTheme}: CustomThemeProps) => {
    const intl = useIntl();
    const theme = useTheme();
    return (
        <SettingBlock
            containerStyles={styles.containerStyles}
            disableHeader={true}
        >
            <OptionItem
                action={setTheme}
                type='select'
                value={customTheme.type}
                label={intl.formatMessage({id: 'settings_display.custom_theme', defaultMessage: 'Custom Theme'})}
                selected={theme.type?.toLowerCase() === customTheme.type?.toLowerCase()}
            />
        </SettingBlock>
    );
};

export default CustomTheme;
