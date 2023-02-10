// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useMemo, useState} from 'react';
import {useIntl} from 'react-intl';
import {TextInput, View} from 'react-native';
import Animated, {FadeIn, FadeOut} from 'react-native-reanimated';

import {typography} from '@app/utils/typography';
import {useTheme} from '@context/theme';
import {changeOpacity, getKeyboardAppearanceFromTheme, makeStyleSheetFromTheme} from '@utils/theme';

import SettingItem from '../settings/setting_item';
import SettingOption from '../settings/setting_option';
import SettingSeparator from '../settings/settings_separator';

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        container: {
            display: 'flex',
            marginBottom: 20,
        },
        addToChannelsContainer: {
            marginLeft: 4,
        },
        customMessage: {
            marginHorizontal: 20,
            marginTop: 8,
        },
        customMessageInput: {
            height: 121,
            backgroundColor: 'transparent',
            ...typography('Body', 200, 'Regular'),
            lineHeight: 20,
            color: theme.centerChannelColor,
            borderWidth: 1,
            borderColor: changeOpacity(theme.centerChannelColor, 0.16),
            borderRadius: 4,
            paddingTop: 12,
            paddingBottom: 12,
            paddingHorizontal: 16,
        },
        customMessageInputPlaceholder: {
            color: changeOpacity(theme.centerChannelColor, 0.64),
        },
    };
});

type SelectionInviteAsProps = {
    guestEnabled: boolean;
    selectedChannelsCount: number;
    customMessageEnabled?: boolean;
    customMessage?: string;
    canChange?: boolean;
    onGuestChange: (enabled: boolean) => void;
    onSelectChannels: () => void;
    onCustomMessageToggleChange: (enabled: boolean) => void;
    onCustomMessageInputFocus: () => void;
    onCustomMessageChange: (customMessage: string) => void;
}

export default function SelectionInviteAs({
    guestEnabled,
    selectedChannelsCount,
    customMessageEnabled,
    customMessage,
    canChange = true,
    onGuestChange,
    onSelectChannels,
    onCustomMessageToggleChange,
    onCustomMessageInputFocus,
    onCustomMessageChange,
}: SelectionInviteAsProps) {
    const {formatMessage} = useIntl();
    const theme = useTheme();
    const styles = getStyleSheet(theme);

    const [isCustomMessageInputFocused, setIsCustomMessageInputFocused] = useState(false);

    const handleOnCustomMessageInputFocus = () => {
        setIsCustomMessageInputFocused(true);
        onCustomMessageInputFocus();
    };

    const handleOnCustomMessageInputBlur = () => {
        setIsCustomMessageInputFocused(false);
    };

    const customMessageInputStyle = useMemo(() => {
        const style = [];

        style.push(styles.customMessageInput);

        if (isCustomMessageInputFocused) {
            style.push({
                borderWidth: 2,
                borderColor: theme.buttonBg,
            });
        }

        return style;
    }, [isCustomMessageInputFocused, styles]);

    return (
        <View style={styles.container}>
            <SettingSeparator/>
            <SettingOption
                type='toggle'
                label={formatMessage({id: 'invite.invite_as.guest.label', defaultMessage: 'Invite as guest'})}
                description={formatMessage({id: 'invite.invite_as.guest.description', defaultMessage: 'Guests are limited to selected channels'})}
                action={onGuestChange}
                selected={guestEnabled}
                toggleItemProps={{disabled: !canChange}}
                testID='invite.invite_as.guest_toggle'
            />
            {guestEnabled && (
                <Animated.View
                    entering={FadeIn.duration(200)}
                    exiting={FadeOut.duration(200)}
                >
                    <View style={styles.addToChannelsContainer}>
                        <SettingItem
                            optionName='timezone'
                            onPress={onSelectChannels}
                            label={formatMessage({id: 'invite.invite_as.add_to_channels', defaultMessage: 'Add to channels'})}
                            info={selectedChannelsCount ? (
                                formatMessage(
                                    {id: 'invite.invite_as.channels_count', defaultMessage: '{count} {count, plural, one {channel} other {channels}}'},
                                    {count: selectedChannelsCount},
                                )
                            ) : (
                                formatMessage({id: 'invite.invite_as.required_for_guests', defaultMessage: 'Required for guests'})
                            )}
                            iconColor={changeOpacity(theme.centerChannelColor, 0.64)}
                            destructive={!selectedChannelsCount}
                            separator={false}
                            testID='invite.invite_as.add_to_channels_item'
                        />
                    </View>
                    <SettingOption
                        type='toggle'
                        icon='message-text-outline'
                        label={formatMessage({id: 'invite.invite_as.set_custom_message', defaultMessage: 'Set a custom message'})}
                        action={onCustomMessageToggleChange}
                        selected={customMessageEnabled}
                        testID='invite.invite_as.custom_message_toggle'
                    />
                    {customMessageEnabled && (
                        <Animated.View
                            style={styles.customMessage}
                            entering={FadeIn.duration(200)}
                            exiting={FadeOut.duration(200)}
                        >
                            <TextInput
                                autoFocus={true}
                                autoCorrect={false}
                                autoCapitalize={'none'}
                                disableFullscreenUI={true}
                                enablesReturnKeyAutomatically={true}
                                multiline={true}
                                style={customMessageInputStyle}
                                placeholder={formatMessage({id: 'invite.invite_as.custom_message_placeholder', defaultMessage: 'Enter a custom message…'})}
                                placeholderTextColor={styles.customMessageInputPlaceholder.color}
                                onChangeText={onCustomMessageChange}
                                onFocus={handleOnCustomMessageInputFocus}
                                onBlur={handleOnCustomMessageInputBlur}
                                keyboardAppearance={getKeyboardAppearanceFromTheme(theme)}
                                value={customMessage}
                                pointerEvents='auto'
                                underlineColorAndroid='transparent'
                                testID='invite.invite_as.custom_message_input'
                            />
                        </Animated.View>
                    )}
                </Animated.View>
            )}
        </View>
    );
}
