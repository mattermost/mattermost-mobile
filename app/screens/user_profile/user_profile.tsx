// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import moment from 'moment';
import mtz from 'moment-timezone';
import React, {useEffect, useMemo} from 'react';
import {useIntl} from 'react-intl';
import {View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {fetchTeamAndChannelMembership} from '@actions/remote/user';
import LeaveChannelLabel from '@components/channel_actions/leave_channel_label';
import {Screens} from '@constants';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {getLocaleFromLanguage} from '@i18n';
import BottomSheet from '@screens/bottom_sheet';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {getUserCustomStatus, getUserTimezone, isCustomStatusExpired} from '@utils/user';

import UserProfileCustomStatus from './custom_status';
import UserProfileLabel from './label';
import UserProfileOptions, {OptionsType} from './options';
import UserProfileTitle from './title';

import type UserModel from '@typings/database/models/servers/user';

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        divider: {
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.16),
            height: 1,
            width: '100%',
            alignSelf: 'center',
            marginVertical: 8,
            paddingHorizontal: 20,
        },
    };
});

type Props = {
    channelId?: string;
    closeButtonId: string;
    currentUserId: string;
    enablePostIconOverride: boolean;
    enablePostUsernameOverride: boolean;
    isChannelAdmin: boolean;
    isCustomStatusEnabled: boolean;
    isDirectMessage: boolean;
    isMilitaryTime: boolean;
    isSystemAdmin: boolean;
    isTeamAdmin: boolean;
    location: string;
    teamId: string;
    teammateDisplayName: string;
    user: UserModel;
    isManageable?: boolean;
    userIconOverride?: string;
    usernameOverride?: string;
}

const TITLE_HEIGHT = 118;
const OPTIONS_HEIGHT = 82;
const SINGLE_OPTION_HEIGHT = 68;
const LABEL_HEIGHT = 58;
const EXTRA_HEIGHT = 60;

const UserProfile = ({
    channelId, closeButtonId, currentUserId, enablePostIconOverride, enablePostUsernameOverride,
    isChannelAdmin, isCustomStatusEnabled, isDirectMessage, isManageable = false, isMilitaryTime, isSystemAdmin, isTeamAdmin,
    location, teamId, teammateDisplayName,
    user, userIconOverride, usernameOverride,
}: Props) => {
    const {formatMessage, locale} = useIntl();
    const theme = useTheme();
    const styles = getStyleSheet(theme);
    const serverUrl = useServerUrl();
    const insets = useSafeAreaInsets();
    const channelContext = [Screens.CHANNEL, Screens.THREAD].includes(location);
    const showOptions: OptionsType = channelContext && !user.isBot ? 'all' : 'message';
    const override = Boolean(userIconOverride || usernameOverride);
    const timezone = getUserTimezone(user);
    const customStatus = getUserCustomStatus(user);
    const showCustomStatus = isCustomStatusEnabled && Boolean(customStatus) && !user.isBot && !isCustomStatusExpired(user);

    let localTime: string|undefined;
    if (timezone) {
        moment.locale(getLocaleFromLanguage(locale).toLowerCase());
        let format = 'H:mm';
        if (!isMilitaryTime) {
            const localeFormat = moment.localeData().longDateFormat('LT');
            format = localeFormat?.includes('A') ? localeFormat : 'h:mm A';
        }
        localTime = mtz.tz(Date.now(), timezone).format(format);
    }

    const snapPoints = useMemo(() => {
        let initial = TITLE_HEIGHT;
        if ((!isDirectMessage || !channelContext) && !override) {
            initial += showOptions === 'all' ? OPTIONS_HEIGHT : SINGLE_OPTION_HEIGHT;
        }

        let labels = 0;
        if (!override && !user.isBot) {
            if (showCustomStatus) {
                labels += 1;
            }

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
                {(!isDirectMessage || !channelContext) && !override && !isManageable &&
                    <UserProfileOptions
                        location={location}
                        type={showOptions}
                        username={user.username}
                        userId={user.id}
                    />
                }
                {showCustomStatus && <UserProfileCustomStatus customStatus={customStatus!}/>}
                {Boolean(user.nickname) && !override && !user.isBot &&
                <UserProfileLabel
                    description={user.nickname}
                    testID='user_profile.nickname'
                    title={formatMessage({id: 'channel_info.nickname', defaultMessage: 'Nickname'})}
                />
                }
                {Boolean(user.position) && !override && !user.isBot &&
                <UserProfileLabel
                    description={user.position}
                    testID='user_profile.position'
                    title={formatMessage({id: 'channel_info.position', defaultMessage: 'Position'})}
                />
                }
                {Boolean(localTime) && !override && !user.isBot &&
                <UserProfileLabel
                    description={localTime!}
                    testID='user_profile.local_time'
                    title={formatMessage({id: 'channel_info.local_time', defaultMessage: 'Local Time'})}
                />
                }
                {isManageable && channelId &&
                    <>
                        <View style={styles.divider}/>
                        <LeaveChannelLabel
                            channelId={channelId}
                            manageOption={'remove'}
                            testID='channel.quick_actions.leave_channel.action'
                            isOptionItem={true}
                        />
                    </>
                }
            </>
        );
    };

    return (
        <BottomSheet
            renderContent={renderContent}
            closeButtonId={closeButtonId}
            componentId={Screens.USER_PROFILE}
            initialSnapIndex={0}
            snapPoints={snapPoints}
            testID='user_profile'
        />
    );
};

export default UserProfile;
