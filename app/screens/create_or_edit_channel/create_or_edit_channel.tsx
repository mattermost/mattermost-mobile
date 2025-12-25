// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useNavigation} from 'expo-router';
import React, {useCallback, useEffect, useReducer, useState} from 'react';
import {useIntl} from 'react-intl';
import {Keyboard, Pressable, StyleSheet, Text, View} from 'react-native';

import {createChannel, patchChannel as handlePatchChannel, switchToChannelById} from '@actions/remote/channel';
import {General, Screens} from '@constants';
import {MIN_CHANNEL_NAME_LENGTH} from '@constants/channel';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import {validateDisplayName} from '@utils/channel';
import {navigateBack} from '@utils/navigation/adapter';
import {changeOpacity} from '@utils/theme';

import ChannelInfoForm from './channel_info_form';

import type ChannelModel from '@typings/database/models/servers/channel';
import type ChannelInfoModel from '@typings/database/models/servers/channel_info';

type Props = {
    channel?: ChannelModel;
    channelInfo?: ChannelInfoModel;
    headerOnly?: boolean;
    canCreatePublicChannels: boolean;
    canCreatePrivateChannels: boolean;
}

enum RequestActions {
    START = 'Start',
    COMPLETE = 'Complete',
    FAILURE = 'Failure',
}

interface RequestState {
    error: string;
    saving: boolean;
}

interface RequestAction {
    type: RequestActions;
    error?: string;
}

const close = async (): Promise<void> => {
    Keyboard.dismiss();
    await navigateBack();
};

const isDirect = (channel?: ChannelModel): boolean => {
    return channel?.type === General.DM_CHANNEL || channel?.type === General.GM_CHANNEL;
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
});

const CreateOrEditChannel = ({
    canCreatePrivateChannels,
    canCreatePublicChannels,
    channel,
    channelInfo,
    headerOnly,
}: Props) => {
    const navigation = useNavigation();
    const intl = useIntl();
    const {formatMessage} = intl;
    const theme = useTheme();
    const serverUrl = useServerUrl();

    const editing = Boolean(channel);

    const [type, setType] = useState<ChannelType>(channel?.type || General.OPEN_CHANNEL);
    const [canSave, setCanSave] = useState(false);

    const [displayName, setDisplayName] = useState<string>(channel?.displayName || '');
    const [purpose, setPurpose] = useState<string>(channelInfo?.purpose || '');
    const [header, setHeader] = useState<string>(channelInfo?.header || '');

    const [appState, dispatch] = useReducer((state: RequestState, action: RequestAction) => {
        switch (action.type) {
            case RequestActions.START:
                return {
                    error: '',
                    saving: true,
                };
            case RequestActions.COMPLETE:
                return {
                    error: '',
                    saving: false,
                };
            case RequestActions.FAILURE:
                return {
                    error: action.error,
                    saving: false,
                };

            default:
                return state;
        }
    }, {
        error: '',
        saving: false,
    });

    const isValidDisplayName = useCallback((): boolean => {
        if (isDirect(channel)) {
            return true;
        }

        const result = validateDisplayName(intl, displayName);
        if (result.error) {
            dispatch({
                type: RequestActions.FAILURE,
                error: result.error,
            });
            return false;
        }
        return true;
    }, [channel, displayName, intl]);

    const onCreateChannel = useCallback(async () => {
        dispatch({type: RequestActions.START});
        Keyboard.dismiss();
        if (!isValidDisplayName()) {
            return;
        }

        setCanSave(false);
        const createdChannel = await createChannel(serverUrl, displayName, purpose, header, type);
        if (createdChannel.error) {
            dispatch({
                type: RequestActions.FAILURE,
                error: createdChannel.error as string,
            });
            return;
        }

        dispatch({type: RequestActions.COMPLETE});
        navigation.getParent()?.goBack();
        await new Promise((resolve) => setTimeout(resolve, 250));
        switchToChannelById(serverUrl, createdChannel.channel!.id, createdChannel.channel!.team_id);
    }, [isValidDisplayName, serverUrl, displayName, purpose, header, type, navigation]);

    const onUpdateChannel = useCallback(async () => {
        if (!channel) {
            return;
        }
        dispatch({type: RequestActions.START});
        Keyboard.dismiss();
        if (!isValidDisplayName()) {
            return;
        }

        const patchChannel: ChannelPatch = {
            header,
            ...!isDirect(channel) && {
                display_name: displayName,
                purpose,
            },
        };

        setCanSave(false);
        const patchedChannel = await handlePatchChannel(serverUrl, channel.id, patchChannel);
        if (patchedChannel.error) {
            dispatch({
                type: RequestActions.FAILURE,
                error: patchedChannel.error as string,
            });
            return;
        }
        dispatch({type: RequestActions.COMPLETE});
        close();
    }, [channel, isValidDisplayName, header, displayName, purpose, serverUrl]);

    useEffect(() => {
        const buttonText = editing ? formatMessage({id: 'mobile.edit_channel', defaultMessage: 'Save'}) : formatMessage({id: 'mobile.create_channel', defaultMessage: 'Create'});
        navigation.setOptions({
            headerRight: () => (
                <Pressable
                    onPress={editing ? onUpdateChannel : onCreateChannel}
                    disabled={!canSave}
                    testID={editing ? 'create_or_edit_channel.save.button' : 'create_or_edit_channel.create.button'}
                >
                    <Text
                        style={{color: canSave ? theme.sidebarHeaderTextColor : changeOpacity(theme.sidebarHeaderTextColor, 0.5), fontSize: 16}}
                    >
                        {buttonText}
                    </Text>
                </Pressable>
            ),
        });
    }, [editing, formatMessage, navigation, onUpdateChannel, onCreateChannel, canSave, theme.sidebarHeaderTextColor]);

    useEffect(() => {
        setCanSave(
            displayName.length >= MIN_CHANNEL_NAME_LENGTH && (
                displayName !== channel?.displayName ||
                purpose !== channelInfo?.purpose ||
                header !== channelInfo?.header ||
                type !== channel.type
            ),
        );
    }, [channel, displayName, purpose, header, type, channelInfo?.purpose, channelInfo?.header]);

    useAndroidHardwareBackHandler(Screens.CREATE_OR_EDIT_CHANNEL, close);

    return (
        <View style={styles.container}>
            <ChannelInfoForm
                error={appState.error}
                saving={appState.saving}
                channelType={channel?.type}
                editing={editing}
                onTypeChange={setType}
                type={type}
                displayName={displayName}
                onDisplayNameChange={setDisplayName}
                header={header}
                headerOnly={headerOnly}
                onHeaderChange={setHeader}
                purpose={purpose}
                onPurposeChange={setPurpose}
                canCreatePrivateChannels={canCreatePrivateChannels}
                canCreatePublicChannels={canCreatePublicChannels}
            />
        </View>
    );
};

export default CreateOrEditChannel;
