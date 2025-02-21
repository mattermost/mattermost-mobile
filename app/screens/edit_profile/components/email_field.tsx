// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {type ComponentProps} from 'react';
import {useIntl} from 'react-intl';
import {Text, View} from 'react-native';

import FloatingTextInput from '@components/floating_text_input_label';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import Field from './field';

const services: Record<string, string> = {
    gitlab: 'GitLab',
    google: 'Google Apps',
    office365: 'Entra ID',
    ldap: 'AD/LDAP',
    saml: 'SAML',
};

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        container: {
            marginTop: 2,
        },
        text: {
            ...typography('Body', 75),
            color: changeOpacity(theme.centerChannelColor, 0.5),
        },
    };
});

type EmailSettingsProps = {
    authService: string;
    email: string;
    fieldRef: ComponentProps<typeof FloatingTextInput>['ref'];
    onChange: (fieldKey: string, value: string) => void;
    onFocusNextField: (fieldKey: string) => void;
    isDisabled: boolean;
    label: string;
    theme: Theme;
    isTablet: boolean;
}

const EmailField = ({
    authService,
    email,
    fieldRef,
    onChange,
    onFocusNextField,
    isDisabled,
    label,
    theme,
    isTablet,
}: EmailSettingsProps) => {
    const intl = useIntl();
    const service = services[authService];
    const style = getStyleSheet(theme);

    let fieldDescription: string;

    if (service) {
        fieldDescription = intl.formatMessage({
            id: 'user.edit_profile.email.auth_service',
            defaultMessage: 'Login occurs through {service}. Email cannot be updated. Email address used for notifications is {email}.'}, {email, service});
    } else {
        fieldDescription = intl.formatMessage({
            id: 'user.edit_profile.email.web_client',
            defaultMessage: 'Email must be updated using a web client or desktop application.'}, {email, service});
    }

    const descContainer = [style.container, {paddingHorizontal: isTablet ? 42 : 20}];

    return (
        <>
            <Field
                blurOnSubmit={false}
                enablesReturnKeyAutomatically={true}
                fieldKey='email'
                fieldRef={fieldRef}
                isDisabled={isDisabled}
                keyboardType='email-address'
                label={label}
                onFocusNextField={onFocusNextField}
                onTextChange={onChange}
                returnKeyType='next'
                testID='edit_profile_form.email'
                value={email}
            />
            <View
                style={descContainer}
            >
                <Text
                    style={style.text}
                    testID='edit_profile_form.email.input.description'
                >
                    {fieldDescription}
                </Text>
            </View>

        </>

    );
};

export default EmailField;
