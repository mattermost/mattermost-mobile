// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useState, useEffect, useReducer} from 'react';
import {useIntl} from 'react-intl';
import {
    Keyboard,
    InteractionManager,
} from 'react-native';
import {Navigation} from 'react-native-navigation';

import {handlePatchChannel, handleCreateChannel} from '@actions/remote/channel';
import EditChannelInfo from '@components/edit_channel_info';
import {General} from '@constants';
import {useTheme} from '@context/theme';
import {useFormInput} from '@hooks/forms';
import {popTopScreen, dismissModal, setButtons} from '@screens/navigation';
import {validateDisplayName} from '@utils/channel';

import type ChannelModel from '@typings/database/models/servers/channel';
import type ChannelInfoModel from '@typings/database/models/servers/channel_info';

type Props = {
        serverUrl: string;
        componentId: string;
        categoryId: string;
        channel?: ChannelModel;
        channelInfo?: ChannelInfoModel;
}

// static propTypes = {
//     actions: PropTypes.shape({
//         patchChannel: PropTypes.func.isRequired,
//         getChannel: PropTypes.func.isRequired,
//         setChannelDisplayName: PropTypes.func.isRequired,
//     }),
//     updateChannelRequest: PropTypes.object.isRequired,
// };

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

const CreateOrEditChannel = ({serverUrl, componentId, channel, channelInfo}: Props) => {
    const intl = useIntl();
    const {formatMessage} = intl;
    const theme = useTheme();

    const [type, setType] = useState<ChannelType>(channel?.type as ChannelType || General.OPEN_CHANNEL);
    const [rightButton, setRightButton] = useState<Button>();

    const displayName = useFormInput(channel?.displayName);
    const purpose = useFormInput(channelInfo?.purpose);
    const header = useFormInput(channelInfo?.header);

    enum RequestActions {
      START = 'Start',
      COMPLETE = 'Complete',
      FAILURE = 'Failure',
    }

    interface RequestState {
        error: string;
        saving: boolean;
        type: ChannelType;
    }

    interface RequestAction {
        type: RequestActions;
        error?: string;
    }

    const emitCanSaveChannel = (enabled: boolean) => {
        setButtons(componentId, {
            leftButtons: [],
            rightButtons: [{...rightButton, enabled}] as never[],
        });
    };

    const isDirect = (): boolean => {
        return channel?.type === General.DM_CHANNEL || channel?.type === General.GM_CHANNEL;
    };

    const close = (goBack = false): void => {
        Keyboard.dismiss();
        if (!isDirect()) {
        //     this.props.actions.setChannelDisplayName(this.state.displayName);
        }

        if (goBack) {
            popTopScreen();
        } else {
            dismissModal();
        }
    };

    const [appState, dispatch] = useReducer((state: RequestState, action: RequestAction) => {
        switch (action.type) {
            case RequestActions.START:
                emitCanSaveChannel(true);
                Keyboard.dismiss();
                return {
                    ...state,
                    error: '',
                    saving: true,
                };
            case RequestActions.COMPLETE:
                emitCanSaveChannel(false);
                close(true);
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
                return {
                    ...state,
                };
        }
    }, {
        error: '',
        saving: false,
        type: channel?.type as ChannelType || General.OPEN_CHANNEL,
    });

    useEffect(() => {
        const button = {
            testID: 'edit_channel.save.button',
            id: EDIT_CHANNEL_ID,
            enabled: false,
            showAsAction: 'always',
            color: theme.sidebarHeaderTextColor,
            text: formatMessage({id: 'mobile.edit_channel', defaultMessage: 'Save'}),
        };

        if (!channel) {
            button.id = CREATE_CHANNEL_ID;
            button.text = formatMessage({id: 'mobile.create_channel', defaultMessage: 'Create'});
        }

        setRightButton(button);
        setButtons(componentId, {
            leftButtons: [],
            rightButtons: [{...button, enabled: false}] as never[],
        });
    }, []);

    const isValidDisplayName = (): boolean => {
        if (isDirect()) {
            return true;
        }

        const dName = displayName.value || '';
        const result = validateDisplayName(intl, dName);
        if (!result.error) {
            return true;
        }

        dispatch({
            type: RequestActions.FAILURE,
            error: result.error,
        });
        return false;
    };

    const onCreateChannel = async () => {
        dispatch({type: RequestActions.START});
        if (!isValidDisplayName()) {
            return;
        }

        const createdChannel = await handleCreateChannel(serverUrl, displayName.value, purpose.value, header.value, type);
        if (createdChannel.error) {
            emitCanSaveChannel(false);
            dispatch({
                type: RequestActions.FAILURE,
                error: createdChannel.error as string,
            });
            return;
        }

        InteractionManager.runAfterInteractions(() => {
            dispatch({type: RequestActions.COMPLETE});
        });

        // console.log('channel.channel.id', channel.channel.id)
        // switchToChannel(serverUrl, channel.channel.id)
    };

    const onUpdateChannel = async () => {
        dispatch({type: RequestActions.START});
        if (!isValidDisplayName()) {
            return;
        }

        const patchChannel = {
            id: channel!.id,
            type: channel!.type,
            display_name: isDirect() ? '' : displayName.value,
            purpose: purpose.value,
            header: header.value,
        } as Channel;

        const patchedChannel = await handlePatchChannel(serverUrl, patchChannel);
        if (patchedChannel.error) {
            emitCanSaveChannel(false);
            dispatch({
                type: RequestActions.FAILURE,
                error: patchedChannel.error as string,
            });
            return;
        }

        InteractionManager.runAfterInteractions(() => {
            dispatch({type: RequestActions.COMPLETE});
        });

        // const data = await this.props.actions.patchChannel(id, channel);
        // if (data.error && data.error.server_error_id === 'store.sql_channel.update.archived_channel.app_error') {
        //     this.props.actions.getChannel(id);
        // }
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

    return (
        <EditChannelInfo
            testID='create_or_edit_channel.screen'
            enableRightButton={emitCanSaveChannel}
            error={appState.error}
            saving={appState.saving}
            channelType={channel?.type}
            editing={editing}
            onTypeChange={onTypeChange}
            type={type}
            displayName={displayName}
            header={header}
            purpose={purpose}
            oldDisplayName={channel?.displayName || ''}
            oldPurpose={channelInfo?.purpose || ''}
            oldHeader={channelInfo?.header || ''}
        />
    );
};

export default CreateOrEditChannel;
