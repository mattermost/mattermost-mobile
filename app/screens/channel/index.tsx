// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import React, {useMemo, useState} from 'react';
import {Text, View, ScrollView} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';

import {logout} from '@actions/remote/session';
import ServerVersion from '@components/server_version';
import StatusBar from '@components/status_bar';
import {MM_TABLES, SYSTEM_IDENTIFIERS} from '@constants/database';
import {useServerUrl} from '@context/server_url';
import {useTheme} from '@context/theme';
import {makeStyleSheetFromTheme} from '@utils/theme';

import ChannelNavBar from './channel_nav_bar';

import type SystemModel from '@typings/database/models/servers/system';
import type {LaunchProps} from '@typings/launch';
import type {WithDatabaseArgs} from '@typings/database/database';

import FailedChannels from './failed_channels';
import FailedTeams from './failed_teams';

import Markdown from '@components/markdown';
import {getMarkdownBlockStyles, getMarkdownTextStyles} from '@utils/markdown';
import md from './md.json';
import ProgressiveImage from '@components/progressive_image';
import JumboEmoji from '@components/jumbo_emoji';

type ChannelProps = WithDatabaseArgs & LaunchProps & {
    currentChannelId: SystemModel;
    currentTeamId: SystemModel;
    time?: number;
};

const {SERVER: {SYSTEM}} = MM_TABLES;

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    flex: {
        flex: 1,
    },
    sectionContainer: {
        marginTop: 32,
        paddingHorizontal: 24,
    },
    sectionTitle: {
        fontSize: 24,
        fontWeight: '600',
        color: theme.centerChannelColor,
    },
}));

const Channel = ({currentChannelId, currentTeamId, time}: ChannelProps) => {
    // TODO: If we have LaunchProps, ensure we load the correct channel/post/modal.
    // TODO: If LaunchProps.error is true, use the LaunchProps.launchType to determine which
    // error message to display. For example:
    // if (props.launchError) {
    //     let erroMessage;
    //     if (props.launchType === LaunchType.DeepLink) {
    //         errorMessage = intl.formatMessage({id: 'mobile.launchError.deepLink', defaultMessage: 'Did not find a server for this deep link'});
    //     } else if (props.launchType === LaunchType.Notification) {
    //         errorMessage = intl.formatMessage({id: 'mobile.launchError.notification', defaultMessage: 'Did not find a server for this notification'});
    //     }
    // }

    //todo: https://mattermost.atlassian.net/browse/MM-37266

    const theme = useTheme();
    const styles = getStyleSheet(theme);

    const serverUrl = useServerUrl();

    const doLogout = () => {
        logout(serverUrl!);
    };

    const renderComponent = useMemo(() => {
        if (!currentTeamId.value) {
            return <FailedTeams/>;
        }

        if (!currentChannelId.value) {
            return <FailedChannels teamId={currentTeamId.value}/>;
        }

        return (
            <ChannelNavBar
                channelId={currentChannelId.value}
                onPress={() => null}
            />
        );
    }, [currentTeamId.value, currentChannelId.value]);

    const textStyle = getMarkdownTextStyles(theme);
    const blockStyle = getMarkdownBlockStyles(theme);
    const [inViewport, setInViewport] = useState(false);

    setTimeout(async () => {
        setInViewport(true);
    }, 3000);

    return (
        <SafeAreaView
            style={styles.flex}
            mode='margin'
            edges={['left', 'right', 'bottom']}
        >
            <ServerVersion/>
            <StatusBar theme={theme}/>
            {renderComponent}
            <ScrollView style={{paddingHorizontal: 10, width: '100%'}}>
                <ProgressiveImage
                    id='file-123'
                    thumbnailUri='data:image/png;base64,/9j/2wCEAAMCAgMCAgMDAwMEAwMEBQgFBQQEBQoHBwYIDAoMDAsKCwsNDhIQDQ4RDgsLEBYQERMUFRUVDA8XGBYUGBIUFRQBAwQEBQQFCQUFCRQNCw0UFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFP/AABEIABAAEAMBIgACEQEDEQH/xAGiAAABBQEBAQEBAQAAAAAAAAAAAQIDBAUGBwgJCgsQAAIBAwMCBAMFBQQEAAABfQECAwAEEQUSITFBBhNRYQcicRQygZGhCCNCscEVUtHwJDNicoIJChYXGBkaJSYnKCkqNDU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6g4SFhoeIiYqSk5SVlpeYmZqio6Slpqeoqaqys7S1tre4ubrCw8TFxsfIycrS09TV1tfY2drh4uPk5ebn6Onq8fLz9PX29/j5+gEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoLEQACAQIEBAMEBwUEBAABAncAAQIDEQQFITEGEkFRB2FxEyIygQgUQpGhscEJIzNS8BVictEKFiQ04SXxFxgZGiYnKCkqNTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqCg4SFhoeIiYqSk5SVlpeYmZqio6Slpqeoqaqys7S1tre4ubrCw8TFxsfIycrS09TV1tfY2dri4+Tl5ufo6ery8/T19vf4+fr/2gAMAwEAAhEDEQA/APcrv4uftAfbNW1XT57Gz0C+1DUEgTVbWMS2EaFY4mO5lEajggNnJJZuDivYPh38Ytd/4Te8tteS4uvDs32aystTSS2lSa4bP7wLE25EYf3hzkEACuX+Ln7M3jjXvGmoax4f8X3EenapcK0ulmGF4owTM8rESq3BUQx4HUuSeBUfwI+BvxC0b4gWmp+Kp4ptJswZLv7dMJZ726MWFkUKm3EZJG7IJz/EAKebYepiqdLFUJqM4JpRi7J3a1mtOa1u+iv1aPppYjCqVWChBxkm9ndbe6m9mraadX0vb//Z'
                    imageUri='http://192.168.1.6:8065/api/v4/files/9rcknudg9ig9xkz515faj374pw/preview'
                    resizeMode='contain'
                    onError={() => true}
                    style={{width: 322.72727272727275, height: 132.96363636363637}}
                    inViewPort={inViewport}
                />
                <JumboEmoji
                    isEdited={true}
                    baseTextStyle={{
                        color: theme.centerChannelColor,
                        fontSize: 15,
                        lineHeight: 20,
                    }}
                    value={md.jumbo}
                />
                <Markdown
                    value={md.value}
                    theme={theme}
                    textStyles={textStyle}
                    blockStyles={blockStyle}
                    isEdited={true}
                    baseTextStyle={{
                        color: theme.centerChannelColor,
                        fontSize: 15,
                        lineHeight: 20,
                    }}
                    mentionKeys={[{
                        key: 'Elias',
                        caseSensitive: false,
                    }]}
                    imagesMetadata={md.imagesMetadata}
                    channelMentions={md.channelMentions}
                />
                <View style={styles.sectionContainer}>
                    <Text
                        onPress={doLogout}
                        style={styles.sectionTitle}
                    >
                        {`Loaded in: ${time || 0}ms. Logout from ${serverUrl}`}
                    </Text>
                </View>
            </ScrollView>

        </SafeAreaView>
    );
};

const withSystemIds = withObservables([], ({database}: WithDatabaseArgs) => ({
    currentChannelId: database.collections.get(SYSTEM).findAndObserve(SYSTEM_IDENTIFIERS.CURRENT_CHANNEL_ID),
    currentTeamId: database.collections.get(SYSTEM).findAndObserve(SYSTEM_IDENTIFIERS.CURRENT_TEAM_ID),
}));

export default withDatabase(withSystemIds(Channel));
