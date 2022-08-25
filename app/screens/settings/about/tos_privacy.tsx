// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {Text} from 'react-native';

import FormattedText from '@components/formatted_text';
import {useTheme} from '@context/theme';
import {t} from '@i18n';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        noticeLink: {
            color: theme.linkColor,
            ...typography('Body', 50),
        },
        footerText: {
            color: changeOpacity(theme.centerChannelColor, 0.5),
            ...typography('Body', 50),
            marginBottom: 10,
        },
        hyphenText: {
            marginBottom: 0,
        },
    };
});

type TosPrivacyContainerProps = {
    config: ClientConfig;
    onPressTOS: () => void;
    onPressPrivacyPolicy: () => void;
}
const TosPrivacyContainer = ({config, onPressTOS, onPressPrivacyPolicy}: TosPrivacyContainerProps) => {
    const theme = useTheme();
    const style = getStyleSheet(theme);

    const hasTermsOfServiceLink = Boolean(config.TermsOfServiceLink);
    const hasPrivacyPolicyLink = Boolean(config.PrivacyPolicyLink);

    return (
        <>
            {hasTermsOfServiceLink && (
                <FormattedText
                    id={t('mobile.tos_link')}
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
                    id={t('mobile.privacy_link')}
                    defaultMessage='Privacy Policy'
                    style={style.noticeLink}
                    onPress={onPressPrivacyPolicy}
                    testID='about.privacy_policy'
                />
            )}
        </>
    );
};

export default TosPrivacyContainer;
