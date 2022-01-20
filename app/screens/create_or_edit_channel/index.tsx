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
import {useTheme} from '@context/theme';
import DatabaseManager from '@database/manager';
import {getActiveServerUrl} from '@init/credentials';
import {queryCurrentChannel, queryCurrentChannelInfo} from '@queries/servers/channel';
import {popTopScreen, dismissModal, setButtons} from '@screens/navigation';
import {validateDisplayName} from '@utils/channel';

import type ChannelModel from '@typings/database/models/servers/channel';
import type ChannelInfoModel from '@typings/database/models/servers/channel_info';

type Props = {
    componentId: string;
    channelId?: string;
}

const CLOSE_CHANNEL_ID = 'close-channel';
const EDIT_CHANNEL_ID = 'update-channel';
const CREATE_CHANNEL_ID = 'create-channel';

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

const close = (goBack = false): void => {
    Keyboard.dismiss();
    if (goBack) {
        popTopScreen();
        return;
    }
    dismissModal();
};

const CreateOrEditChannel = ({componentId, channelId}: Props) => {
    const intl = useIntl();
    const {formatMessage} = intl;
    const theme = useTheme();

    const editing = Boolean(channelId);

    const rightButton = useMemo(() => {
        return {
            testID: 'edit_channel.save.button',
            id: editing ? EDIT_CHANNEL_ID : CREATE_CHANNEL_ID,
            enabled: false,
            showAsAction: 'always',
            color: theme.sidebarHeaderTextColor,
            text: editing ? formatMessage({id: 'mobile.edit_channel', defaultMessage: 'Save'}) : formatMessage({id: 'mobile.create_channel', defaultMessage: 'Create'}),
        };
    }, [editing, theme.sidebarHeaderTextColor, intl.locale]);

    // const [type, setType] = useState<ChannelType>(channel?.type as ChannelType || General.OPEN_CHANNEL);
    const [type, setType] = useState<ChannelType>(General.OPEN_CHANNEL as ChannelType);

    const [serverUrl, setServerUrL] = useState<string>('jasonf.ngrok.io');
    const [channel, setChannel] = useState<ChannelModel>();
    const [channelInfo, setChannelInfo] = useState<ChannelInfoModel>();
    const [displayName, setDisplayName] = useState<string>(channel?.displayName || '');
    const [purpose, setPurpose] = useState<string>(channelInfo?.purpose || '');
    const [header, setHeader] = useState<string>(channelInfo?.header || '');

    const isDirect = (): boolean => {
        return channel?.type === General.DM_CHANNEL || channel?.type === General.GM_CHANNEL;
    };

    console.log('channel.displayName', channel?.displayName);
    console.log('displayName', displayName);

    // console.log('channelInfo.header', channelInfo?.header);
    // console.log('channelInfo.purpose', channelInfo?.purpose);
    const getChannel = async (): Promise<void> => {
        // const database = DatabaseManager.serverDatabases[serverUrl];
        const database = DatabaseManager.serverDatabases['https://jasonf.ngrok.io'];
        if (!database) {
            return;
        }
        console.log('serverUrl', serverUrl);

        const currentChannel = await queryCurrentChannel(database.database);
        if (currentChannel) {
            setDisplayName(currentChannel.displayName);
            setChannel(currentChannel);
        }

        const currentChannelInfo = await queryCurrentChannelInfo(database.database);
        if (currentChannelInfo) {
            setHeader(currentChannelInfo.header);
            setPurpose(currentChannelInfo.purpose);
            setChannelInfo(currentChannelInfo);
        }
    };

    const getServerUrl = async () => {
        const url = await getActiveServerUrl();
        setServerUrL(url);
    };

    useEffect(() => {
        getServerUrl();
        if (channelId) {
            getChannel();
        }
    }, []);

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
    });

    const enableRightButton = useCallback((enabled: boolean) => {
        setButtons(componentId, {
            rightButtons: [{...rightButton, enabled}] as never[],
        });
    }, [rightButton, componentId]);

    const onCreateChannel = useCallback(async () => {
        dispatch({type: RequestActions.START});
        Keyboard.dismiss();
        enableRightButton(true);
        if (!isValidDisplayName()) {
            return;
        }

        const createdChannel = await handleCreateChannel(serverUrl, displayName, purpose, header, type);
        if (createdChannel.error) {
            dispatch({
                type: RequestActions.FAILURE,
                error: createdChannel.error as string,
            });
            enableRightButton(false);
        }

        // dispatch({type: RequestActions.COMPLETE});
        enableRightButton(false);

        // close(true);
    }, [enableRightButton, displayName, header, purpose]);

    const onUpdateChannel = useCallback(async () => {
        dispatch({type: RequestActions.START});
        Keyboard.dismiss();
        enableRightButton(true);
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
            enableRightButton(false);
            return;
        }
        dispatch({type: RequestActions.COMPLETE});
        enableRightButton(false);
        close(true);
    }, [channel?.id, channel?.type, enableRightButton, displayName, header, purpose]);

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
    }, [onCreateChannel, onUpdateChannel]);

    const onTypeChange = useCallback((typeText: ChannelType) => {
        setType(typeText);
    }, []);

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
            enableRightButton(false);
            return false;
        }
        return true;
    };

    return (
        <ChannelInfoForm
            testID='create_or_edit_channel.screen'
            enableRightButton={enableRightButton}
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
