// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';

import {useRewrite} from '@agents/hooks';
import CompassIcon from '@components/compass_icon';
import TouchableWithFeedback from '@components/touchable_with_feedback';
import {Screens} from '@constants';
import {useKeyboardState} from '@context/keyboard_state';
import {useTheme} from '@context/theme';
import {navigateToScreen} from '@screens/navigation';
import CallbackStore from '@store/callback_store';
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
    const theme = useTheme();
    const {isProcessing} = useRewrite();
    const {blurAndDismissKeyboard} = useKeyboardState();

    const handlePress = useCallback(async () => {
        await blurAndDismissKeyboard();
        CallbackStore.setCallback(updateValue);
        navigateToScreen(Screens.AGENTS_REWRITE_OPTIONS, {originalMessage: value});
    }, [blurAndDismissKeyboard, updateValue, value]);

    const isDisabled = disabled || isProcessing;
    const actionTestID = isDisabled ? `${testID}.disabled` : testID;
    const iconColor = isDisabled ?changeOpacity(theme.centerChannelColor, 0.16) :changeOpacity(theme.centerChannelColor, 0.64);

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
