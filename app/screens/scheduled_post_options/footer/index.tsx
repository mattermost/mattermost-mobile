// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {BottomSheetFooter, type BottomSheetFooterProps} from '@gorhom/bottom-sheet';
import React from 'react';
import {useIntl} from 'react-intl';

import {BottomSheetButton} from '@screens/bottom_sheet';

const BUTTON_PADDING = 6;
const FOOTER_PADDING = 20;
const TEXT_HEIGHT = 24; // typography 200 line height
export const FOOTER_HEIGHT = (FOOTER_PADDING * 2) + (BUTTON_PADDING * 2) + TEXT_HEIGHT;

type Props = BottomSheetFooterProps & {
    onSchedule: () => void;
    isScheduling: boolean;
}

function ScheduledPostFooter({onSchedule, isScheduling, ...props}: Props) {
    const intl = useIntl();

    const buttonText = isScheduling ? intl.formatMessage({id: 'scheduled_post_options.confirm_button.processing.text', defaultMessage: 'Scheduling'}) : intl.formatMessage({id: 'scheduled_post_options.confirm_button.text', defaultMessage: 'Schedule Draft'});

    return (
        <BottomSheetFooter {...props}>
            <BottomSheetButton
                onPress={onSchedule}
                disabled={isScheduling}
                isIconOnTheRight={true}
                text={buttonText}
                showLoader={isScheduling}
                testID='scheduled_post_create_button'
            />
        </BottomSheetFooter>
    );
}

export default ScheduledPostFooter;
