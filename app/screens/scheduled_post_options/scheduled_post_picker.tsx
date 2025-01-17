// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useMemo} from 'react';
import {Platform, View} from 'react-native';

import FormattedText from '@components/formatted_text';
import {Screens} from '@constants';
import {useTheme} from '@context/theme';
import {useIsTablet} from '@hooks/device';
import BottomSheet from '@screens/bottom_sheet';
import ScheduledPostCoreOptions from '@screens/scheduled_post_options/core_options';
import ScheduledPostCustomOption from '@screens/scheduled_post_options/custom_option';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import type UserModel from '@typings/database/models/servers/user';
import {getTimezone} from "@utils/user";
import type {BottomSheetFooterProps} from "@gorhom/bottom-sheet";
import Footer from "@screens/post_priority_picker/footer";

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
}));

type Props = {
    currentUser?: UserModel;
    serverUrl: string;
}

export function ScheduledPostOptions({currentUser}: Props) {
    const isTablet = useIsTablet();
    const theme = useTheme();

    const userTimezone = getTimezone(currentUser?.timezone);

    const style = getStyleSheet(theme);

    const snapPoints = useMemo(() => {
        const bottomSheetAdjust = Platform.select({ios: 5, default: 20});

        // we'll have 4 items max in here - max two for core options,
        // one for custom option and max one for user's previously selected option.
        const numberOfItems = 8;
        const COMPONENT_HEIGHT = TITLE_HEIGHT + (numberOfItems * ITEM_HEIGHT) + bottomSheetAdjust;
        return [1, COMPONENT_HEIGHT];
    }, []);

    const onSelectTime = useCallback((selectedTime: string) => {
        console.log({selectedTime});
    }, []);

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
                    />
                    <View style={style.optionsSeparator}/>
                    <ScheduledPostCustomOption
                        userTimezone={userTimezone}
                    />
                </View>
            </View>
        );
    };

    const renderFooter = (props: BottomSheetFooterProps) => (
        <Footer
            {...props}
            // onCancel={closeBottomSheet}
            onSubmit={() => {}}
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
