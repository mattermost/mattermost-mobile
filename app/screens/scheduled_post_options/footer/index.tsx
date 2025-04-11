// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {BottomSheetFooter, type BottomSheetFooterProps} from '@gorhom/bottom-sheet';
import {Button} from '@rneui/base';
import React from 'react';
import {useIntl} from 'react-intl';
import {Platform, View} from 'react-native';

import {useTheme} from '@context/theme';
import {useIsTablet} from '@hooks/device';
import Updating from '@screens/edit_profile/components/updating';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

const BUTTON_PADDING = 6;
const FOOTER_PADDING = 20;
const FOOTER_PADDING_BOTTOM_TABLET_ADJUST = 20;
const TEXT_HEIGHT = 24; // typography 200 line height
export const FOOTER_HEIGHT = (FOOTER_PADDING * 2) + (BUTTON_PADDING * 2) + TEXT_HEIGHT;

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {
        backgroundColor: theme.centerChannelBg,
        borderTopColor: changeOpacity(theme.centerChannelColor, 0.16),
        borderTopWidth: 1,
        paddingTop: FOOTER_PADDING,
        flexDirection: 'row',
        paddingHorizontal: 20,
        width: '100%',
    },
    cancelButton: {
        alignItems: 'center',
        backgroundColor: changeOpacity(theme.buttonBg, 0.08),
        borderRadius: 4,
        flex: 1,
        paddingVertical: BUTTON_PADDING,
    },
    cancelButtonText: {
        color: theme.buttonBg,
        ...typography('Body', 200, 'SemiBold'),
    },
    applyButton: {
        alignItems: 'center',
        backgroundColor: theme.buttonBg,
        borderRadius: 4,
        paddingVertical: BUTTON_PADDING,
        width: '100%',
    },
    disabledApplyButton: {
        backgroundColor: changeOpacity(theme.centerChannelColor, 0.08),
    },
    applyButtonText: {
        color: theme.buttonColor,
        ...typography('Body', 200, 'SemiBold'),
    },
    applyButtonProcessingText: {
        color: changeOpacity(theme.centerChannelColor, 0.32),
        ...typography('Body', 200, 'SemiBold'),
    },
    schedulingButtonContentWrapper: {
        position: 'relative',
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        height: '100%',
        gap: 12,
    },
    spinner: {
        position: 'relative',
    },
    updatingIcon: {
        position: 'relative',
        height: '100%',
        width: 20,
        marginLeft: 8,
    },
    containerStyle: {
        flex: 1,
    },
    disabledContainerStyle: {
        backgroundColor: changeOpacity(theme.centerChannelColor, 0.08),
    },
}));

type Props = BottomSheetFooterProps & {
    onSchedule: () => void;
    isScheduling: boolean;
}

function ScheduledPostFooter({onSchedule, isScheduling, ...props}: Props) {
    const theme = useTheme();
    const style = getStyleSheet(theme);
    const isTablet = useIsTablet();

    const intl = useIntl();

    const buttonText = isScheduling ? intl.formatMessage({id: 'scheduled_post_options.confirm_button.processing.text', defaultMessage: 'Scheduling'}) : intl.formatMessage({id: 'scheduled_post_options.confirm_button.text', defaultMessage: 'Schedule Draft'});

    const icon = (
        <View style={style.updatingIcon}>
            <Updating/>
        </View>
    );

    const footer = (
        <View
            style={[style.container, {
                paddingBottom: Platform.select({ios: (isTablet ? FOOTER_PADDING_BOTTOM_TABLET_ADJUST : 0), default: FOOTER_PADDING}),
            }]}
        >
            <Button
                testID='scheduled_post_create_button'
                title={buttonText}
                onPress={onSchedule}
                disabled={isScheduling}
                icon={isScheduling ? icon : undefined}
                iconRight={true}
                color={isScheduling ? changeOpacity(theme.centerChannelColor, 0.08) : theme.buttonBg}
                style={[style.applyButton, isScheduling && style.disabledApplyButton]}
                containerStyle={[style.containerStyle, isScheduling && style.disabledContainerStyle]}
                titleStyle={[style.applyButtonText, isScheduling && style.applyButtonProcessingText]}
            />
        </View>
    );

    if (isTablet) {
        return footer;
    }
    return (
        <BottomSheetFooter {...props}>
            {footer}
        </BottomSheetFooter>
    );
}

export default ScheduledPostFooter;
