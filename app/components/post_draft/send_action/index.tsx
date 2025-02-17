// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {InteractionManager, View} from 'react-native';
import Tooltip from 'react-native-walkthrough-tooltip';

import {storeScheduledPostTutorial} from '@actions/app/global';
import CompassIcon from '@components/compass_icon';
import ScheduledPostTooltip from '@components/post_draft/send_action/scheudled_post_tooltip';
import TouchableWithFeedback from '@components/touchable_with_feedback';
import {Tutorial} from '@constants';
import {useTheme} from '@context/theme';
import {usePreventDoubleTap} from '@hooks/utils';
import {observeTutorialWatched} from '@queries/app/global';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

type Props = {
    testID: string;
    disabled: boolean;
    sendMessage: () => void;
    showScheduledPostOptions: () => void;
    scheduledPostFeatureTooltipWatched: boolean;
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
            width: 250,
            height: 140,
        },
    };
});

function SendButton({
    testID,
    disabled,
    sendMessage,
    showScheduledPostOptions,
    scheduledPostFeatureTooltipWatched,
}: Props) {
    const theme = useTheme();
    const sendButtonTestID = disabled ? `${testID}.send.button.disabled` : `${testID}.send.button`;
    const style = getStyleSheet(theme);

    const [scheduledPostTooltipVisible, setScheduledPostTooltipVisible] = useState(false);

    useEffect(() => {
        if (scheduledPostFeatureTooltipWatched) {
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

    const viewStyle = useMemo(() => {
        if (disabled) {
            return [style.sendButton, style.disableButton];
        }
        return style.sendButton;
    }, [disabled, style]);

    const buttonColor = disabled ? changeOpacity(theme.buttonColor, 0.5) : theme.buttonColor;

    const sendMessageWithDoubleTapPrevention = usePreventDoubleTap(sendMessage);

    return (
        <TouchableWithFeedback
            testID={sendButtonTestID}
            onPress={sendMessageWithDoubleTapPrevention}
            style={style.sendButtonContainer}
            type={'opacity'}
            disabled={disabled}
            onLongPress={showScheduledPostOptions}
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
}

const enhanced = withObservables([], () => {
    const scheduledPostFeatureTooltipWatched = observeTutorialWatched(Tutorial.SCHEDULED_POST);

    return {
        scheduledPostFeatureTooltipWatched,
    };
});

export default withDatabase(enhanced((SendButton)));
