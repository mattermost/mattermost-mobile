// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useState, useEffect} from 'react';
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

    const [error, setError] = useState<string>('');
    const [saving, setSaving] = useState<boolean>(false);
    const [type, setType] = useState<ChannelType>(channel?.type || General.OPEN_CHANNEL);
    const [rightButton, setRightButton] = useState<Button>();

    // const [channelUrl, setChannelUrl] = useState<string>('');
    const displayName = useFormInput(channel?.displayName);
    const purpose = useFormInput(channelInfo?.purpose);
    const header = useFormInput(channelInfo?.header);

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

    const emitCanSaveChannel = (enabled: boolean) => {
        setButtons(componentId, {
            leftButtons: [],
            rightButtons: [{...rightButton, enabled}] as never[],
        });
    };

    const onRequestStart = () => {
        emitSaving(true);
        setError('');
        setSaving(true);
        Keyboard.dismiss();
    };

    const onRequestFailure = (errorText: string) => {
        setError(errorText);
        setSaving(false);
    };

    const onRequestComplete = () => {
        InteractionManager.runAfterInteractions(() => {
            // EventEmitter.emit(NavigationTypes.CLOSE_MAIN_SIDEBAR);
            emitSaving(false);
            setError('');
            setSaving(false);
            close(true);
        });
    };

    const emitSaving = (loading: boolean) => {
        setButtons(componentId, {
            leftButtons: [],
            rightButtons: [{...rightButton, enabled: !loading}] as never[],
        });
    };

    const isDirect = (): boolean => {
        return channel?.type === General.DM_CHANNEL || channel?.type === General.GM_CHANNEL;
    };

    const isValidDisplayName = (): boolean => {
        if (!isDirect()) {
            const dName = displayName.value || '';
            const result = validateDisplayName(intl, dName);
            if (result) {
                setError(result);
                setSaving(false);
                return false;
            }
        }
        return true;
    };

    const onCreateChannel = async () => {
        onRequestStart();
        if (!isValidDisplayName()) {
            return;
        }

        const createdChannel = await handleCreateChannel(serverUrl, displayName.value, purpose.value, header.value, type);
        if (createdChannel.error) {
            emitSaving(false);
            onRequestFailure(createdChannel.error as string);
            return;
        }

        onRequestComplete();

        // console.log('channel.channel.id', channel.channel.id)
        // switchToChannel(serverUrl, channel.channel.id)
    };

    const onUpdateChannel = async () => {
        onRequestStart();
        if (!isValidDisplayName()) {
            return;
        }

        const patchChannel = {
            id: channel!.id,
            type: channel!.type,
            display_name: isDirect() ? '' : displayName.value,

            // name: channelURL,
            purpose: purpose.value,
            header: header.value,
        } as Channel;

        const patchedChannel = await handlePatchChannel(serverUrl, patchChannel);
        if (patchedChannel.error) {
            emitSaving(false);
            onRequestFailure(patchedChannel.error as string);
            return;
        }

        onRequestComplete();

        // const data = await this.props.actions.patchChannel(id, channel);
        // if (data.error && data.error.server_error_id === 'store.sql_channel.update.archived_channel.app_error') {
        //     this.props.actions.getChannel(id);
        // }
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

    const onChannelURLChange = (channelURLText: string) => {
        setChannelUrl(channelURLText);
    };

    const onTypeChange = (typeText: ChannelType) => {
        setType(typeText);
    };

    return (
        <EditChannelInfo
            testID='create_or_edit_channel.screen'
            enableRightButton={emitCanSaveChannel}
            error={error}
            saving={saving}
            channelType={channel?.type}
            onTypeChange={channel?.type ? undefined : onTypeChange}
            type={type}

            //  currentTeamUrl={currentTeamUrl}
            //  onChannelURLChange={onChannelURLChange}
            //  channelURL={channelURL}
            displayName={displayName}
            header={header}
            purpose={purpose}
            editing={true}
            oldDisplayName={channel?.displayName || ''}

            //oldChannelURL={oldChannelURL}
            oldPurpose={channelInfo?.purpose || ''}
            oldHeader={channelInfo?.header || ''}
        />
    );
};

export default CreateOrEditChannel;
