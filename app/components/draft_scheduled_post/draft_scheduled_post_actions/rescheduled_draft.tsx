// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';

import CompassIcon from '@components/compass_icon';
import FormattedText from '@components/formatted_text';
import TouchableWithFeedback from '@components/touchable_with_feedback';
import {Screens} from '@constants';
import {ICON_SIZE} from '@constants/post_draft';
import {useTheme} from '@context/theme';
import {dismissBottomSheet, navigateToScreen} from '@utils/navigation/adapter';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

type Props = {
    draftId: string;
}

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    title: {
        color: theme.centerChannelColor,
        ...typography('Body', 200),
    },
    rescheduledContainer: {
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        paddingVertical: 12,
    },
}));

const RescheduledDraft: React.FC<Props> = ({draftId}) => {
    const theme = useTheme();
    const style = getStyleSheet(theme);
    const rescheduledDraft = useCallback(async () => {
        await dismissBottomSheet();
        navigateToScreen(Screens.RESCHEDULE_DRAFT, {draftId});
    }, [draftId]);

    return (
        <TouchableWithFeedback
            type={'opacity'}
            style={style.rescheduledContainer}
            onPress={rescheduledDraft}
            testID='rescheduled_draft'
        >
            <CompassIcon
                name='clock-send-outline'
                size={ICON_SIZE}
                color={changeOpacity(theme.centerChannelColor, 0.56)}
            />
            <FormattedText
                id='draft.options.reschedule.title'
                defaultMessage={'Reschedule'}
                style={style.title}
            />
        </TouchableWithFeedback>
    );
};

export default RescheduledDraft;
