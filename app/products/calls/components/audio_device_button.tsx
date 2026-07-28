// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {useIntl} from 'react-intl';
import {Pressable, type StyleProp, Text, type TextStyle, View, type ViewStyle} from 'react-native';

import {setPreferredAudioRoute} from '@calls/actions/calls';
import {AudioDeviceValue, type AudioDevice, type CurrentCall} from '@calls/types/calls';
import CompassIcon, {type CompassIconName} from '@components/compass_icon';
import SlideUpPanelItem, {ITEM_HEIGHT} from '@components/slide_up_panel_item';
import {Device} from '@constants';
import {useTheme} from '@context/theme';
import {bottomSheet, dismissBottomSheet} from '@screens/navigation';
import {bottomSheetSnapPoint} from '@utils/helpers';
import {makeStyleSheetFromTheme} from '@utils/theme';

import {messages} from './messages';

type Props = {
    pressableStyle: StyleProp<ViewStyle>;
    iconStyle: StyleProp<TextStyle>;
    buttonTextStyle: StyleProp<TextStyle>;
    currentCall: CurrentCall;
}

const getStyleFromTheme = makeStyleSheetFromTheme((theme: Theme) => ({
    checkIcon: {
        color: theme.buttonBg,
    },
}));

export const AudioDeviceButton = ({pressableStyle, iconStyle, buttonTextStyle, currentCall}: Props) => {
    const intl = useIntl();
    const theme = useTheme();
    const style = getStyleFromTheme(theme);
    const isTablet = Device.IS_TABLET; // not `useIsTablet` because even if we're in splitView, we're still using a tablet.
    const audioDeviceInfo = currentCall.audioDeviceInfo;
    const phoneLabel = intl.formatMessage({id: 'mobile.calls_phone', defaultMessage: 'Phone'});
    const tabletLabel = intl.formatMessage({id: 'mobile.calls_tablet', defaultMessage: 'Tablet'});
    const speakerLabel = intl.formatMessage(messages.speaker);
    const bluetoothLabel = intl.formatMessage({id: 'mobile.calls_bluetooth', defaultMessage: 'Bluetooth'});
    const headsetLabel = intl.formatMessage({id: 'mobile.calls_headset', defaultMessage: 'Headset'});

    const deviceSelector = useCallback(() => {
        const currentDevice = audioDeviceInfo.selectedAudioDevice;
        let available = audioDeviceInfo.availableAudioDeviceList;
        if (available.includes(AudioDeviceValue.WiredHeadset)) {
            available = available.filter((d) => d !== AudioDeviceValue.Earpiece);
        }
        const selectDevice = (device: AudioDevice) => {
            setPreferredAudioRoute(device, true);
            dismissBottomSheet();
        };

        const renderContent = () => {
            return (
                <View>
                    {available.includes(AudioDeviceValue.Earpiece) && isTablet &&
                        <SlideUpPanelItem
                            leftIcon={'tablet'}
                            onPress={() => selectDevice(AudioDeviceValue.Earpiece)}
                            text={tabletLabel}
                            rightIcon={currentDevice === AudioDeviceValue.Earpiece ? 'check' : undefined}
                            rightIconStyles={currentDevice === AudioDeviceValue.Earpiece ? style.checkIcon : {}}
                        />
                    }
                    {available.includes(AudioDeviceValue.Earpiece) && !isTablet &&
                        <SlideUpPanelItem
                            leftIcon={'cellphone'}
                            onPress={() => selectDevice(AudioDeviceValue.Earpiece)}
                            text={phoneLabel}
                            rightIcon={currentDevice === AudioDeviceValue.Earpiece ? 'check' : undefined}
                            rightIconStyles={currentDevice === AudioDeviceValue.Earpiece ? style.checkIcon : {}}
                        />
                    }
                    {available.includes(AudioDeviceValue.Speakerphone) &&
                        <SlideUpPanelItem
                            leftIcon={'volume-high'}
                            onPress={() => selectDevice(AudioDeviceValue.Speakerphone)}
                            text={speakerLabel}
                            rightIcon={currentDevice === AudioDeviceValue.Speakerphone ? 'check' : undefined}
                            rightIconStyles={currentDevice === AudioDeviceValue.Speakerphone ? style.checkIcon : {}}
                        />
                    }
                    {available.includes(AudioDeviceValue.Bluetooth) &&
                        <SlideUpPanelItem
                            leftIcon={'bluetooth'}
                            onPress={() => selectDevice(AudioDeviceValue.Bluetooth)}
                            text={bluetoothLabel}
                            rightIcon={currentDevice === AudioDeviceValue.Bluetooth ? 'check' : undefined}
                            rightIconStyles={currentDevice === AudioDeviceValue.Bluetooth ? style.checkIcon : {}}
                        />
                    }
                    {available.includes(AudioDeviceValue.WiredHeadset) &&
                        <SlideUpPanelItem
                            leftIcon={'headphones'}
                            onPress={() => selectDevice(AudioDeviceValue.WiredHeadset)}
                            text={headsetLabel}
                            rightIcon={currentDevice === AudioDeviceValue.WiredHeadset ? 'check' : undefined}
                            rightIconStyles={currentDevice === AudioDeviceValue.WiredHeadset ? style.checkIcon : {}}
                        />
                    }
                </View>
            );
        };

        bottomSheet(renderContent, [1, bottomSheetSnapPoint(available.length + 1, ITEM_HEIGHT)]);
    }, [audioDeviceInfo.selectedAudioDevice, audioDeviceInfo.availableAudioDeviceList, isTablet, tabletLabel, style.checkIcon, phoneLabel, speakerLabel, bluetoothLabel, headsetLabel]);

    let icon: CompassIconName = 'volume-high';
    let label = speakerLabel;
    switch (audioDeviceInfo.selectedAudioDevice) {
        case AudioDeviceValue.Earpiece:
            icon = isTablet ? 'tablet' : 'cellphone';
            label = isTablet ? tabletLabel : phoneLabel;
            break;
        case AudioDeviceValue.Bluetooth:
            icon = 'bluetooth';
            label = bluetoothLabel;
            break;
        case AudioDeviceValue.WiredHeadset:
            icon = 'headphones';
            label = headsetLabel;
            break;
    }

    return (
        <Pressable
            style={pressableStyle}
            onPress={deviceSelector}
        >
            <CompassIcon
                name={icon}
                size={32}
                style={iconStyle}
            />
            <Text style={buttonTextStyle}>{label}</Text>
        </Pressable>
    );
};
