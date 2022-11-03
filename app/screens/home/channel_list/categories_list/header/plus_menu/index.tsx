// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {useIntl} from 'react-intl';
import {Platform} from 'react-native';
import Share from 'react-native-share';
import {ShareOptions} from 'react-native-share/lib/typescript/types';

import CompassIcon from '@components/compass_icon';
import {Screens} from '@constants';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {dismissBottomSheet, showModal} from '@screens/navigation';

import PlusMenuItem from './item';
import PlusMenuSeparator from './separator';

type Props = {
    canCreateChannels: boolean;
    canJoinChannels: boolean;
    canInvitePeople: boolean;
    displayName?: string;
    inviteId?: string;
}

const PlusMenuList = ({canCreateChannels, canJoinChannels, canInvitePeople, displayName, inviteId}: Props) => {
    const intl = useIntl();
    const theme = useTheme();
    const serverUrl = useServerUrl();

    const browseChannels = useCallback(async () => {
        await dismissBottomSheet();

        const title = intl.formatMessage({id: 'browse_channels.title', defaultMessage: 'Browse channels'});
        const closeButton = await CompassIcon.getImageSource('close', 24, theme.sidebarHeaderTextColor);

        showModal(Screens.BROWSE_CHANNELS, title, {
            closeButton,
        });
    }, [intl, theme]);

    const createNewChannel = useCallback(async () => {
        await dismissBottomSheet();

        const title = intl.formatMessage({id: 'mobile.create_channel.title', defaultMessage: 'New channel'});
        showModal(Screens.CREATE_OR_EDIT_CHANNEL, title);
    }, [intl]);

    const openDirectMessage = useCallback(async () => {
        await dismissBottomSheet();

        const title = intl.formatMessage({id: 'create_direct_message.title', defaultMessage: 'Create Direct Message'});
        const closeButton = await CompassIcon.getImageSource('close', 24, theme.sidebarHeaderTextColor);
        showModal(Screens.CREATE_DIRECT_MESSAGE, title, {
            closeButton,
        });
    }, [intl, theme]);

    const invitePeopleToTeam = async () => {
        await dismissBottomSheet();

        const url = `${serverUrl}/signup_user_complete/?id=${inviteId}`;
        const title = intl.formatMessage({id: 'invite_people_to_team.title', defaultMessage: 'Join the {team} team'}, {team: displayName});
        const message = intl.formatMessage({id: 'invite_people_to_team.message', defaultMessage: 'Here’s a link to collaborate and communicate with us on Mattermost.'});
        const icon = 'data:<data_type>/<file_extension>;base64,<base64_data>';

        const options: ShareOptions = Platform.select({
            ios: {
                activityItemSources: [
                    {
                        placeholderItem: {
                            type: 'url',
                            content: url,
                        },
                        item: {
                            default: {
                                type: 'text',
                                content: `${message} ${url}`,
                            },
                            copyToPasteBoard: {
                                type: 'url',
                                content: url,
                            },
                        },
                        subject: {
                            default: title,
                        },
                        linkMetadata: {
                            originalUrl: url,
                            url,
                            title,
                            icon,
                        },
                    },
                ],
            },
            default: {
                title,
                subject: title,
                url,
                showAppsToView: true,
            },
        });

        Share.open(
            options,
        ).catch(() => {
            // do nothing
        });
    };

    return (
        <>
            {canJoinChannels &&
            <PlusMenuItem
                pickerAction='browseChannels'
                onPress={browseChannels}
            />
            }
            {canCreateChannels &&
            <PlusMenuItem
                pickerAction='createNewChannel'
                onPress={createNewChannel}
            />
            }
            <PlusMenuItem
                pickerAction='openDirectMessage'
                onPress={openDirectMessage}
            />
            {canInvitePeople &&
            <>
                <PlusMenuSeparator/>
                <PlusMenuItem
                    pickerAction='invitePeopleToTeam'
                    onPress={invitePeopleToTeam}
                />
            </>
            }
        </>
    );
};

export default PlusMenuList;
