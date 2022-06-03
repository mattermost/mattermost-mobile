// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import moment from 'moment-timezone';
import React from 'react';
import {View} from 'react-native';

import ClearButton from '@components/custom_status/clear_button';
import CustomStatusExpiry from '@components/custom_status/custom_status_expiry';
import FormattedText from '@components/formatted_text';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

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
        container: {
            flexDirection: 'row',
        },
        customStatusTextContainer: {
            flex: 1,
        },
        customStatusExpiryText: {
            ...typography('Body', 100, 'Regular'),
            color: changeOpacity(theme.centerChannelColor, 0.35),
        },
        retryMessage: {
            color: theme.errorTextColor,
            ...typography('Body', 75, 'Regular'),
        },
    };
});

const CustomLabel = ({customStatus, isCustomStatusExpirySupported, isStatusSet, onClearCustomStatus, showRetryMessage, theme}: CustomLabelProps) => {
    const style = getStyleSheet(theme);

    return (
        <>
            <View style={style.container}>
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
                    {showRetryMessage && (
                        <FormattedText
                            id={'custom_status.failure_message'}
                            defaultMessage='Failed to update status. Try again'
                            style={style.retryMessage}
                        />
                    )}
                </View>

                {isStatusSet && (
                    <View style={style.clearButton}>
                        <ClearButton
                            handlePress={onClearCustomStatus}
                            theme={theme}
                            testID='settings.sidebar.custom_status.action.clear'
                        />
                    </View>
                )}
            </View>

        </>
    );
};

export default CustomLabel;
