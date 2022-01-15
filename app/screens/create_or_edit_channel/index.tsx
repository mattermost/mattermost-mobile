// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useState, useEffect, useReducer} from 'react';
import {useIntl} from 'react-intl';
import {
    Keyboard,
} from 'react-native';
import {Navigation} from 'react-native-navigation';

import {switchToChannel} from '@actions/local/channel';
import {handlePatchChannel, handleCreateChannel} from '@actions/remote/channel';
import ChannelInfoForm from '@app/screens/create_or_edit_channel/channel_info_form';
import {General} from '@constants';
import {useTheme} from '@context/theme';
import {popTopScreen, dismissModal, setButtons} from '@screens/navigation';
import {validateDisplayName} from '@utils/channel';

import type ChannelModel from '@typings/database/models/servers/channel';
import type ChannelInfoModel from '@typings/database/models/servers/channel_info';

type Props = {
    serverUrl: string;
    componentId: string;
    channel?: ChannelModel;
    channelInfo?: ChannelInfoModel;
}

const CLOSE_CHANNEL_ID = 'close-channel';
const EDIT_CHANNEL_ID = 'update-channel';
const CREATE_CHANNEL_ID = 'create-channel';

type Button = {
    testID: string;
    id: string;
    enabled: boolean;
    showAsAction: string;
    color: string;
    text: string;
};

enum RequestActions {
    START = 'Start',
    COMPLETE = 'Complete',
    FAILURE = 'Failure',
}

interface RequestState {
    error: string;
    saving: boolean;
    rightButton: Button;
}

interface RequestAction {
    type: RequestActions;
    error?: string;
}

const close = (goBack = false): void => {
    Keyboard.dismiss();
    if (goBack) {
        popTopScreen();
        return;
    }
    dismissModal();
};

const CreateOrEditChannel = ({serverUrl, componentId, channel, channelInfo}: Props) => {
    const intl = useIntl();
    const {formatMessage} = intl;
    const theme = useTheme();

    const [type, setType] = useState<ChannelType>(channel?.type as ChannelType || General.OPEN_CHANNEL);

    const [displayName, setDisplayName] = useState<string>(channel?.displayName || '');
    const [purpose, setPurpose] = useState<string>(channelInfo?.purpose || '');
    const [header, setHeader] = useState<string>(channelInfo?.header || '');

    const isDirect = (): boolean => {
        return channel?.type === General.DM_CHANNEL || channel?.type === General.GM_CHANNEL;
    };

    const [appState, dispatch] = useReducer((state: RequestState, action: RequestAction) => {
        switch (action.type) {
            case RequestActions.START:
                return {
                    ...state,
                    error: '',
                    saving: true,
                };
            case RequestActions.COMPLETE:
                return {
                    ...state,
                    error: '',
                    saving: false,
                };
            case RequestActions.FAILURE:
                return {
                    ...state,
                    error: action.error,
                    saving: false,
                };

            default:
                return state;
        }
    }, {
        error: '',
        saving: false,
        rightButton: {
            testID: 'edit_channel.save.button',
            id: channel ? EDIT_CHANNEL_ID : CREATE_CHANNEL_ID,
            enabled: false,
            showAsAction: 'always',
            color: theme.sidebarHeaderTextColor,
            text: channel ? formatMessage({id: 'mobile.edit_channel', defaultMessage: 'Save'}) : formatMessage({id: 'mobile.create_channel', defaultMessage: 'Create'}),
        },
    });

    const emitCanSaveChannel = (enabled: boolean) => {
        setButtons(componentId, {
            rightButtons: [{...appState.rightButton, enabled}] as never[],
        });
    };

    useEffect(() => {
        const update = Navigation.events().registerComponentListener({
            navigationButtonPressed: ({buttonId}: {buttonId: string}) => {
                switch (buttonId) {
                    case CLOSE_CHANNEL_ID:
                        close(true);
                        break;
                    case CREATE_CHANNEL_ID:
                        onCreateChannel();
                        break;
                    case EDIT_CHANNEL_ID:
                        onUpdateChannel();
                        break;
                }
            },
        }, componentId);

        return () => {
            update.remove();
        };
    }, [displayName, header, purpose]);

    const onTypeChange = (typeText: ChannelType) => {
        setType(typeText);
    };

    // if a channel was provided, we are editing a channel
    const editing = Boolean(channel);

    const isValidDisplayName = (): boolean => {
        if (isDirect()) {
            return true;
        }

        const dName = displayName || '';
        const result = validateDisplayName(intl, dName);
        if (result.error) {
            dispatch({
                type: RequestActions.FAILURE,
                error: result.error,
            });
            emitCanSaveChannel(false);
            return false;
        }
        return true;
    };

    const onCreateChannel = async () => {
        dispatch({type: RequestActions.START});
        Keyboard.dismiss();
        emitCanSaveChannel(true);
        if (!isValidDisplayName()) {
            return;
        }

        const createdChannel = await handleCreateChannel(serverUrl, displayName, purpose, header, type);
        if (createdChannel.error) {
            dispatch({
                type: RequestActions.FAILURE,
                error: createdChannel.error as string,
            });
            emitCanSaveChannel(false);
            return;
        }
        dispatch({type: RequestActions.COMPLETE});
        emitCanSaveChannel(false);
        close(true);
        switchToChannel(serverUrl, createdChannel!.channel!.id);
    };

    const onUpdateChannel = async () => {
        dispatch({type: RequestActions.START});
        Keyboard.dismiss();
        emitCanSaveChannel(true);
        if (!isValidDisplayName()) {
            return;
        }

        const patchChannel = {
            id: channel!.id,
            type: channel!.type,
            display_name: isDirect() ? '' : displayName,
            purpose,
            header,
        } as Channel;

        const patchedChannel = await handlePatchChannel(serverUrl, patchChannel);
        if (patchedChannel.error) {
            dispatch({
                type: RequestActions.FAILURE,
                error: patchedChannel.error as string,
            });
            emitCanSaveChannel(false);
            return;
        }
        dispatch({type: RequestActions.COMPLETE});
        emitCanSaveChannel(false);
        close(true);
    };

    return (
        <ChannelInfoForm
            testID='create_or_edit_channel.screen'
            enableRightButton={emitCanSaveChannel}
            error={appState.error}
            saving={appState.saving}
            channelType={channel?.type}
            editing={editing}
            onTypeChange={onTypeChange}
            type={type}
            displayName={displayName}
            onDisplayNameChange={setDisplayName}
            header={header}
            onHeaderChange={setHeader}
            purpose={purpose}
            onPurposeChange={setPurpose}
            oldDisplayName={channel?.displayName || ''}
            oldPurpose={channelInfo?.purpose || ''}
            oldHeader={channelInfo?.header || ''}
        />
    );
};

export default CreateOrEditChannel;
