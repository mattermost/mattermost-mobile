// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import CustomText from '@components/custom_status/custom_status_text';
import FormattedText from '@components/formatted_text';
import {t} from '@i18n';

type CustomStatusTextProps = {
    customStatus?: UserCustomStatus;
    isStatusSet: boolean;
    theme: Theme;
};

const CustomStatusText = ({isStatusSet, customStatus, theme}: CustomStatusTextProps) => {
    let text: any;

    text = (
        <FormattedText
            id={t('mobile.routes.custom_status')}
            defaultMessage='Set a Status'
        />
    );

    if (isStatusSet && customStatus?.text) {
        text = customStatus.text;
    }

    return (
        <CustomText
            text={text}
            theme={theme}
        />);
};

export default CustomStatusText;
