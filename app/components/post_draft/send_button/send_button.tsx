// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useMemo, useRef, useState} from 'react';
import {Pressable, View} from 'react-native';
import Tooltip from 'react-native-walkthrough-tooltip';

import {storeScheduledPostTutorial} from '@actions/app/global';
import CompassIcon from '@components/compass_icon';
import ScheduledPostTooltip from '@components/post_draft/send_button/scheduled_post_tooltip';
import TouchableWithFeedback from '@components/touchable_with_feedback';
import {useTheme} from '@context/theme';
import useDidMount from '@hooks/did_mount';
import usePressableOpacityStyle from '@hooks/use_pressable_opacity';
import {usePreventDoubleTap} from '@hooks/utils';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

type Props = {
    testID: string;
    disabled: boolean;
    sendMessage: () => void;
    showScheduledPostOptions: () => void;
    scheduledPostFeatureTooltipWatched: boolean;
    scheduledPostEnabled: boolean;

    /** iPhone platform UI — circular send (Figma resting/focused compose) */
    circular?: boolean;
}

const CIRCULAR_SEND_SIZE = 40;

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        disableButton: {
            backgroundColor: changeOpacity(theme.buttonBg, 0.3),
        },
        sendButtonContainer: {
            justifyContent: 'flex-end',
            paddingRight: 8,
        },
        sendButton: {
            backgroundColor: theme.buttonBg,
            borderRadius: 4,
            height: 32,
            width: 80,
            alignItems: 'center',
            justifyContent: 'center',
        },
        circularSendButtonContainer: {

            // Pill container already provides the 4pt inset — keep send flush with plus.
            justifyContent: 'center',
        },
        circularSendButton: {
            alignItems: 'center',
            backgroundColor: theme.buttonBg,
            borderRadius: CIRCULAR_SEND_SIZE / 2,
            height: CIRCULAR_SEND_SIZE,
            justifyContent: 'center',
            width: CIRCULAR_SEND_SIZE,
        },
        circularSendButtonDisabled: {
            backgroundColor: 'transparent',
        },
        scheduledPostTooltipStyle: {
            shadowColor: '#000',
            shadowOffset: {width: 0, height: 2},
            shadowRadius: 2,
            shadowOpacity: 0.16,
            elevation: 24,
            width: 250,
            height: 140,
        },
    };
});

const SendButton: React.FC<Props> = ({
    testID,
    disabled,
    sendMessage,
    showScheduledPostOptions,
    scheduledPostFeatureTooltipWatched,
    scheduledPostEnabled,
    circular = false,
}: Props) => {
    const theme = useTheme();
    const sendButtonTestID = `${testID}.send.button` + (disabled ? '.disabled' : '');
    const style = getStyleSheet(theme);

    const [scheduledPostTooltipVisible, setScheduledPostTooltipVisible] = useState(false);
    const idleCallbackHandle = useRef<number | undefined>(undefined);

    useDidMount(() => {
        if (!scheduledPostFeatureTooltipWatched && scheduledPostEnabled) {
            idleCallbackHandle.current = requestIdleCallback(() => {
                setScheduledPostTooltipVisible(true);
            });
        }
        return () => {
            if (idleCallbackHandle.current !== undefined) {
                cancelIdleCallback(idleCallbackHandle.current);
            }
        };
    });

    const onCloseScheduledPostTooltip = useCallback(() => {
        setScheduledPostTooltipVisible(false);
        storeScheduledPostTutorial();
    }, []);

    const viewStyle = useMemo(() => {
        if (circular) {
            return [style.circularSendButton, disabled && style.circularSendButtonDisabled];
        }

        return [style.sendButton, disabled ? style.disableButton : undefined];
    }, [circular, disabled, style]);

    let buttonColor = theme.buttonColor;
    if (disabled && circular) {
        buttonColor = changeOpacity(theme.centerChannelColor, 0.56);
    } else if (disabled) {
        buttonColor = changeOpacity(theme.buttonColor, 0.5);
    }

    const sendMessageWithDoubleTapPrevention = usePreventDoubleTap(sendMessage);
    const containerStyle = circular ? style.circularSendButtonContainer : style.sendButtonContainer;
    const pressableStyle = usePressableOpacityStyle(containerStyle);

    const buttonBody = (
        <Tooltip
            isVisible={scheduledPostTooltipVisible}
            placement='top'
            content={<ScheduledPostTooltip onClose={onCloseScheduledPostTooltip}/>}
            onClose={onCloseScheduledPostTooltip}
            tooltipStyle={style.scheduledPostTooltipStyle}
        >
            <View style={viewStyle}>
                <CompassIcon
                    name={circular ? 'send-outline' : 'send'}
                    size={24}
                    color={buttonColor}
                />
            </View>
        </Tooltip>
    );

    if (circular) {
        return (
            <Pressable
                testID={sendButtonTestID}
                onPress={sendMessageWithDoubleTapPrevention}
                style={pressableStyle}
                disabled={disabled}
                onLongPress={scheduledPostEnabled ? showScheduledPostOptions : undefined}
            >
                {buttonBody}
            </Pressable>
        );
    }

    return (
        <TouchableWithFeedback
            testID={sendButtonTestID}
            onPress={sendMessageWithDoubleTapPrevention}
            style={containerStyle}
            type={'opacity'}
            disabled={disabled}
            onLongPress={scheduledPostEnabled ? showScheduledPostOptions : undefined}
        >
            {buttonBody}
        </TouchableWithFeedback>
    );
};

export default SendButton;
