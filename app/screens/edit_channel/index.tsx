// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useState, useEffect} from 'react';
import {useIntl} from 'react-intl';
import {
    Keyboard,
    InteractionManager,
} from 'react-native';
import {Navigation} from 'react-native-navigation';

import {handlePatchChannel} from '@actions/remote/channel';
import EditChannelInfo from '@components/edit_channel_info';
import {General} from '@constants';
import {useTheme} from '@context/theme';
import {popTopScreen, setButtons} from '@screens/navigation';

import type ChannelModel from '@typings/database/models/servers/channel';
import type ChannelInfoModel from '@typings/database/models/servers/channel_info';

// import {validateChannelURL, validateDisplayName} from '@utils/channel';

type Props = {
        serverUrl: string;
        componentId: string;
        categoryId: string;
        channel: ChannelModel;
        channelInfo: ChannelInfoModel;
        closeButton: object;
}

// static propTypes = {
//     actions: PropTypes.shape({
//         patchChannel: PropTypes.func.isRequired,
//         getChannel: PropTypes.func.isRequired,
//         setChannelDisplayName: PropTypes.func.isRequired,
//     }),
//     currentTeamUrl: PropTypes.string.isRequired,
//     updateChannelRequest: PropTypes.object.isRequired,
// };

const CLOSE_EDIT_CHANNEL_ID = 'close-edit-channel';
const EDIT_CHANNEL_ID = 'edit-channel';

const EditChannel = ({serverUrl, componentId, closeButton, channel, channelInfo}: Props) => {
    const intl = useIntl();
    const {formatMessage} = intl;
    const theme = useTheme();

    const [error, setError] = useState<string>('');
    const [updating, setUpdating] = useState<boolean>(false);
    const [displayName, setDisplayName] = useState<string>(channel?.displayName || '');
    const [channelUrl, setChannelUrl] = useState<string>('');
    const [purpose, setPurpose] = useState<string>(channelInfo?.purpose || '');
    const [header, setHeader] = useState<string>(channelInfo?.header || '');

    const rightButton = {
        testID: 'edit_channel.save.button',
        id: EDIT_CHANNEL_ID,
        enabled: false,
        showAsAction: 'always',
        color: theme.sidebarHeaderTextColor,
        text: formatMessage({id: 'mobile.edit_channel', defaultMessage: 'Save'}),
    };

    const emitCanUpdateChannel = (enabled: boolean) => {
        const rightButtons = [{...rightButton, enabled}] as never[];
        const leftButtons: never[] = [];

        setButtons(componentId, {
            leftButtons,
            rightButtons,
        });
    };

    useEffect(() => {
        const rightButtons = [{...rightButton, enabled: false}] as never[];
        const leftButtons: never[] = [];
        setButtons(componentId, {
            leftButtons,
            rightButtons,
        });
    }, []);

    const onRequestStart = () => {
        setError('');
        setUpdating(true);
    };

    const onRequestFailure = (errorText: string) => {
        setError(errorText);
        setUpdating(false);
    };

    const emitUpdating = (loading: boolean) => {
        const rightButtons = [{...rightButton, enabled: !loading}] as never[];
        const leftButtons: never[] = [];
        setButtons(componentId, {
            leftButtons,
            rightButtons,
        });
    };

    const isDirect = (): boolean => {
        return channel.type === General.DM_CHANNEL || channel.type === General.GM_CHANNEL;
    };

    const onUpdateChannel = async () => {
        emitUpdating(true);
        onRequestStart();

        Keyboard.dismiss();

        const patchChannel = {
            id: channel.id,
            type: channel.type,
            display_name: isDirect() ? '' : displayName,

            // name: channelURL,
            purpose,
            header,
        } as Channel;

        // if (!isDirect) {
        //     let error = validateDisplayName(displayName.trim());
        //     if (error) {
        //         setError(error);
        //         return;
        //     }
        //
        //     error = validateChannelURL(channelURL.trim());
        //     if (error) {
        //         setError(error);
        //         return;
        //     }
        // }

        const patchedChannel = await handlePatchChannel(serverUrl, patchChannel);
        if (patchedChannel.error) {
            emitUpdating(false);
            onRequestFailure(patchedChannel.error as string);
            return;
        }

        InteractionManager.runAfterInteractions(() => {
            emitUpdating(false);
            setError('');
            setUpdating(false);
            close(false);
        });

        // const data = await this.props.actions.patchChannel(id, channel);
        // if (data.error && data.error.server_error_id === 'store.sql_channel.update.archived_channel.app_error') {
        //     this.props.actions.getChannel(id);
        // }
    };

    const close = () => {
        if (!isDirect()) {
        //     this.props.actions.setChannelDisplayName(this.state.displayName);
        }

        popTopScreen();
    };

    useEffect(() => {
        const update = Navigation.events().registerComponentListener({
            navigationButtonPressed: ({buttonId}: {buttonId: string}) => {
                switch (buttonId) {
                    case CLOSE_EDIT_CHANNEL_ID:
                        close();
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

    const onDisplayNameChange = (displayNameText: string) => {
        setDisplayName(displayNameText);
    };

    const onChannelURLChange = (channelURLText: string) => {
        setChannelUrl(channelURLText);
    };

    const onPurposeChange = (purposeText: string) => {
        setPurpose(purposeText);
    };

    const onHeaderChange = (headerText: string) => {
        setHeader(headerText);
    };

    // static getDerivedStateFromProps(nextProps, state) {
    //     const {updateChannelRequest} = nextProps;
    //
    //     if (state.updateChannelRequest !== updateChannelRequest) {
    //         const newState = {
    //             error: null,
    //             updating: true,
    //             updateChannelRequest,
    //         };
    //
    //         switch (updateChannelRequest.status) {
    //         case RequestStatus.SUCCESS:
    //             newState.updating = false;
    //             break;
    //         case RequestStatus.FAILURE:
    //             newState.error = updateChannelRequest.error;
    //             newState.updating = false;
    //             break;
    //         }
    //
    //         return newState;
    //     }
    //     return null;
    // }

    // componentDidUpdate(prevProps) {
    //     if (prevProps.updateChannelRequest !== this.props.updateChannelRequest) {
    //         switch (this.props.updateChannelRequest.status) {
    //         case RequestStatus.STARTED:
    //             emitUpdating(true);
    //             break;
    //         case RequestStatus.SUCCESS:
    //             EventEmitter.emit(NavigationTypes.CLOSE_MAIN_SIDEBAR);
    //             InteractionManager.runAfterInteractions(() => {
    //                 emitUpdating(false);
    //                 this.close();
    //             });
    //             break;
    //         case RequestStatus.FAILURE:
    //             emitUpdating(false);
    //             break;
    //         }
    //     }
    // }

    return (
        <EditChannelInfo
            testID='edit_channel.screen'
            enableRightButton={emitCanUpdateChannel}
            error={error}
            saving={updating}
            channelType={channel.type}

            //  currentTeamUrl={currentTeamUrl}
            onDisplayNameChange={onDisplayNameChange}

            //  onChannelURLChange={onChannelURLChange}
            onPurposeChange={onPurposeChange}
            onHeaderChange={onHeaderChange}
            displayName={displayName}

            //  channelURL={channelURL}
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

export default EditChannel;
