// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import moment from 'moment';
import mtz from 'moment-timezone';
import React, {useEffect, useMemo} from 'react';
import {useIntl} from 'react-intl';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {fetchTeamAndChannelMembership} from '@actions/remote/user';
import FormattedText from '@components/formatted_text';
import {Screens} from '@constants';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {getLocaleFromLanguage} from '@i18n';
import BottomSheet from '@screens/bottom_sheet';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';
import {getUserCustomStatus, getUserTimezone, isCustomStatusExpired} from '@utils/user';

import ManageUserOptions, {DIVIDER_MARGIN} from './manage_user_options';
import UserProfileOptions, {OptionsType} from './options';
import UserProfileTitle from './title';
import UserInfo from './user_info';

import type UserModel from '@typings/database/models/servers/user';

const TITLE_HEIGHT = 118;
const OPTIONS_HEIGHT = 82;
const SINGLE_OPTION_HEIGHT = 68;
const LABEL_HEIGHT = 58;
const EXTRA_HEIGHT = 60;
const MANAGE_TITLE_MARGIN = 22;
const MANAGE_TITLE_HEIGHT = 30;
const MANAGE_ICON_HEIGHT = 72;

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        divider: {
            alignSelf: 'center',
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.16),
            height: 1,
            marginVertical: 8,
            paddingHorizontal: 20,
            width: '100%',
        },
        title: {
            color: theme.centerChannelColor,
            marginBottom: MANAGE_TITLE_MARGIN,
            ...typography('Heading', 600, 'SemiBold'),
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
    canManageMembers?: boolean;
    isCustomStatusEnabled: boolean;
    isDirectMessage: boolean;
    isDefaultChannel: boolean;
    isMilitaryTime: boolean;
    isSystemAdmin: boolean;
    isTeamAdmin: boolean;
    location: string;
    manageMode?: boolean;
    teamId: string;
    teammateDisplayName: string;
    user: UserModel;
    userIconOverride?: string;
    usernameOverride?: string;
}

const UserProfile = ({
    channelId, closeButtonId, currentUserId, enablePostIconOverride, enablePostUsernameOverride,
    isChannelAdmin, canManageMembers, isCustomStatusEnabled, isDirectMessage, isDefaultChannel, isMilitaryTime,
    isSystemAdmin, isTeamAdmin, location, manageMode = false, teamId, teammateDisplayName,
    user, userIconOverride, usernameOverride,
}: Props) => {
    const {locale} = useIntl();
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
        if ((!isDirectMessage || !channelContext) && !override && !manageMode) {
            initial += showOptions === 'all' ? OPTIONS_HEIGHT : SINGLE_OPTION_HEIGHT;
        }

        let labels = 0;
        if (!override && !user.isBot && !manageMode) {
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

        if (manageMode) {
            initial += MANAGE_TITLE_HEIGHT + MANAGE_TITLE_MARGIN;
            initial += SINGLE_OPTION_HEIGHT; // remove button
            initial += DIVIDER_MARGIN * 2;
            if (canManageMembers) {
                initial += SINGLE_OPTION_HEIGHT; // roles button
            }
        }

        const extraHeight = manageMode ? 0 : EXTRA_HEIGHT;
        return [initial + insets.bottom + extraHeight, 10];
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
                {manageMode &&
                    <FormattedText
                        id={'mobile.manage_members.manage_member'}
                        defaultMessage={'Manage member'}
                        style={styles.title}
                        testID='user_profile.manage_title'
                    />
                }
                <UserProfileTitle
                    enablePostIconOverride={enablePostIconOverride}
                    enablePostUsernameOverride={enablePostUsernameOverride}
                    isChannelAdmin={isChannelAdmin}
                    isSystemAdmin={isSystemAdmin}
                    isTeamAdmin={isTeamAdmin}
                    imageSize={manageMode ? MANAGE_ICON_HEIGHT : undefined}
                    teammateDisplayName={teammateDisplayName}
                    user={user}
                    userIconOverride={userIconOverride}
                    usernameOverride={usernameOverride}
                />
                {(!isDirectMessage || !channelContext) && !override && !manageMode &&
                    <UserProfileOptions
                        location={location}
                        type={showOptions}
                        username={user.username}
                        userId={user.id}
                    />
                }
                {!manageMode &&
                    <UserInfo
                        localTime={localTime}
                        override={override}
                        showCustomStatus={showCustomStatus}
                        user={user}
                    />
                }
                {manageMode && channelId && canManageMembers &&
                    <ManageUserOptions
                        channelId={channelId}
                        isDefaultChannel={isDefaultChannel}
                        isChannelAdmin={isChannelAdmin}
                        userId={user.id}
                    />
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
