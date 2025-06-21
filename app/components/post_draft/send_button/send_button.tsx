// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {InteractionManager, View} from 'react-native';
import Tooltip from 'react-native-walkthrough-tooltip';

import {storeScheduledPostTutorial} from '@actions/app/global';
import CompassIcon from '@components/compass_icon';
import ScheduledPostTooltip from '@components/post_draft/send_button/scheduled_post_tooltip';
import TouchableWithFeedback from '@components/touchable_with_feedback';
import {useTheme} from '@context/theme';
import {usePreventDoubleTap} from '@hooks/utils';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

type Props = {
    testID: string;
    disabled: boolean;
    sendMessage: () => void;
    showScheduledPostOptions: () => void;
    scheduledPostFeatureTooltipWatched: boolean;
    scheduledPostEnabled: boolean;
}

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
}: Props) => {
    const theme = useTheme();
    const sendButtonTestID = `${testID}.send.button` + (disabled ? '.disabled' : '');
    const style = getStyleSheet(theme);

    const [scheduledPostTooltipVisible, setScheduledPostTooltipVisible] = useState(false);

    useEffect(() => {
        if (scheduledPostFeatureTooltipWatched || !scheduledPostEnabled) {
            return;
        }

        InteractionManager.runAfterInteractions(() => {
            setScheduledPostTooltipVisible(true);
        });

        // This effect is intended to run only on the first mount, so dependencies are omitted intentionally.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const onCloseScheduledPostTooltip = useCallback(() => {
        setScheduledPostTooltipVisible(false);
        storeScheduledPostTutorial();
    }, []);

    const viewStyle = useMemo(() => [style.sendButton, disabled ? style.disableButton : {}], [disabled, style]);

    const buttonColor = disabled ? changeOpacity(theme.buttonColor, 0.5) : theme.buttonColor;

    const sendMessageWithDoubleTapPrevention = usePreventDoubleTap(sendMessage);

    return (
        <TouchableWithFeedback
            testID={sendButtonTestID}
            onPress={sendMessageWithDoubleTapPrevention}
            style={style.sendButtonContainer}
            type={'opacity'}
            disabled={disabled}
            onLongPress={scheduledPostEnabled ? showScheduledPostOptions : undefined}
        >
            <Tooltip
                isVisible={scheduledPostTooltipVisible}
                useInteractionManager={true}
                placement='top'
                content={<ScheduledPostTooltip onClose={onCloseScheduledPostTooltip}/>}
                onClose={onCloseScheduledPostTooltip}
                tooltipStyle={style.scheduledPostTooltipStyle}
            >
                <View style={viewStyle}>
                    <CompassIcon
                        name='send'
                        size={24}
                        color={buttonColor}
                    />
                </View>
            </Tooltip>
        </TouchableWithFeedback>
    );
};

export default SendButton;
