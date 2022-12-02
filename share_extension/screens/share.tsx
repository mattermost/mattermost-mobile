// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import withObservables from '@nozbe/with-observables';
import {useNavigation} from '@react-navigation/native';
import React, {useEffect, useMemo} from 'react';
import {useIntl} from 'react-intl';
import {StyleSheet, View} from 'react-native';
import {from as from$} from 'rxjs';

import DatabaseManager from '@database/manager';
import {getActiveServerUrl} from '@queries/app/servers';
import ContentView from '@share/components/content_view';
import NoMemberships from '@share/components/error/no_memberships';
import NoServers from '@share/components/error/no_servers';
import CloseHeaderButton from '@share/components/header/close_header_button';
import PostButton from '@share/components/header/post_button';
import {hasChannels} from '@share/queries';
import {setShareExtensionState, useShareExtensionServerUrl} from '@share/state';

type Props = {
    hasChannelMemberships: boolean;
    initialServerUrl: string;
    files: SharedItem[];
    linkPreviewUrl?: string;
    message?: string;
    theme: Theme;
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
});

const ShareScreen = ({hasChannelMemberships, initialServerUrl, files, linkPreviewUrl, message, theme}: Props) => {
    const navigator = useNavigation();
    const intl = useIntl();
    const serverUrl = useShareExtensionServerUrl();
    const hasServers = useMemo(() => Object.keys(DatabaseManager.serverDatabases).length > 0, []);
    const serverDb = useMemo(() => {
        try {
            if (!serverUrl) {
                return undefined;
            }

            const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
            return database;
        } catch {
            return undefined;
        }
    }, [serverUrl]);

    useEffect(() => {
        navigator.setOptions({
            title: intl.formatMessage({id: 'share_extension.share_screen.title', defaultMessage: 'Share to Mattermost'}),
        });
    }, [intl.locale]);

    useEffect(() => {
        setShareExtensionState({
            files,
            linkPreviewUrl,
            message,
            serverUrl: initialServerUrl,
        });

        navigator.setOptions({
            headerLeft: () => (<CloseHeaderButton theme={theme}/>),
            headerRight: () => (<PostButton theme={theme}/>),
        });
    }, []);

    return (
        <View style={styles.container}>
            {!hasServers &&
            <NoServers theme={theme}/>
            }
            {hasServers && !hasChannelMemberships &&
            <NoMemberships theme={theme}/>
            }
            {hasServers && hasChannelMemberships && Boolean(serverDb) &&
            <ContentView
                database={serverDb!}
                theme={theme}
            />
            }
        </View>
    );
};

const enhanced = withObservables([], () => ({
    initialServerUrl: from$(getActiveServerUrl()),
    hasChannelMemberships: from$(hasChannels()),
}));

export default enhanced(ShareScreen);
