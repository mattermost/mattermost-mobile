// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {Text} from 'react-native';

import FormattedText from '@components/formatted_text';
import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import type SystemModel from '@typings/database/models/servers/system';

type TosPrivacyContainerProps = {
    config: SystemModel;
    onPressTOS: () => void;
    onPressPrivacyPolicy: () => void;
}

const TosPrivacyContainer = ({config, onPressTOS, onPressPrivacyPolicy}: TosPrivacyContainerProps) => {
    const hasTermsOfServiceLink = config.value?.TermsOfServiceLink;
    const hasPrivacyPolicyLink = config.value?.PrivacyPolicyLink;
    const theme = useTheme();
    const style = getStyleSheet(theme);
    return (
        <>
            {hasTermsOfServiceLink && (
                <FormattedText
                    id='mobile.tos_link'
                    defaultMessage='Terms of Service'
                    style={style.noticeLink}
                    onPress={onPressTOS}
                    testID='about.terms_of_service'
                />
            )}
            {hasTermsOfServiceLink && hasPrivacyPolicyLink && (
                <Text style={[style.footerText, style.hyphenText]}>
                    {' - '}
                </Text>
            )}
            {hasPrivacyPolicyLink && (
                <FormattedText
                    id='mobile.privacy_link'
                    defaultMessage='Privacy Policy'
                    style={style.noticeLink}
                    onPress={onPressPrivacyPolicy}
                    testID='about.privacy_policy'
                />
            )}
        </>
    );
};

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        noticeLink: {
            color: theme.linkColor,
            fontSize: 11,
            lineHeight: 13,
        },
        footerText: {
            color: changeOpacity(theme.centerChannelColor, 0.5),
            fontSize: 11,
            lineHeight: 13,
            marginBottom: 10,
        },
        hyphenText: {
            marginBottom: 0,
        },
    };
});

export default TosPrivacyContainer;
