// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import moment from 'moment-timezone';
import React from 'react';
import {View} from 'react-native';

import ClearButton from '@components/custom_status/clear_button';
import CustomStatusExpiry from '@components/custom_status/custom_status_expiry';
import FormattedText from '@components/formatted_text';
import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import CustomStatusText from './custom_status_text';

type CustomLabelProps = {
    customStatus: UserCustomStatus;
    isCustomStatusExpirySupported: boolean;
    isStatusSet: boolean;
    onClearCustomStatus: () => void;
    showRetryMessage: boolean;
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
            marginLeft: 16,
        },
        customStatusExpiryText: {
            paddingTop: 3,
            fontSize: 15,
            color: changeOpacity(theme.centerChannelColor, 0.35),
        },
        retryMessage: {
            position: 'absolute',
            top: 25,
            left: 40,
            color: theme.errorTextColor,
            ...typography('Body', 100),
        },
    };
});

const CustomLabel = ({customStatus, isCustomStatusExpirySupported, isStatusSet, onClearCustomStatus, showRetryMessage}: CustomLabelProps) => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);

    return (
        <>
            <View style={styles.customStatusTextContainer}>
                <CustomStatusText
                    isStatusSet={Boolean(isStatusSet)}
                    customStatus={customStatus}
                    testID='account.custom_status.custom_status_text'
                />
                {Boolean(isStatusSet && isCustomStatusExpirySupported && customStatus?.duration) && (
                    <CustomStatusExpiry
                        time={moment(customStatus?.expires_at)}
                        theme={theme}
                        textStyles={styles.customStatusExpiryText}
                        withinBrackets={true}
                        showPrefix={true}
                        testID={`account.custom_status.custom_status_duration.${customStatus.duration}.custom_status_expiry`}
                    />
                )}
            </View>
            {showRetryMessage && (
                <FormattedText
                    id={'custom_status.failure_message'}
                    defaultMessage='Failed to update status. Try again'
                    style={styles.retryMessage}
                    testID='account.custom_status.failure_message'
                />
            )}
            {isStatusSet && (
                <View style={styles.clearButton}>
                    <ClearButton
                        handlePress={onClearCustomStatus}
                        theme={theme}
                        testID='account.custom_status.clear.button'
                    />
                </View>
            )}
        </>
    );
};

export default CustomLabel;
