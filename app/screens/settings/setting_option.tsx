// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {useIntl} from 'react-intl';

import {MenuItemProps} from '@components/menu_item';
import OptionItem from '@components/option_item';
import {useTheme} from '@context/theme';
import {makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import Options, {DisplayOptionConfig, NotificationsOptionConfig, SettingOptionConfig} from './constant';

type SettingsConfig = keyof typeof SettingOptionConfig | keyof typeof NotificationsOptionConfig| keyof typeof DisplayOptionConfig
type SettingOptionProps = {
    optionName: SettingsConfig;
    onPress: () => void;
} & Omit<MenuItemProps, 'testID'| 'theme'>;

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        menuLabel: {
            color: theme.centerChannelColor,
            ...typography('Body', 200),
        },
    };
});

const SettingOption = ({onPress, optionName, ...rest}: SettingOptionProps) => {
    const theme = useTheme();
    const intl = useIntl();
    const styles = getStyleSheet(theme);
    const props = {...rest, ...Options[optionName]} as unknown as Omit<MenuItemProps, 'onPress'| 'theme'>;

    return (
        <OptionItem
            action={onPress}
            containerStyle={styles.containerStyle}
            label={intl.formatMessage({id: props.i18nId, defaultMessage: props.defaultMessage}, {...props.messageValues})}
            testID={props.testID}
            type='select'
            icon={props.iconName}
        />
    );
};

export default SettingOption;
