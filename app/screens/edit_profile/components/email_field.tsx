// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {useIntl} from 'react-intl';

import {t} from '@i18n';
import {HOLDERS} from '@screens/edit_profile/constants';

import InputField from './input_field';

type EmailSettingsProps = {
    authService: string;
    email: string;
    onChange: (id: string, value: string) => void;
}

const EmailField = ({authService, email, onChange}: EmailSettingsProps) => {
    const intl = useIntl();

    let defaultMessage: string;
    let service = '';
    let id = '';

    switch (authService) {
        case 'gitlab':
            service = 'GitLab';
            id = t('user.settings.general.emailGitlabCantUpdate');
            break;
        case 'google':
            service = 'Google Apps';
            id = t('user.settings.general.emailGoogleCantUpdate');
            break;
        case 'office365':
            service = 'Office 365';
            id = t('user.settings.general.emailOffice365CantUpdate');
            break;
        case 'ldap':
            service = 'AD/LDAP';
            id = t('user.settings.general.emailLdapCantUpdate');
            break;
        case 'saml':
            service = 'SAML';
            id = t('user.settings.general.emailSamlCantUpdate');
            break;

        case '':
            id = t('user.settings.general.emailCantUpdate');
            service = '';
            break;
    }

    if (id === 'user.settings.general.emailCantUpdate') {
        defaultMessage = 'Email must be updated using a web client or desktop application.';
    } else {
        defaultMessage = `Login occurs through ${service}. Email cannot be updated. Email address used for notifications is {email}.`;
    }

    if (!id) {
        return null;
    }

    const helpText = intl.formatMessage({id, defaultMessage}, {email});

    return (
        <InputField
            fieldDescription={helpText ?? ''}
            id='email'
            isDisabled={true}
            label={HOLDERS.email}
            onChange={onChange}
            testID='edit_profile.text_setting.email'
            value={email}
        />
    );
};

export default EmailField;
