// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {useIntl} from 'react-intl';
import {Keyboard} from 'react-native';

import CompassIcon from '@components/compass_icon';
import TouchableWithFeedback from '@components/touchable_with_feedback';
import {Screens} from '@constants';
import {useAIRewrite} from '@context/ai_rewrite';
import {useTheme} from '@context/theme';
import {useIsTablet} from '@hooks/device';
import {openAsBottomSheet} from '@screens/navigation';
import {changeOpacity} from '@utils/theme';

const ICON_SIZE = 24;

type Props = {
    testID?: string;
    disabled?: boolean;
    value: string;
    updateValue: (value: string | ((prevValue: string) => string)) => void;
}

const styles = {
    icon: {
        alignItems: 'center' as const,
        justifyContent: 'center' as const,
        padding: 10,
    },
};

export default function AIRewriteAction({
    testID,
    disabled = false,
    value,
    updateValue,
}: Props) {
    const intl = useIntl();
    const theme = useTheme();
    const isTablet = useIsTablet();
    const {isProcessing} = useAIRewrite();

    const handlePress = useCallback(() => {
        Keyboard.dismiss();
        const title = isTablet ? intl.formatMessage({id: 'ai_rewrite.title', defaultMessage: 'AI Rewrite'}) : '';

        openAsBottomSheet({
            closeButtonId: 'close-ai-rewrite',
            screen: Screens.AI_REWRITE_OPTIONS,
            theme,
            title,
            props: {
                closeButtonId: 'close-ai-rewrite',
                originalMessage: value,
                updateValue,
            },
        });
    }, [intl, isTablet, theme, value, updateValue]);

    const isDisabled = disabled || isProcessing;
    const actionTestID = isDisabled ? `${testID}.disabled` : testID;
    const iconColor = isDisabled ?
        changeOpacity(theme.centerChannelColor, 0.16) :
        changeOpacity(theme.centerChannelColor, 0.64);

    return (
        <TouchableWithFeedback
            testID={actionTestID}
            disabled={isDisabled}
            onPress={handlePress}
            style={styles.icon}
            type={'opacity'}
        >
            <CompassIcon
                name='creation-outline'
                color={iconColor}
                size={ICON_SIZE}
            />
        </TouchableWithFeedback>
    );
}

