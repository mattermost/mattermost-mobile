// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useMemo, useState} from 'react';
import {useIntl} from 'react-intl';
import {Platform, View} from 'react-native';

import FormattedText from '@components/formatted_text';
import {getItemHeightWithDescription} from '@components/option_item';
import {ITEM_HEIGHT} from '@components/slide_up_panel_item';
import {Screens} from '@constants';
import {PostPriorityColors, PostPriorityType} from '@constants/post';
import {useTheme} from '@context/theme';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import {useIsTablet} from '@hooks/device';
import useNavButtonPressed from '@hooks/navigation_button_pressed';
import BottomSheet from '@screens/bottom_sheet';
import {dismissBottomSheet} from '@screens/navigation';
import {bottomSheetSnapPoint} from '@utils/helpers';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import PickerOption from './components/picker_option';
import Footer, {FOOTER_HEIGHT} from './footer';
import {labels} from './utils';

import type {BottomSheetFooterProps} from '@gorhom/bottom-sheet';
import type {AvailableScreens} from '@typings/screens/navigation';

type Props = {
    componentId: AvailableScreens;
    isPostAcknowledgementEnabled: boolean;
    isPersistenNotificationsEnabled: boolean;
    postPriority: PostPriority;
    updatePostPriority: (data: PostPriority) => void;
    closeButtonId: string;
    persistentNotificationInterval: number;
};

const TITLE_HEIGHT = 30; // typography 600 line height
const OPTIONS_PADDING = 12;
const OPTIONS_SEPARATOR_HEIGHT = 1;
const TOGGLE_OPTION_MARGIN_TOP = 16;

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {
        backgroundColor: theme.centerChannelBg,
    },
    titleContainer: {
        alignItems: 'center',
        flexDirection: 'row',
    },
    title: {
        color: theme.centerChannelColor,
        ...typography('Heading', 600, 'SemiBold'),
    },
    betaContainer: {
        backgroundColor: PostPriorityColors.IMPORTANT,
        borderRadius: 4,
        paddingHorizontal: 4,
        marginLeft: 8,
    },
    beta: {
        color: '#fff',
        ...typography('Body', 25, 'SemiBold'),
    },

    optionsContainer: {
        paddingTop: OPTIONS_PADDING,
    },

    optionsSeparator: {
        backgroundColor: changeOpacity(theme.centerChannelColor, 0.08),
        height: OPTIONS_SEPARATOR_HEIGHT,
    },

    toggleOptionContainer: {
        marginTop: TOGGLE_OPTION_MARGIN_TOP,
    },
}));

