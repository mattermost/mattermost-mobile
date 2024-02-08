// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useEffect, useRef, useState} from 'react';
import {useIntl} from 'react-intl';

import {fetchChannelMemberships, fetchGroupMessageMembersCommonTeams} from '@actions/remote/channel';
import {PER_PAGE_DEFAULT} from '@client/rest/constants';
import Loading from '@components/loading';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import ConvertGMToChannelForm from './convert_gm_to_channel_form';

type Props = {
    channelId: string;
    currentUserId?: string;
}

const loadingIndicatorTimeout = 1200;

const matchUserProfiles = (users: UserProfile[], members: ChannelMembership[], currentUserId: string) => {
    // Gotta make sure we use profiles that are in members.
    // See comment in fetchChannelMemberships for more details.

    const usersById: {[id: string]: UserProfile} = {};
    users.forEach((profile) => {
        if (profile.id !== currentUserId) {
            usersById[profile.id] = profile;
        }
    });

    const filteredUsers: UserProfile[] = [];
    members.forEach((member) => {
        if (usersById[member.user_id]) {
            filteredUsers.push(usersById[member.user_id]);
        }
    });

    return filteredUsers;
};

const getStyleFromTheme = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        loadingContainer: {
            justifyContent: 'center',
            alignItems: 'center',
            flex: 1,
            gap: 24,
        },
        text: {
            color: changeOpacity(theme.centerChannelColor, 0.56),
            ...typography('Body', 300, 'SemiBold'),
        },
        container: {
            paddingVertical: 24,
            paddingHorizontal: 20,
            display: 'flex',
            flexDirection: 'column',
            gap: 24,
        },
    };
});

const ConvertGMToChannel = ({
    channelId,
    currentUserId,
}: Props) => {
    const theme = useTheme();
    const styles = getStyleFromTheme(theme);

    const {formatMessage} = useIntl();

    const [loadingAnimationTimeout, setLoadingAnimationTimeout] = useState(false);
    const [commonTeamsFetched, setCommonTeamsFetched] = useState(false);
    const [channelMembersFetched, setChannelMembersFetched] = useState(false);
    const [commonTeams, setCommonTeams] = useState<Team[]>([]);
    const [profiles, setProfiles] = useState<UserProfile[]>([]);

    const serverUrl = useServerUrl();
    const mounted = useRef(false);

    const loadingAnimationTimeoutRef = useRef<NodeJS.Timeout>();

    useEffect(() => {
        loadingAnimationTimeoutRef.current = setTimeout(() => setLoadingAnimationTimeout(true), loadingIndicatorTimeout);
        async function work() {
            const {teams} = await fetchGroupMessageMembersCommonTeams(serverUrl, channelId);
            if (!teams || !mounted.current) {
                return;
            }
            setCommonTeams(teams);
            setCommonTeamsFetched(true);
        }

        work();

        return () => {
            clearTimeout(loadingAnimationTimeoutRef.current);
        };
    }, []);

    useEffect(() => {
        mounted.current = true;

        return () => {
            mounted.current = false;
        };
    }, []);

    useEffect(() => {
        if (!currentUserId) {
            return;
        }

        const options: GetUsersOptions = {sort: 'admin', active: true, per_page: PER_PAGE_DEFAULT};
        fetchChannelMemberships(serverUrl, channelId, options, true).then(({users, members}) => {
            if (!mounted.current) {
                return;
            }

            if (users.length) {
                setProfiles(matchUserProfiles(users, members, currentUserId));
            }

            setChannelMembersFetched(true);
        });
    }, [serverUrl, channelId, currentUserId]);

    const showLoader = !loadingAnimationTimeout || !commonTeamsFetched || !channelMembersFetched;

    if (showLoader) {
        return (
            <Loading
                containerStyle={styles.loadingContainer}
                size='large'
                color={theme.buttonBg}
                footerText={formatMessage({id: 'channel_info.convert_gm_to_channel.loading.footer', defaultMessage: 'Fetching details...'})}
                footerTextStyles={styles.text}
            />
        );
    }

    return (
        <ConvertGMToChannelForm
            commonTeams={commonTeams}
            profiles={profiles}
            channelId={channelId}
        />
    );
};

export default ConvertGMToChannel;
