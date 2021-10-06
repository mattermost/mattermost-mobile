// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {useIntl} from 'react-intl';

import TextSetting from '@components/widgets/text_settings';
import {HOLDERS} from '@screens/edit_profile/constants';

type CommonFieldSettingsProps = {
    isDisabled: boolean;
    optional?: boolean;
    id: string;
    value: string;
    onChange: (id: string, value: string) => void;
    maxLength?: number;
}

const DISABLED_TEXTS: { [id: string]: any } = {
    firstName: {
        id: 'user.settings.general.field_handled_externally',
        defaultMessage: 'This field is handled through your login provider. If you want to change it, you need to do so through your login provider.',
    },
    lastName: {
        id: 'user.settings.general.field_handled_externally',
        defaultMessage:
    'This field is handled through your login provider. If you want to change it, you need to do so through your login provider.',
    },
    username: {
        id: 'user.settings.general.field_handled_externally',
        defaultMessage:
            'This field is handled through your login provider. If you want to change it, you need to do so through your login provider.',
    },
    nickname: {
        id: 'user.settings.general.field_handled_externally',
        defaultMessage:
            'This field is handled through your login provider. If you want to change it, you need to do so through your login provider.',
    },
    position: {
        id: 'user.settings.general.field_handled_externally',
        defaultMessage:
            'This field is handled through your login provider. If you want to change it, you need to do so through your login provider.',
    },
};

const CommonFieldSettings = ({isDisabled, id, value, onChange, optional, maxLength}: CommonFieldSettingsProps) => {
    const intl = useIntl();

    return (
        <TextSetting
            disabled={isDisabled}
            id={id}
            label={HOLDERS[id]}
            disabledText={intl.formatMessage(DISABLED_TEXTS[id])}
            onChange={onChange}
            value={value}
            testID={`edit_profile.text_setting.${id}`}
            optional={optional}
            maxLength={maxLength}
        />
    );
};

export default CommonFieldSettings;
