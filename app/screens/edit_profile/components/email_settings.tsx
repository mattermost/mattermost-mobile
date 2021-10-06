// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {useIntl} from 'react-intl';
import {View} from 'react-native';

import TextSetting from '@components/widgets/text_settings';
import {HOLDERS} from '@screens/edit_profile/constants';

import type UserModel from '@typings/database/models/servers/user';

type EmailSettingsProps = {
    currentUser: UserModel;
    email: string;
    onChange: (id: string, value: string) => void;
}

const EmailSettings = ({currentUser, email, onChange}: EmailSettingsProps) => {
    const intl = useIntl();

    let helpText;

    switch (currentUser.authService) {
        case 'gitlab':
            helpText = intl.formatMessage({id: 'user.settings.general.emailGitlabCantUpdate', defaultMessage: 'Login occurs through GitLab. Email cannot be updated. Email address used for notifications is {email}.'}, {email});
            break;
        case 'google':
            helpText = intl.formatMessage({id: 'user.settings.general.emailGoogleCantUpdate', defaultMessage: 'Login occurs through Google Apps. Email cannot be updated. Email address used for notifications is {email}.'}, {email});
            break;
        case 'office365':
            helpText = intl.formatMessage({id: 'user.settings.general.emailOffice365CantUpdate', defaultMessage: 'Login occurs through Office 365. Email cannot be updated. Email address used for notifications is {email}.'}, {email});
            break;
        case 'ldap':
            helpText = intl.formatMessage({id: 'user.settings.general.emailLdapCantUpdate', defaultMessage: 'Login occurs through AD/LDAP. Email cannot be updated. Email address used for notifications is {email}.'}, {email});
            break;
        case 'saml':
            helpText = intl.formatMessage({id: 'user.settings.general.emailSamlCantUpdate', defaultMessage: 'Login occurs through SAML. Email cannot be updated. Email address used for notifications is {email}.'}, {email});
            break;

        case '':
            helpText = intl.formatMessage({id: 'user.settings.general.emailCantUpdate', defaultMessage: 'Email must be updated using a web client or desktop application.'});
            break;
    }

    if (!helpText) {
        return null;
    }

    return (
        <View>
            <TextSetting
                disabled={true}
                id='email'
                label={HOLDERS.email}
                disabledText={helpText ?? ''}
                onChange={onChange}
                value={email}
                testID='edit_profile.text_setting.email'
            />
        </View>
    );
};

export default EmailSettings;
