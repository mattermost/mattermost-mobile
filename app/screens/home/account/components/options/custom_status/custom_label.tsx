// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import moment from 'moment-timezone';
import React from 'react';
import {View} from 'react-native';

import ClearButton from '@components/custom_status/clear_button';
import CustomStatusExpiry from '@components/custom_status/custom_status_expiry';
import FormattedText from '@components/formatted_text';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import CustomStatusText from './custom_status_text';

type CustomLabelProps = {
    customStatus: UserCustomStatus;
    isCustomStatusExpirySupported: boolean;
    isStatusSet: boolean;
    showRetryMessage: boolean;
    theme: Theme;
    onClearCustomStatus: () => void;
};

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        clearButton: {
            position: 'absolute',
            top: 4,
            right: 14,
        },
        customStatusTextContainer: {
            width: '70%',
        },
        customStatusExpiryText: {
            paddingTop: 3,
            fontSize: 15,
            color: changeOpacity(theme.centerChannelColor, 0.35),
        },
        retryMessage: {
            color: theme.errorTextColor,
            paddingBottom: 25,
        },
    };
});

const CustomLabel = ({customStatus, isCustomStatusExpirySupported, isStatusSet, onClearCustomStatus, showRetryMessage, theme}: CustomLabelProps) => {
    const style = getStyleSheet(theme);

    return (
        <>
            <View style={style.customStatusTextContainer}>
                <CustomStatusText
                    theme={theme}
                    isStatusSet={Boolean(isStatusSet)}
                    customStatus={customStatus}
                />
                {Boolean(isStatusSet && isCustomStatusExpirySupported && customStatus?.duration) && (
                    <CustomStatusExpiry
                        time={moment(customStatus?.expires_at)}
                        theme={theme}
                        textStyles={style.customStatusExpiryText}
                        withinBrackets={true}
                        showPrefix={true}
                        testID={'custom_status.expiry'}
                    />
                )}
            </View>
            {showRetryMessage && (
                <FormattedText
                    id={'custom_status.failure_message'}
                    defaultMessage='Failed to update status. Try again'
                    style={style.retryMessage}
                />
            )}
            {isStatusSet && (
                <View style={style.clearButton}>
                    <ClearButton
                        handlePress={onClearCustomStatus}
                        theme={theme}
                        testID='settings.sidebar.custom_status.action.clear'
                    />
                </View>
            )}
        </>
    );
};

export default CustomLabel;
