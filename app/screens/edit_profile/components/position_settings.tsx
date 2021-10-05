// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {useIntl} from 'react-intl';

import TextSetting from '@components/text_settings';
import {useTheme} from '@context/theme';

import {HOLDERS} from '../constants';

type PositionSettingsProps = {
    isLandscape: boolean;
    onChange: (text: string) => void;
    position: string;
    positionDisabled: boolean;
};

const PositionSettings = ({isLandscape, onChange, position, positionDisabled}: PositionSettingsProps) => {
    const theme = useTheme();
    const intl = useIntl();

    return (
        <TextSetting
            disabled={positionDisabled}
            id='position'
            label={HOLDERS.position}
            disabledText={intl.formatMessage({
                id: 'user.settings.general.field_handled_externally',
                defaultMessage:
                    'This field is handled through your login provider. If you want to change it, you need to do so through your login provider.',
            })}
            maxLength={128}
            onChange={onChange}
            theme={theme}
            value={position}
            isLandscape={isLandscape}
            optional={true}
            testID='edit_profile.text_setting.position'
        />
    );
};

export default PositionSettings;
