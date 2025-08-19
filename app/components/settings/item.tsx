// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {useIntl} from 'react-intl';
import {Platform} from 'react-native';

import OptionItem, {type OptionItemProps} from '@components/option_item';

import Options, {DisplayOptionConfig, NotificationsOptionConfig, SettingOptionConfig} from '../../screens/settings/config';

import SettingSeparator from './separator';

type SettingsConfig = keyof typeof SettingOptionConfig | keyof typeof NotificationsOptionConfig| keyof typeof DisplayOptionConfig
type SettingOptionProps = {
    optionName: SettingsConfig;
    onPress: () => void;
    separator?: boolean;
} & Partial<OptionItemProps>;

const SettingItem = ({
    info,
    onPress,
    optionName,
    separator = true,
    ...props
}: SettingOptionProps) => {
    const intl = useIntl();
    const config = Options[optionName];

    const label = props.label || intl.formatMessage({id: config.i18nId, defaultMessage: config.defaultMessage});

    return (
        <>
            <OptionItem
                action={onPress}
                icon={config.icon}
                info={info}
                label={label}
                type={Platform.select({ios: 'arrow', default: 'default'})}
                {...props}
            />
            {separator && <SettingSeparator/>}
        </>
    );
};

export default SettingItem;
