// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useMemo, useState} from 'react';
import {useIntl} from 'react-intl';
import {View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import FormattedText from '@components/formatted_text';
import {Screens} from '@constants';
import {PostPriorityColors, PostPriorityType} from '@constants/post';
import {useTheme} from '@context/theme';
import {useIsTablet} from '@hooks/device';
import useNavButtonPressed from '@hooks/navigation_button_pressed';
import BottomSheet from '@screens/bottom_sheet';
import {dismissBottomSheet} from '@screens/navigation';
import {bottomSheetSnapPoint} from '@utils/helpers';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import Footer from './footer';
import PickerOption from './picker_option';

import type {BottomSheetFooterProps} from '@gorhom/bottom-sheet';

export const POST_PRIORITY_PICKER_BUTTON = 'close-post-priority-picker';

type Props = {
    componentId: string;
    isPostAcknowledgementEnabled: boolean;
    isPersistenNotificationsEnabled: boolean;
    postPriority: PostPriority;
    updatePostPriority: (data: PostPriority) => void;
};

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
        paddingTop: 12,
    },

    optionsSeparator: {
        backgroundColor: changeOpacity(theme.centerChannelColor, 0.08),
        height: 1,
    },

    toggleOptionContainer: {
        marginTop: 16,
    },
}));

const PostPriorityPicker = ({
    componentId, isPostAcknowledgementEnabled, isPersistenNotificationsEnabled,
    postPriority, updatePostPriority,
}: Props) => {
    const {bottom} = useSafeAreaInsets();
    const intl = useIntl();
    const isTablet = useIsTablet();
    const theme = useTheme();

    const style = getStyleSheet(theme);

    const close = useCallback(() => {
        return dismissBottomSheet(Screens.POST_PRIORITY_PICKER);
    }, []);

    useNavButtonPressed(POST_PRIORITY_PICKER_BUTTON, componentId, close, []);

    const [data, setData] = useState<PostPriority>(postPriority);

    const displayPersistentNotifications = isPersistenNotificationsEnabled && data.priority === PostPriorityType.URGENT;

    const snapPoints = useMemo(() => {
        let COMPONENT_HEIGHT = 280;

        if (isPostAcknowledgementEnabled) {
            COMPONENT_HEIGHT += 75;
        }

        if (displayPersistentNotifications) {
            COMPONENT_HEIGHT += 75;
        }

        return [1, bottomSheetSnapPoint(1, COMPONENT_HEIGHT, bottom)];
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
    }, [data]);

    const handleUpdatePersistentNotifications = useCallback((persistent_notifications: boolean) => {
        setData((prevData) => ({...prevData, persistent_notifications}));
    }, [data]);

    const handleSubmit = useCallback(() => {
        updatePostPriority(data);
        close();
    }, [data]);

    const renderAcknowledgementOption = () => (
        <View style={style.toggleOptionContainer}>
            <PickerOption
                action={handleUpdateRequestedAck}
                label={
                    intl.formatMessage({
                        id: 'post_priority.picker.label.request_ack',
                        defaultMessage: 'Request acknowledgement',
                    })
                }
                description={
                    intl.formatMessage({
                        id: 'post_priority.picker.label.request_ack.description',
                        defaultMessage: 'An acknowledgement button appears with your message.',
                    })
                }
                icon='check-circle-outline'
                type='toggle'
                selected={data.requested_ack}
            />
        </View>
    );

    const renderPersistentNotificationsOption = () => (
        <View style={style.toggleOptionContainer}>
            <PickerOption
                action={handleUpdatePersistentNotifications}
                label={
                    intl.formatMessage({
                        id: 'post_priority.picker.label.persistent_notifications',
                        defaultMessage: 'Send persistent notifications',
                    })
                }
                description={
                    intl.formatMessage({
                        id: 'post_priority.picker.label.persistent_notifications.description',
                        defaultMessage: 'Recipients are notified every five minutes until they acknowledge or reply.',
                    })
                }
                icon='bell-ring-outline'
                type='toggle'
                selected={data.persistent_notifications}
            />
        </View>
    );

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
                    label={intl.formatMessage({
                        id: 'post_priority.picker.label.standard',
                        defaultMessage: 'Standard',
                    })}
                    selected={data.priority === ''}
                    value={PostPriorityType.STANDARD}
                />
                <PickerOption
                    action={handleUpdatePriority}
                    icon='alert-circle-outline'
                    iconColor={PostPriorityColors.IMPORTANT}
                    label={intl.formatMessage({
                        id: 'post_priority.picker.label.important',
                        defaultMessage: 'Important',
                    })}
                    selected={data.priority === PostPriorityType.IMPORTANT}
                    value={PostPriorityType.IMPORTANT}
                />
                <PickerOption
                    action={handleUpdatePriority}
                    icon='alert-outline'
                    iconColor={PostPriorityColors.URGENT}
                    label={intl.formatMessage({
                        id: 'post_priority.picker.label.urgent',
                        defaultMessage: 'Urgent',
                    })}
                    selected={data.priority === PostPriorityType.URGENT}
                    value={PostPriorityType.URGENT}
                />
                {(isPostAcknowledgementEnabled) && (
                    <>
                        <View style={style.optionsSeparator}/>
                        {renderAcknowledgementOption()}
                        {displayPersistentNotifications && renderPersistentNotificationsOption()}
                    </>
                )}
            </View>
        </View>
    );

    const renderFooter = (props: BottomSheetFooterProps) => (
        <Footer
            {...props}
            onCancel={close}
            onSubmit={handleSubmit}
        />
    );

    return (
        <BottomSheet
            renderContent={renderContent}
            closeButtonId={POST_PRIORITY_PICKER_BUTTON}
            componentId={Screens.POST_PRIORITY_PICKER}
            footerComponent={renderFooter}
            initialSnapIndex={1}
            snapPoints={snapPoints}
            testID='post_options'
        />
    );
};

export default React.memo(PostPriorityPicker);
