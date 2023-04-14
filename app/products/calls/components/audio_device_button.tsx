// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {useIntl} from 'react-intl';
import {Platform, Pressable, Text, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {setPreferredAudioRoute, setSpeakerphoneOn} from '@calls/actions/calls';
import {AudioDevice, CurrentCall} from '@calls/types/calls';
import CompassIcon from '@components/compass_icon';
import SlideUpPanelItem, {ITEM_HEIGHT} from '@components/slide_up_panel_item';
import {useTheme} from '@context/theme';
import {bottomSheet, dismissBottomSheet} from '@screens/navigation';
import {bottomSheetSnapPoint} from '@utils/helpers';
import {typography} from '@utils/typography';

type Props = {
    style: any;
    isLandscape: boolean;
    currentCall: CurrentCall;
}

export const AudioDeviceButton = ({style, isLandscape, currentCall}: Props) => {
    const intl = useIntl();
    const theme = useTheme();
    const {bottom} = useSafeAreaInsets();
    const bold = typography('Body', 200, 'SemiBold');
    const color = theme.awayIndicator;
    const audioDeviceInfo = currentCall.audioDeviceInfo;
    const earpieceLabel = intl.formatMessage({id: 'mobile.calls_earpiece', defaultMessage: 'Earpiece'});
    const speakerLabel = intl.formatMessage({id: 'mobile.calls_speaker', defaultMessage: 'SpeakerPhone'});
    const bluetoothLabel = intl.formatMessage({id: 'mobile.calls_bluetooth', defaultMessage: 'Bluetooth'});

    const deviceSelector = useCallback(async () => {
        const currentDevice = audioDeviceInfo.selectedAudioDevice;
        const available = audioDeviceInfo.availableAudioDeviceList;
        const selectDevice = (device: AudioDevice) => {
            setPreferredAudioRoute(device);
            dismissBottomSheet();
        };

        const renderContent = () => {
            return (
                <View>
                    {available.includes(AudioDevice.Earpiece) &&
                        <SlideUpPanelItem
                            icon={'phone-in-talk'}
                            onPress={() => selectDevice(AudioDevice.Earpiece)}
                            text={earpieceLabel}
                            textStyles={currentDevice === AudioDevice.Earpiece ? {...bold, color} : {}}
                        />
                    }
                    {available.includes(AudioDevice.Speakerphone) &&
                        <SlideUpPanelItem
                            icon={'volume-high'}
                            onPress={() => selectDevice(AudioDevice.Speakerphone)}
                            text={speakerLabel}
                            textStyles={currentDevice === AudioDevice.Speakerphone ? {...bold, color} : {}}
                        />
                    }
                    {available.includes(AudioDevice.Bluetooth) &&
                        <SlideUpPanelItem
                            icon={'cellphone'}
                            onPress={() => selectDevice(AudioDevice.Bluetooth)}
                            text={bluetoothLabel}
                            textStyles={currentDevice === AudioDevice.Bluetooth ? {...bold, color} : {}}
                        />
                    }
                </View>
            );
        };

        await bottomSheet({
            closeButtonId: 'close-other-actions',
            renderContent,
            snapPoints: [1, bottomSheetSnapPoint(audioDeviceInfo.availableAudioDeviceList.length + 1, ITEM_HEIGHT, bottom)],
            title: intl.formatMessage({id: 'mobile.calls_output_options', defaultMessage: 'Choose preferred output'}),
            theme,
        });
    }, [setPreferredAudioRoute, audioDeviceInfo, bold, color]);

    const toggleSpeakerPhone = useCallback(() => {
        setSpeakerphoneOn(!currentCall?.speakerphoneOn);
    }, [currentCall?.speakerphoneOn]);

    if (Platform.OS === 'ios') {
        return (
            <Pressable
                testID={'toggle-speakerphone'}
                style={[style.button, isLandscape && style.buttonLandscape]}
                onPress={toggleSpeakerPhone}
            >
                <CompassIcon
                    name={'volume-high'}
                    size={24}
                    style={[
                        style.buttonIcon,
                        isLandscape && style.buttonIconLandscape,
                        style.speakerphoneIcon,
                        currentCall.speakerphoneOn && style.buttonOn,
                    ]}
                />
                <Text style={style.buttonText}>{speakerLabel}</Text>
            </Pressable>
        );
    }

    let icon = 'volume-high';
    let label = speakerLabel;
    switch (audioDeviceInfo.selectedAudioDevice) {
        case AudioDevice.Earpiece:
            icon = 'phone-in-talk';
            label = earpieceLabel;
            break;
        case AudioDevice.Bluetooth:
            icon = 'cellphone';
            label = bluetoothLabel;
            break;
    }

    return (
        <Pressable
            testID={'toggle-speakerphone'}
            style={[style.button, isLandscape && style.buttonLandscape]}
            onPress={deviceSelector}
        >
            <CompassIcon
                name={icon}
                size={24}
                style={[
                    style.buttonIcon,
                    isLandscape && style.buttonIconLandscape,
                    style.speakerphoneIcon,
                    currentCall.speakerphoneOn && style.buttonOn,
                ]}
            />
            <Text style={style.buttonText}>{label}</Text>
        </Pressable>
    );
};
