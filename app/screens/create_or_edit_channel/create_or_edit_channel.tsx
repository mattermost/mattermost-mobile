// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useMemo, useReducer, useState} from 'react';
import {useIntl} from 'react-intl';
import {Keyboard, StyleSheet, View} from 'react-native';

import {createChannel, patchChannel as handlePatchChannel, switchToChannelById} from '@actions/remote/channel';
import CompassIcon from '@components/compass_icon';
import {General} from '@constants';
import {MIN_CHANNEL_NAME_LENGTH} from '@constants/channel';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import useNavButtonPressed from '@hooks/navigation_button_pressed';
import SecurityManager from '@managers/security_manager';
import {buildNavigationButton, dismissModal, popTopScreen, setButtons} from '@screens/navigation';
import {validateDisplayName} from '@utils/channel';

import ChannelInfoForm from './channel_info_form';

import type ChannelModel from '@typings/database/models/servers/channel';
import type ChannelInfoModel from '@typings/database/models/servers/channel_info';
import type {AvailableScreens} from '@typings/screens/navigation';
import type {ImageResource} from 'react-native-navigation';

type Props = {
    componentId: AvailableScreens;
    channel?: ChannelModel;
    channelInfo?: ChannelInfoModel;
    headerOnly?: boolean;
    isModal: boolean;
}

const CLOSE_BUTTON_ID = 'close-channel';
const EDIT_BUTTON_ID = 'update-channel';
const CREATE_BUTTON_ID = 'create-channel';

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

const close = (componentId: AvailableScreens, isModal: boolean): void => {
    Keyboard.dismiss();
    if (isModal) {
        dismissModal({componentId});
    } else {
        popTopScreen(componentId);
    }
};

const isDirect = (channel?: ChannelModel): boolean => {
    return channel?.type === General.DM_CHANNEL || channel?.type === General.GM_CHANNEL;
};

const makeCloseButton = (icon: ImageResource) => {
    return buildNavigationButton(CLOSE_BUTTON_ID, 'close.create_or_edit_channel.button', icon);
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
});

const CreateOrEditChannel = ({
    componentId,
    channel,
    channelInfo,
    headerOnly,
    isModal,
}: Props) => {
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

    const rightButton = useMemo(() => {
        const base = buildNavigationButton(
            editing ? EDIT_BUTTON_ID : CREATE_BUTTON_ID,
            editing ? 'create_or_edit_channel.save.button' : 'create_or_edit_channel.create.button',
            undefined,
            editing ? formatMessage({id: 'mobile.edit_channel', defaultMessage: 'Save'}) : formatMessage({id: 'mobile.create_channel', defaultMessage: 'Create'}),
        );
        base.enabled = canSave;
        base.showAsAction = 'always';
        base.color = theme.sidebarHeaderTextColor;
        return base;
    }, [editing, theme.sidebarHeaderTextColor, intl, canSave]);

    useEffect(() => {
        setButtons(componentId, {
            rightButtons: [rightButton],
        });
    }, [rightButton, componentId]);

    useEffect(() => {
        if (isModal) {
            const icon = CompassIcon.getImageSourceSync('close', 24, theme.sidebarHeaderTextColor);
            setButtons(componentId, {
                leftButtons: [makeCloseButton(icon)],
            });
        }
    }, [theme, isModal]);

    useEffect(() => {
        setCanSave(
            displayName.length >= MIN_CHANNEL_NAME_LENGTH && (
                displayName !== channel?.displayName ||
                purpose !== channelInfo?.purpose ||
                header !== channelInfo?.header ||
                type !== channel.type
            ),
        );
    }, [channel, displayName, purpose, header, type]);

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
    }, [channel, displayName]);

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
        close(componentId, isModal);
        switchToChannelById(serverUrl, createdChannel.channel!.id, createdChannel.channel!.team_id);
    }, [serverUrl, type, displayName, header, isModal, purpose, isValidDisplayName]);

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
        close(componentId, isModal);
    }, [channel?.id, channel?.type, displayName, header, isModal, purpose, isValidDisplayName]);

    const handleClose = useCallback(() => {
        close(componentId, isModal);
    }, [isModal]);

    useNavButtonPressed(CLOSE_BUTTON_ID, componentId, handleClose, [handleClose]);
    useNavButtonPressed(CREATE_BUTTON_ID, componentId, onCreateChannel, [onCreateChannel]);
    useNavButtonPressed(EDIT_BUTTON_ID, componentId, onUpdateChannel, [onUpdateChannel]);
    useAndroidHardwareBackHandler(componentId, handleClose);

    return (
        <View
            nativeID={SecurityManager.getShieldScreenId(componentId)}
            style={styles.container}
        >
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
            />
        </View>
    );
};

export default CreateOrEditChannel;