const PostPriorityPicker = ({
    componentId,
    isPostAcknowledgementEnabled,
    isPersistenNotificationsEnabled,
    persistentNotificationInterval,
    postPriority,
    updatePostPriority,
    closeButtonId,
}: Props) => {
    const intl = useIntl();
    const isTablet = useIsTablet();
    const theme = useTheme();
    const [data, setData] = useState<PostPriority>(postPriority);

    const style = getStyleSheet(theme);

    const closeBottomSheet = useCallback(() => {
        return dismissBottomSheet(Screens.POST_PRIORITY_PICKER);
    }, []);

    useNavButtonPressed(closeButtonId, componentId, closeBottomSheet, []);
    useAndroidHardwareBackHandler(componentId, closeBottomSheet);

    const displayPersistentNotifications = isPersistenNotificationsEnabled && data.priority === PostPriorityType.URGENT;

    const snapPoints = useMemo(() => {
        const paddingBottom = 10;
        const bottomSheetAdjust = Platform.select({ios: 5, default: 20});
        let COMPONENT_HEIGHT = TITLE_HEIGHT + OPTIONS_PADDING + FOOTER_HEIGHT + bottomSheetSnapPoint(3, ITEM_HEIGHT) + paddingBottom + bottomSheetAdjust;

        if (isPostAcknowledgementEnabled) {
            COMPONENT_HEIGHT += OPTIONS_SEPARATOR_HEIGHT + TOGGLE_OPTION_MARGIN_TOP + getItemHeightWithDescription(2);
            if (displayPersistentNotifications) {
                COMPONENT_HEIGHT += OPTIONS_SEPARATOR_HEIGHT + TOGGLE_OPTION_MARGIN_TOP + getItemHeightWithDescription(2);
            }
        }

        return [1, COMPONENT_HEIGHT];
    }, [displayPersistentNotifications, isPostAcknowledgementEnabled]);

    const handleUpdatePriority = useCallback((priority: PostPriority['priority']) => {
        setData((prevData) => ({
            ...prevData,
            priority,
            persistent_notifications: undefined, // Uncheck if checked already
        }));
    }, []);

    const handleUpdateRequestedAck = useCallback((requested_ack: boolean) => {
        setData((prevData) => ({...prevData, requested_ack}));
    }, []);

    const handleUpdatePersistentNotifications = useCallback((persistent_notifications: boolean) => {
        setData((prevData) => ({...prevData, persistent_notifications}));
    }, []);

    const handleSubmit = useCallback(() => {
        updatePostPriority(data);
        closeBottomSheet();
    }, [closeBottomSheet, data, updatePostPriority]);

    const renderContent = () => (
        <View style={style.container}>
            {!isTablet &&
                <View style={style.titleContainer}>
                    <FormattedText
                        id='post_priority.picker.title'
                        defaultMessage='Message priority'
                        style={style.title}
                    />
                    <View style={style.betaContainer}>
                        <FormattedText
                            id='post_priority.picker.beta'
                            defaultMessage='BETA'
                            style={style.beta}
                        />
                    </View>
                </View>
            }
            <View style={style.optionsContainer}>
                <PickerOption
                    action={handleUpdatePriority}
                    icon='message-text-outline'
                    label={intl.formatMessage(labels.standard.label)}
                    selected={data.priority === ''}
                    value={PostPriorityType.STANDARD}
                />
                <PickerOption
                    action={handleUpdatePriority}
                    icon='alert-circle-outline'
                    iconColor={PostPriorityColors.IMPORTANT}
                    label={intl.formatMessage(labels.important.label)}
                    selected={data.priority === PostPriorityType.IMPORTANT}
                    value={PostPriorityType.IMPORTANT}
                />
                <PickerOption
                    action={handleUpdatePriority}
                    icon='alert-outline'
                    iconColor={PostPriorityColors.URGENT}
                    label={intl.formatMessage(labels.urgent.label)}
                    selected={data.priority === PostPriorityType.URGENT}
                    value={PostPriorityType.URGENT}
                />
                {(isPostAcknowledgementEnabled) && (
                    <>
                        <View style={style.optionsSeparator}/>
                        <View style={style.toggleOptionContainer}>
                            <PickerOption
                                action={handleUpdateRequestedAck}
                                label={intl.formatMessage(labels.requestAck.label)}
                                description={intl.formatMessage(labels.requestAck.description)}
                                icon='check-circle-outline'
                                type='toggle'
                                selected={data.requested_ack}
                                descriptionNumberOfLines={2}
                                value='requested_ack'
                            />
                        </View>
                        {displayPersistentNotifications && (
                            <View style={style.toggleOptionContainer}>
                                <PickerOption
                                    action={handleUpdatePersistentNotifications}
                                    label={intl.formatMessage(labels.persistentNotifications.label)}
                                    description={intl.formatMessage(
                                        labels.persistentNotifications.description,
                                        {
                                            interval: persistentNotificationInterval,
                                        },
                                    )}
                                    icon='bell-ring-outline'
                                    type='toggle'
                                    selected={data.persistent_notifications}
                                    descriptionNumberOfLines={2}
                                    value='persistent_notifications'
                                />
                            </View>
                        )}
                    </>
                )}
            </View>
        </View>
    );

    const renderFooter = (props: BottomSheetFooterProps) => (
        <Footer
            {...props}
            onCancel={closeBottomSheet}
            onSubmit={handleSubmit}
        />
    );

    return (
        <BottomSheet
            renderContent={renderContent}
            closeButtonId={closeButtonId}
            componentId={Screens.POST_PRIORITY_PICKER}
            footerComponent={renderFooter}
            initialSnapIndex={1}
            snapPoints={snapPoints}
            testID='post_options'
        />
    );
};

export default PostPriorityPicker;
