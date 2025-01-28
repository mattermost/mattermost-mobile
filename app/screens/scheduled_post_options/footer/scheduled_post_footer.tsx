// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {BottomSheetFooter, type BottomSheetFooterProps} from '@gorhom/bottom-sheet';
import React from 'react';
import {Platform, TouchableOpacity, View} from 'react-native';

import FormattedText from '@components/formatted_text';
import {useTheme} from '@context/theme';
import {useIsTablet} from '@hooks/device';
import Updating from '@screens/edit_profile/components/updating';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

const BUTTON_PADDING = 15;
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
        flex: 1,
        marginLeft: 8,
        paddingVertical: BUTTON_PADDING,
    },
    disabledApplyButton: {
        alignItems: 'center',
        borderRadius: 4,
        flex: 1,
        marginLeft: 8,
        paddingVertical: BUTTON_PADDING,
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
    },
}));

type Props = BottomSheetFooterProps & {
    onSchedule: () => void;
    isScheduling: boolean;
}

export function ScheduledPostFooter({onSchedule, isScheduling, ...props}: Props) {
    const theme = useTheme();
    const style = getStyleSheet(theme);
    const isTablet = useIsTablet();

    const footer = (
        <View
            style={[style.container, {
                paddingBottom: Platform.select({ios: (isTablet ? FOOTER_PADDING_BOTTOM_TABLET_ADJUST : 0), default: FOOTER_PADDING}),
            }]}
        >
            <TouchableOpacity
                onPress={onSchedule}
                style={isScheduling ? style.disabledApplyButton : style.applyButton}
                disabled={isScheduling}
            >
                {
                    isScheduling ? (
                        <View style={style.schedulingButtonContentWrapper}>
                            <View style={style.updatingIcon}>
                                <Updating/>
                            </View>
                            <FormattedText
                                id='scheduled_post_options.confirm_button.processing.text'
                                defaultMessage='Scheduling'
                                style={style.applyButtonProcessingText}
                            />
                        </View>
                    ) : (
                        <FormattedText
                            id='scheduled_post_options.confirm_button.text'
                            defaultMessage='Schedule Draft'
                            style={style.applyButtonText}
                        />
                    )
                }
            </TouchableOpacity>
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
