// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {useIntl} from 'react-intl';
import {Pressable, type StyleProp, Text, type TextStyle, View, type ViewStyle} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {setPreferredAudioRoute} from '@calls/actions/calls';
import {AudioDevice, type CurrentCall} from '@calls/types/calls';
import CompassIcon from '@components/compass_icon';
import SlideUpPanelItem, {ITEM_HEIGHT} from '@components/slide_up_panel_item';
import {Device} from '@constants';
import {useTheme} from '@context/theme';
import {bottomSheet, dismissBottomSheet} from '@screens/navigation';
import {bottomSheetSnapPoint} from '@utils/helpers';
import {makeStyleSheetFromTheme} from '@utils/theme';

type Props = {
    pressableStyle: StyleProp<ViewStyle>;
    iconStyle: StyleProp<ViewStyle>;
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
    const {bottom} = useSafeAreaInsets();
    const isTablet = Device.IS_TABLET; // not `useIsTablet` because even if we're in splitView, we're still using a tablet.
    const color = theme.awayIndicator;
    const audioDeviceInfo = currentCall.audioDeviceInfo;
    const phoneLabel = intl.formatMessage({id: 'mobile.calls_phone', defaultMessage: 'Phone'});
    const tabletLabel = intl.formatMessage({id: 'mobile.calls_tablet', defaultMessage: 'Tablet'});
    const speakerLabel = intl.formatMessage({id: 'mobile.calls_speaker', defaultMessage: 'SpeakerPhone'});
    const bluetoothLabel = intl.formatMessage({id: 'mobile.calls_bluetooth', defaultMessage: 'Bluetooth'});
    const headsetLabel = intl.formatMessage({id: 'mobile.calls_headset', defaultMessage: 'Headset'});

    const deviceSelector = useCallback(() => {
        const currentDevice = audioDeviceInfo.selectedAudioDevice;
        let available = audioDeviceInfo.availableAudioDeviceList;
        if (available.includes(AudioDevice.WiredHeadset)) {
            available = available.filter((d) => d !== AudioDevice.Earpiece);
        }
        const selectDevice = (device: AudioDevice) => {
            setPreferredAudioRoute(device);
            dismissBottomSheet();
        };

        const renderContent = () => {
            return (
                <View>
                    {available.includes(AudioDevice.Earpiece) && isTablet &&
                        <SlideUpPanelItem
                            leftIcon={'tablet'}
                            onPress={() => selectDevice(AudioDevice.Earpiece)}
                            text={tabletLabel}
                            rightIcon={currentDevice === AudioDevice.Earpiece ? 'check' : undefined}
                            rightIconStyles={currentDevice === AudioDevice.Earpiece ? style.checkIcon : {}}
                        />
                    }
                    {available.includes(AudioDevice.Earpiece) && !isTablet &&
                        <SlideUpPanelItem
                            leftIcon={'cellphone'}
                            onPress={() => selectDevice(AudioDevice.Earpiece)}
                            text={phoneLabel}
                            rightIcon={currentDevice === AudioDevice.Earpiece ? 'check' : undefined}
                            rightIconStyles={currentDevice === AudioDevice.Earpiece ? style.checkIcon : {}}
                        />
                    }
                    {available.includes(AudioDevice.Speakerphone) &&
                        <SlideUpPanelItem
                            leftIcon={'volume-high'}
                            onPress={() => selectDevice(AudioDevice.Speakerphone)}
                            text={speakerLabel}
                            rightIcon={currentDevice === AudioDevice.Speakerphone ? 'check' : undefined}
                            rightIconStyles={currentDevice === AudioDevice.Speakerphone ? style.checkIcon : {}}
                        />
                    }
                    {available.includes(AudioDevice.Bluetooth) &&
                        <SlideUpPanelItem
                            leftIcon={'bluetooth'}
                            onPress={() => selectDevice(AudioDevice.Bluetooth)}
                            text={bluetoothLabel}
                            rightIcon={currentDevice === AudioDevice.Bluetooth ? 'check' : undefined}
                            rightIconStyles={currentDevice === AudioDevice.Bluetooth ? style.checkIcon : {}}
                        />
                    }
                    {available.includes(AudioDevice.WiredHeadset) &&
                        <SlideUpPanelItem
                            leftIcon={'headphones'}
                            onPress={() => selectDevice(AudioDevice.WiredHeadset)}
                            text={headsetLabel}
                            rightIcon={currentDevice === AudioDevice.WiredHeadset ? 'check' : undefined}
                            rightIconStyles={currentDevice === AudioDevice.WiredHeadset ? style.checkIcon : {}}
                        />
                    }
                </View>
            );
        };

        bottomSheet({
            closeButtonId: 'close-other-actions',
            renderContent,
            snapPoints: [1, bottomSheetSnapPoint(available.length + 1, ITEM_HEIGHT, bottom)],
            title: intl.formatMessage({id: 'mobile.calls_audio_device', defaultMessage: 'Select audio device'}),
            theme,
        });
    }, [setPreferredAudioRoute, audioDeviceInfo, color]);

    let icon = 'volume-high';
    let label = speakerLabel;
    switch (audioDeviceInfo.selectedAudioDevice) {
        case AudioDevice.Earpiece:
            icon = isTablet ? 'tablet' : 'cellphone';
            label = isTablet ? tabletLabel : phoneLabel;
            break;
        case AudioDevice.Bluetooth:
            icon = 'bluetooth';
            label = bluetoothLabel;
            break;
        case AudioDevice.WiredHeadset:
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
