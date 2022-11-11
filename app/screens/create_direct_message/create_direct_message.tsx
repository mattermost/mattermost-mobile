// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useReducer, useRef, useState} from 'react';
import {defineMessages, useIntl} from 'react-intl';

import {makeDirectChannel, makeGroupChannel} from '@actions/remote/channel';
import {fetchProfiles, fetchProfilesInTeam, searchProfiles} from '@actions/remote/user';
import CompassIcon from '@components/compass_icon';
import {General} from '@constants';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {debounce} from '@helpers/api/general';
import {t} from '@i18n';
import MembersModal from '@screens/members_modal';
import {setButtons} from '@screens/navigation';
import {alertErrorWithFallback} from '@utils/draft';
import {displayUsername} from '@utils/user';

const START_BUTTON = 'start-conversation';
const CLOSE_BUTTON = 'close-dms';

const messages = defineMessages({
    dm: {
        id: 'mobile.open_dm.error',
        defaultMessage: "We couldn't open a direct message with {displayName}. Please check your connection and try again.",
    },
    gm: {
        id: t('mobile.open_gm.error'),
        defaultMessage: "We couldn't open a group message with those users. Please check your connection and try again.",
    },
});

type Props = {
    componentId: string;
    currentTeamId: string;
    restrictDirectMessage: boolean;
    teammateNameDisplay: string;
}

function reduceProfiles(state: UserProfile[], action: {type: 'add'; values?: UserProfile[]}) {
    if (action.type === 'add' && action.values?.length) {
        return [...state, ...action.values];
    }
    return state;
}

export default function CreateDirectMessage({
    componentId,
    currentTeamId,
    restrictDirectMessage,
    teammateNameDisplay,
}: Props) {
    const serverUrl = useServerUrl();
    const theme = useTheme();
    const intl = useIntl();
    const {formatMessage} = intl;

    const next = useRef(true);
    const page = useRef(-1);
    const mounted = useRef(false);

    const [profiles, dispatchProfiles] = useReducer(reduceProfiles, []);
    const [loading, setLoading] = useState(false);
    const [term, setTerm] = useState('');
    const [startingConversation, setStartingConversation] = useState(false);
    const [selectedIds, setSelectedIds] = useState<{[id: string]: UserProfile}>({});
    const selectedCount = Object.keys(selectedIds).length;

    const isSearch = Boolean(term);

    const loadedProfiles = ({users}: {users?: UserProfile[]}) => {
        if (mounted.current) {
            if (users && !users.length) {
                next.current = false;
            }

            page.current += 1;
            setLoading(false);
            dispatchProfiles({type: 'add', values: users});
        }
    };

    const getProfiles = useCallback(debounce(() => {
        if (next.current && !loading && !term && mounted.current) {
            setLoading(true);
            if (restrictDirectMessage) {
                fetchProfilesInTeam(serverUrl, currentTeamId, page.current + 1, General.PROFILE_CHUNK_SIZE).then(loadedProfiles);
            } else {
                fetchProfiles(serverUrl, page.current + 1, General.PROFILE_CHUNK_SIZE).then(loadedProfiles);
            }
        }
    }, 100), [loading, isSearch, restrictDirectMessage, serverUrl, currentTeamId]);

    const createDirectChannel = useCallback(async (id: string): Promise<boolean> => {
        const user = selectedIds[id];
        const displayName = displayUsername(user, intl.locale, teammateNameDisplay);

        const result = await makeDirectChannel(serverUrl, id, displayName);
        if (result.error) {
            alertErrorWithFallback(intl, result.error, messages.dm, {displayName});
        }
        return !result.error;
    }, [selectedIds, intl.locale, teammateNameDisplay, serverUrl]);

    const createGroupChannel = useCallback(async (ids: string[]): Promise<boolean> => {
        const result = await makeGroupChannel(serverUrl, ids);
        if (result.error) {
            alertErrorWithFallback(intl, result.error, messages.gm);
        }
        return !result.error;
    }, [serverUrl]);

    const startConversationFunc = useCallback(async (selectedId?: {[id: string]: boolean}) => {
        const idsToUse = selectedId ? Object.keys(selectedId) : Object.keys(selectedIds);
        let func;
        if (idsToUse.length > 1) {
            func = createGroupChannel(idsToUse);
        } else {
            func = createDirectChannel(idsToUse[0]);
        }
        return func;
    }, [selectedIds, createGroupChannel, createDirectChannel]);

    const searchUsersFunc = useCallback(async (searchTerm: string) => {
        const lowerCasedTerm = searchTerm.toLowerCase();
        let func;
        if (restrictDirectMessage) {
            func = searchProfiles(serverUrl, lowerCasedTerm, {team_id: currentTeamId, allow_inactive: true});
        } else {
            func = searchProfiles(serverUrl, lowerCasedTerm, {allow_inactive: true});
        }
        return func;
    }, [restrictDirectMessage, serverUrl, currentTeamId]);

    const updateNavigationButtons = useCallback(async (startEnabled: boolean) => {
        const closeIcon = await CompassIcon.getImageSource('close', 24, theme.sidebarHeaderTextColor);
        setButtons(componentId, {
            leftButtons: [{
                id: CLOSE_BUTTON,
                icon: closeIcon,
                testID: 'close.create_direct_message.button',
            }],
            rightButtons: [{
                color: theme.sidebarHeaderTextColor,
                id: START_BUTTON,
                text: formatMessage({id: 'mobile.create_direct_message.start', defaultMessage: 'Start'}),
                showAsAction: 'always',
                enabled: startEnabled,
                testID: 'create_direct_message.start.button',
            }],
        });
    }, [intl.locale, theme]);

    useEffect(() => {
        mounted.current = true;
        updateNavigationButtons(false);
        getProfiles();
        return () => {
            mounted.current = false;
        };
    }, []);

    useEffect(() => {
        const canStart = selectedCount > 0 && !startingConversation;
        updateNavigationButtons(canStart);
    }, [selectedCount > 0, startingConversation, updateNavigationButtons]);

    return (
        <MembersModal
            componentId={componentId}
            getProfiles={getProfiles}
            loading={loading}
            page={page}
            profiles={profiles}
            searchUsersFunc={searchUsersFunc}
            selectedIds={selectedIds}
            setLoading={setLoading}
            setSelectedIds={setSelectedIds}
            setStartingConversation={setStartingConversation}
            setTerm={setTerm}
            startConversationFunc={startConversationFunc}
            startingConversation={startingConversation}
            term={term}
        />
    );
}

