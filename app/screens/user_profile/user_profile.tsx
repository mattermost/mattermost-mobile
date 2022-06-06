// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import moment from 'moment-timezone';
import React, {useEffect, useMemo} from 'react';
import {useIntl} from 'react-intl';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {fetchTeamAndChannelMembership} from '@actions/remote/user';
import {useServerUrl} from '@app/context/server';
import {Screens} from '@constants';
import {getLocaleFromLanguage} from '@i18n';
import BottomSheet from '@screens/bottom_sheet';
import {getUserTimezone} from '@utils/user';

import UserProfileLabel from './label';
import UserProfileOptions, {OptionsType} from './options';
import UserProfileTitle from './title';

import type UserModel from '@typings/database/models/servers/user';

type Props = {
    channelId?: string;
    currentUserId: string;
    enablePostIconOverride: boolean;
    enablePostUsernameOverride: boolean;
    isChannelAdmin: boolean;
    isDirectMessage: boolean;
    isMilitaryTime: boolean;
    isSystemAdmin: boolean;
    isTeamAdmin: boolean;
    location: string;
    teamId: string;
    teammateDisplayName: string;
    user: UserModel;
    userIconOverride?: string;
    usernameOverride?: string;
}

const TITLE_HEIGHT = 118;
const OPTIONS_HEIGHT = 82;
const SINGLE_OPTION_HEIGHT = 68;
const LABEL_HEIGHT = 58;
const EXTRA_HEIGHT = 60;

const UserProfile = ({
    channelId, currentUserId, enablePostIconOverride, enablePostUsernameOverride,
    isChannelAdmin, isDirectMessage, isMilitaryTime, isSystemAdmin, isTeamAdmin,
    location, teamId, teammateDisplayName,
    user, userIconOverride, usernameOverride,
}: Props) => {
    const {formatMessage, locale} = useIntl();
    const serverUrl = useServerUrl();
    const insets = useSafeAreaInsets();
    const channelContext = [Screens.CHANNEL, Screens.THREAD].includes(location);
    const showOptions: OptionsType = channelContext && !user.isBot ? 'all' : 'message';
    const override = Boolean(userIconOverride || usernameOverride);
    const timezone = getUserTimezone(user);
    let localTime: string|undefined;
    if (timezone) {
        moment.locale(getLocaleFromLanguage(locale).toLowerCase());
        let format = 'H:mm';
        if (!isMilitaryTime) {
            const localeFormat = moment.localeData().longDateFormat('LT');
            format = localeFormat?.includes('A') ? localeFormat : 'h:mm A';
        }
        localTime = moment.tz(Date.now(), timezone).format(format);
    }

    const snapPoints = useMemo(() => {
        let initial = TITLE_HEIGHT;
        if ((!isDirectMessage || !channelContext) && !override) {
            initial += showOptions === 'all' ? OPTIONS_HEIGHT : SINGLE_OPTION_HEIGHT;
        }

        let labels = 0;
        if (!override && !user.isBot) {
            if (user.nickname) {
                labels += 1;
            }

            if (user.position) {
                labels += 1;
            }

            if (localTime) {
                labels += 1;
            }
            initial += (labels * LABEL_HEIGHT);
        }

        return [initial + insets.bottom + EXTRA_HEIGHT, 10];
    }, [
        isChannelAdmin, isDirectMessage, isSystemAdmin,
        isTeamAdmin, user, localTime, insets.bottom, override,
    ]);

    useEffect(() => {
        if (currentUserId !== user.id) {
            fetchTeamAndChannelMembership(serverUrl, user.id, teamId, channelId);
        }
    }, []);

    const renderContent = () => {
        return (
            <>
                <UserProfileTitle
                    enablePostIconOverride={enablePostIconOverride}
                    enablePostUsernameOverride={enablePostUsernameOverride}
                    isChannelAdmin={isChannelAdmin}
                    isSystemAdmin={isSystemAdmin}
                    isTeamAdmin={isTeamAdmin}
                    teammateDisplayName={teammateDisplayName}
                    user={user}
                    userIconOverride={userIconOverride}
                    usernameOverride={usernameOverride}
                />
                {(!isDirectMessage || !channelContext) && !override &&
                    <UserProfileOptions
                        location={location}
                        type={showOptions}
                        username={user.username}
                        userId={user.id}
                    />
                }
                {Boolean(user.nickname) && !override && !user.isBot &&
                <UserProfileLabel
                    description={user.nickname}
                    title={formatMessage({id: 'channel_info.nickname', defaultMessage: 'Nickname'})}
                />
                }
                {Boolean(user.position) && !override && !user.isBot &&
                <UserProfileLabel
                    description={user.position}
                    title={formatMessage({id: 'channel_info.position', defaultMessage: 'Position'})}
                />
                }
                {Boolean(localTime) && !override && !user.isBot &&
                <UserProfileLabel
                    description={localTime!}
                    title={formatMessage({id: 'channel_info.local_time', defaultMessage: 'Local Time'})}
                />
                }
            </>
        );
    };

    return (
        <BottomSheet
            renderContent={renderContent}
            closeButtonId='close-post-options'
            componentId={Screens.USER_PROFILE}
            initialSnapIndex={0}
            snapPoints={snapPoints}
            testID='post_options'
        />
    );
};

export default UserProfile;
