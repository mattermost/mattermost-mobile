// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React from 'react';
import {useIntl} from 'react-intl';
import {Text, TouchableOpacity, View} from 'react-native';

import FormattedText from '@components/formatted_text';
import JoinPrivateChannel from '@components/illustrations/join_private_channel';
import JoinPublicChannel from '@components/illustrations/join_public_channel';
import MessageNotViewable from '@components/illustrations/message_not_viewable';
import Markdown from '@components/markdown';
import {useTheme} from '@context/theme';
import {getMarkdownBlockStyles, getMarkdownTextStyles} from '@utils/markdown';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import {ErrorType} from './common';

type Props = {
    error: ErrorType;
    handleClose: () => void;
    handleJoin: () => void;
}

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    const buttonText = typography('Body', 200, 'SemiBold');
    const button = {
        borderRadius: 4,
        alignItems: 'center',
        justifyContent: 'center',
        height: 48,
    };

    return {
        errorContainer: {
            alignItems: 'center',
            justifyContent: 'center',
            marginHorizontal: 36,
            flex: 1,
        },
        errorTitle: {
            color: theme.centerChannelColor,
            textAlign: 'center',
            ...typography('Heading', 600, 'SemiBold'),
            marginTop: 8,
            marginBottom: 16,
        },
        errorText: {
            textAlign: 'center',
            color: theme.centerChannelColor,
            ...typography('Body', 200, 'Regular'),
        },
        errorTextParagraph: {
            textAlign: 'center',
        },
        errorButtonContainer: {
            borderTopWidth: 1,
            borderTopColor: changeOpacity(theme.centerChannelColor, 0.16),
            padding: 20,
        },
        errorDarkButton: {
            ...button,
            backgroundColor: theme.buttonBg,
        },
        errorDarkButtonText: {
            color: theme.buttonColor,
            ...buttonText,
        },
        errorLightButton: {
            ...button,
            marginTop: 8,
            backgroundColor: changeOpacity(theme.buttonBg, 0.08),
        },
        errorLightButtonText: {
            color: theme.buttonBg,
            ...buttonText,
        },
    };
});

function PermalinkError({
    error,
    handleClose,
    handleJoin,
}: Props) {
    const theme = useTheme();
    const style = getStyleSheet(theme);
    const intl = useIntl();

    if (error.notExist || error.unreachable) {
        const title = intl.formatMessage({id: 'permalink.error.access.title', defaultMessage: 'Message not viewable'});
        const text = intl.formatMessage({id: 'permalink.error.access.text', defaultMessage: 'The message you are trying to view is in a channel you don’t have access to or has been deleted.'});
        return (
            <>
                <View style={style.errorContainer}>
                    <MessageNotViewable theme={theme}/>
                    <Text style={style.errorTitle}>{title}</Text>
                    <Text style={style.errorText}>{text}</Text>
                </View>
                <View style={style.errorButtonContainer}>
                    <TouchableOpacity
                        style={style.errorDarkButton}
                        onPress={handleClose}
                    >
                        <FormattedText
                            testID='permalink.error.okay'
                            id='permalink.error.okay'
                            defaultMessage='Okay'
                            style={style.errorDarkButtonText}
                        />
                    </TouchableOpacity>
                </View>
            </>
        );
    }

    const isPrivate = error.privateChannel || error.privateTeam;
    let image;
    let title;
    let text;
    let button;
    if (isPrivate && error.joinedTeam) {
        image = (<JoinPrivateChannel theme={theme}/>);
        title = intl.formatMessage({id: 'permalink.error.private_channel_and_team.title', defaultMessage: 'Join private channel and team'});
        text = intl.formatMessage({id: 'permalink.error.private_channel_and_team.text', defaultMessage: 'The message you are trying to view is in a private channel in a team you are not a member of. You have access as an admin. Do you want to join **{channelName}** and the **{teamName}** team to view it?'}, {channelName: error.channelName, teamName: error.teamName});
        button = intl.formatMessage({id: 'permalink.error.private_channel_and_team.button', defaultMessage: 'Join channel and team'});
    } else if (isPrivate) {
        image = (<JoinPrivateChannel theme={theme}/>);
        title = intl.formatMessage({id: 'permalink.error.private_channel.title', defaultMessage: 'Join private channel'});
        text = intl.formatMessage({id: 'permalink.error.private_channel.text', defaultMessage: 'The message you are trying to view is in a private channel you have not been invited to, but you have access as an admin. Do you still want to join **{channelName}**?'}, {channelName: error.channelName});
        button = intl.formatMessage({id: 'permalink.error.private_channel.button', defaultMessage: 'Join channel'});
    } else if (error.joinedTeam) {
        image = (<JoinPublicChannel theme={theme}/>);
        title = intl.formatMessage({id: 'permalink.error.public_channel_and_team.title', defaultMessage: 'Join channel and team'});
        text = intl.formatMessage({id: 'permalink.error.public_channel_and_team.text', defaultMessage: 'The message you are trying to view is in a channel you don’t belong and a team you are not a member of. Do you want to join **{channelName}** and the **{teamName}** team to view it?'}, {channelName: error.channelName, teamName: error.teamName});
        button = intl.formatMessage({id: 'permalink.error.public_channel_and_team.button', defaultMessage: 'Join channel and team'});
    } else {
        image = (<JoinPublicChannel theme={theme}/>);
        title = intl.formatMessage({id: 'permalink.error.public_channel.title', defaultMessage: 'Join channel'});
        text = intl.formatMessage({id: 'permalink.error.public_channel.text', defaultMessage: 'The message you are trying to view is in a channel you don’t belong to. Do you want to join **{channelName}** to view it?'}, {channelName: error.channelName});
        button = intl.formatMessage({id: 'permalink.error.public_channel.button', defaultMessage: 'Join channel'});
    }
    return (
        <>
            <View style={style.errorContainer}>
                {image}
                <Text style={style.errorTitle}>{title}</Text>
                <Markdown
                    theme={theme}
                    value={text}
                    baseTextStyle={style.errorText}
                    baseParagraphStyle={style.errorTextParagraph}
                    disableAtMentions={true}
                    disableAtChannelMentionHighlight={true}
                    disableChannelLink={true}
                    disableGallery={true}
                    disableHashtags={true}
                    textStyles={getMarkdownTextStyles(theme)}
                    blockStyles={getMarkdownBlockStyles(theme)}
                />
            </View>
            <View style={style.errorButtonContainer}>
                <TouchableOpacity
                    style={style.errorDarkButton}
                    onPress={handleJoin}
                >
                    <Text style={style.errorDarkButtonText}>{button}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={style.errorLightButton}
                    onPress={handleClose}
                >
                    <FormattedText
                        testID='permalink.error.cancel'
                        id='permalink.error.cancel'
                        defaultMessage='Cancel'
                        style={style.errorLightButtonText}
                    />
                </TouchableOpacity>
            </View>
        </>
    );
}

export default PermalinkError;
