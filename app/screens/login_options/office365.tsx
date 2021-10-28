// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import Button from 'react-native-button';

import LocalConfig from '@assets/config.json';
import FormattedText from '@components/formatted_text';
import {Sso} from '@constants';
import {makeStyleSheetFromTheme} from '@utils/theme';

const Office365Option = ({config, license, onPress, theme}: LoginOptionWithConfigAndLicenseProps) => {
    const styles = getStyleSheet(theme);
    const forceHideFromLocal = LocalConfig.HideO365LoginExperimental;
    const o365Enabled = config.EnableSignUpWithOffice365 === 'true' && license.IsLicensed === 'true' &&
        license.Office365OAuth === 'true';

    const handlePress = () => {
        onPress(Sso.OFFICE365);
    };

    if (!forceHideFromLocal && o365Enabled) {
        const additionalButtonStyle = {
            backgroundColor: '#2389d7',
            borderColor: 'transparent',
            borderWidth: 0,
        };

        const textColor = 'white';

        return (
            <Button
                key='o365'
                onPress={handlePress}
                containerStyle={[styles.button, additionalButtonStyle]}
            >
                <FormattedText
                    id='signup.office365'
                    defaultMessage='Office 365'
                    style={[styles.buttonText, {color: textColor}]}
                />
            </Button>
        );
    }

    return null;
};

const getStyleSheet = makeStyleSheetFromTheme((theme) => ({
    button: {
        borderRadius: 3,
        borderColor: theme.buttonBg,
        alignItems: 'center',
        borderWidth: 1,
        alignSelf: 'stretch',
        marginTop: 10,
        padding: 15,
    },
    buttonText: {
        textAlign: 'center',
        color: theme.buttonBg,
        fontSize: 17,
    },
}));

export default Office365Option;
