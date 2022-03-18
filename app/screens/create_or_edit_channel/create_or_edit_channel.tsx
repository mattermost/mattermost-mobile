// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useState, useEffect, useReducer, useCallback, useMemo} from 'react';
import {useIntl} from 'react-intl';
import {
    Keyboard,
} from 'react-native';
import {Navigation} from 'react-native-navigation';

import {handlePatchChannel, handleCreateChannel} from '@actions/remote/channel';
import ChannelInfoForm from '@app/screens/create_or_edit_channel/channel_info_form';
import {General} from '@constants';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {dismissModal, setButtons} from '@screens/navigation';
import {validateDisplayName} from '@utils/channel';

import type ChannelModel from '@typings/database/models/servers/channel';
import type ChannelInfoModel from '@typings/database/models/servers/channel_info';

type Props = {
    componentId: string;
    channel?: ChannelModel;
    channelInfo?: ChannelInfoModel;
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

const close = (componentId: string): void => {
    Keyboard.dismiss();
    dismissModal({componentId});
};

const isDirect = (channel?: ChannelModel): boolean => {
    return channel?.type === General.DM_CHANNEL || channel?.type === General.GM_CHANNEL;
};

const CreateOrEditChannel = ({
    componentId,
    channel,
    channelInfo,
}: Props) => {
    const intl = useIntl();
    const {formatMessage} = intl;
    const theme = useTheme();
    const serverUrl = useServerUrl();

    const editing = Boolean(channel);

    const rightButton = useMemo(() => {
        return {
            testID: 'edit_channel.save.button',
            id: editing ? EDIT_BUTTON_ID : CREATE_BUTTON_ID,
            enabled: false,
            showAsAction: 'always' as const,
            color: theme.sidebarHeaderTextColor,
            text: editing ? formatMessage({id: 'mobile.edit_channel', defaultMessage: 'Save'}) : formatMessage({id: 'mobile.create_channel', defaultMessage: 'Create'}),
        };
    }, [editing, theme.sidebarHeaderTextColor, intl.locale]);

    const [type, setType] = useState<ChannelType>(channel?.type as ChannelType || General.OPEN_CHANNEL);
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

    useEffect(() => {
        setButtons(componentId, {
            rightButtons: [{...rightButton, enabled: canSave}],
        });
    }, [rightButton, canSave, componentId]);

    useEffect(() => {
        setCanSave(
            displayName.length >= 2 && (
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
        const createdChannel = await handleCreateChannel(serverUrl, displayName, purpose, header, type);
        if (createdChannel.error) {
            dispatch({
                type: RequestActions.FAILURE,
                error: createdChannel.error as string,
            });
            return;
        }

        dispatch({type: RequestActions.COMPLETE});
        close(componentId);
    }, [serverUrl, type, displayName, header, purpose, isValidDisplayName]);

    const onUpdateChannel = useCallback(async () => {
        if (!channel) {
            return;
        }
        dispatch({type: RequestActions.START});
        Keyboard.dismiss();
        if (!isValidDisplayName()) {
            return;
        }

        const patchChannel = {
            id: channel.id,
            type: channel.type,
            display_name: isDirect(channel) ? '' : displayName,
            purpose,
            header,
        } as Channel;

        setCanSave(false);
        const patchedChannel = await handlePatchChannel(serverUrl, patchChannel);
        if (patchedChannel.error) {
            dispatch({
                type: RequestActions.FAILURE,
                error: patchedChannel.error as string,
            });
            return;
        }
        dispatch({type: RequestActions.COMPLETE});
        close(componentId);
    }, [channel?.id, channel?.type, displayName, header, purpose, isValidDisplayName]);

    useEffect(() => {
        const update = Navigation.events().registerComponentListener({
            navigationButtonPressed: ({buttonId}: {buttonId: string}) => {
                switch (buttonId) {
                    case CLOSE_BUTTON_ID:
                        close(componentId);
                        break;
                    case CREATE_BUTTON_ID:
                        onCreateChannel();
                        break;
                    case EDIT_BUTTON_ID:
                        onUpdateChannel();
                        break;
                }
            },
        }, componentId);

        return () => {
            update.remove();
        };
    }, [onCreateChannel, onUpdateChannel]);

    return (
        <ChannelInfoForm
            testID='create_or_edit_channel.screen'
            error={appState.error}
            saving={appState.saving}
            channelType={channel?.type}
            editing={editing}
            onTypeChange={setType}
            type={type}
            displayName={displayName}
            onDisplayNameChange={setDisplayName}
            header={header}
            onHeaderChange={setHeader}
            purpose={purpose}
            onPurposeChange={setPurpose}
        />
    );
};

export default CreateOrEditChannel;
