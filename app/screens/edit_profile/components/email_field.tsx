// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {RefObject} from 'react';
import {useIntl} from 'react-intl';

import {FloatingTextInputRef} from '@components/floating_text_input_label';
import {t} from '@i18n';
import {FIELDS} from '@screens/edit_profile/constants';

import Field from './field';

type EmailSettingsProps = {
    authService: string;
    email: string;
    fieldRef: RefObject<FloatingTextInputRef>;
    onChange: (fieldKey: string, value: string) => void;
    onFocusNextField: (fieldKey: string) => void;
}

const EmailField = ({
    authService,
    email,
    fieldRef,
    onChange,
    onFocusNextField,
}: EmailSettingsProps) => {
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

    return (
        <Field
            blurOnSubmit={false}
            enablesReturnKeyAutomatically={true}
            fieldDescription={intl.formatMessage({id, defaultMessage}, {email})}
            fieldKey='email'
            fieldRef={fieldRef}
            isDisabled={true}
            keyboardType='email-address'
            label={FIELDS.email}
            onFocusNextField={onFocusNextField}
            onTextChange={onChange}
            returnKeyType='next'
            testID='edit_profile.text_setting.email'
            value={email}
        />
    );
};

export default EmailField;
