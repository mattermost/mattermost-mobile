// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useMemo, useState} from 'react';
import {Platform, View} from 'react-native';

import FormattedText from '@components/formatted_text';
import {Screens} from '@constants';
import {useTheme} from '@context/theme';
import {useIsTablet} from '@hooks/device';
import {usePreventDoubleTap} from '@hooks/utils';
import BottomSheet from '@screens/bottom_sheet';
import {dismissBottomSheet} from '@screens/navigation';
import {FOOTER_HEIGHT} from '@screens/post_priority_picker/footer';
import ScheduledPostCoreOptions from '@screens/scheduled_post_options/core_options';
import {logDebug} from '@utils/log';
import {showScheduledPostCreationErrorSnackbar} from '@utils/snack_bar';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';
import {getTimezone} from '@utils/user';

import ScheduledPostFooter from './footer';

import type {BottomSheetFooterProps} from '@gorhom/bottom-sheet';

const OPTIONS_PADDING = 12;
const OPTIONS_SEPARATOR_HEIGHT = 1;
const TITLE_HEIGHT = 54;
const ITEM_HEIGHT = 48;

export const SCHEDULED_POST_OPTIONS_BUTTON = 'close-scheduled-post-options';

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {
        backgroundColor: theme.centerChannelBg,
        height: 200,
    },
    titleContainer: {
        alignItems: 'center',
        flexDirection: 'row',
    },
    title: {
        color: theme.centerChannelColor,
        ...typography('Heading', 600, 'SemiBold'),
    },
    optionsContainer: {
        paddingTop: OPTIONS_PADDING,
    },
    optionsSeparator: {
        backgroundColor: changeOpacity(theme.centerChannelColor, 0.08),
        height: OPTIONS_SEPARATOR_HEIGHT,
    },
    errorText: {
        color: theme.errorTextColor,
        ...typography('Heading', 25),
    },
}));

type Props = {
    currentUserTimezone?: UserTimezone | null;
    onSchedule: (schedulingInfo: SchedulingInfo) => Promise<void | {data?: boolean; error?: unknown}>;
}

export function ScheduledPostOptions({currentUserTimezone, onSchedule}: Props) {
    const isTablet = useIsTablet();
    const theme = useTheme();
    const [isScheduling, setIsScheduling] = useState(false);
    const [selectedTime, setSelectedTime] = useState<string | null>(null);
    const [customTimeSelected, setCustomTimeSelected] = useState(false);
    const [isError, setIsError] = useState(false);
    const userTimezone = getTimezone(currentUserTimezone);

    const style = getStyleSheet(theme);

    const snapPoints = useMemo(() => {
        const bottomSheetAdjust = Platform.select({ios: 5, default: 20});

        // 9 items to display inline date-time picker, 4 items otherwise
        const iosNumberOfItems = customTimeSelected ? 9 : 4;
        const andriodNumberOfItems = customTimeSelected ? 4 : 3;
        const numberOfItems = Platform.select({ios: iosNumberOfItems, default: andriodNumberOfItems});
        const COMPONENT_HEIGHT = TITLE_HEIGHT + (numberOfItems * ITEM_HEIGHT) + FOOTER_HEIGHT + bottomSheetAdjust;
        return [1, COMPONENT_HEIGHT];
    }, [customTimeSelected]);

    const onSelectTime = useCallback((selectedValue: string) => {
        setIsError(false);
        setSelectedTime(selectedValue);
    }, []);

    const handleOnSchedule = usePreventDoubleTap(useCallback(async () => {
        if (!selectedTime) {
            setIsError(true);
            logDebug('ScheduledPostOptions', 'No time selected');
            return;
        }

        setIsError(false);
        setIsScheduling(true);
        const schedulingInfo: SchedulingInfo = {
            scheduled_at: parseInt(selectedTime, 10),
        };

        const response = await onSchedule(schedulingInfo);
        setIsScheduling(false);

        if (response?.error) {
            const errorMessage = response.error as string;
            showScheduledPostCreationErrorSnackbar(errorMessage);
            return;
        }
        dismissBottomSheet();
    }, [onSchedule, selectedTime]));

    const renderContent = () => {
        return (
            <View style={style.container}>
                {
                    !isTablet &&
                    <View style={style.titleContainer}>
                        <FormattedText
                            id='scheduled_post.picker.title'
                            defaultMessage='Schedule draft'
                            style={style.title}
                        />
                    </View>
                }
                <View style={style.optionsContainer}>
                    <ScheduledPostCoreOptions
                        userTimezone={userTimezone}
                        onSelectOption={onSelectTime}
                        onCustomTimeSelected={setCustomTimeSelected}
                    />
                </View>
                {isError &&
                    <FormattedText
                        id='scheduled_post_no_select_time'
                        defaultMessage={'Please select the time'}
                        style={style.errorText}
                    />
                }
            </View>
        );
    };

    const renderFooter = (props: BottomSheetFooterProps) => (
        <ScheduledPostFooter
            {...props}
            onSchedule={handleOnSchedule}
            isScheduling={isScheduling}
        />
    );

    return (
        <BottomSheet
            renderContent={renderContent}
            componentId={Screens.SCHEDULED_POST_OPTIONS}
            closeButtonId={SCHEDULED_POST_OPTIONS_BUTTON}
            snapPoints={snapPoints}
            testID='scheduled_post_options_bottom_sheet'
            footerComponent={renderFooter}
        />
    );
}
