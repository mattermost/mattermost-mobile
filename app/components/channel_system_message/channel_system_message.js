// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import PropTypes from 'prop-types';
import React from 'react';

import {Posts} from 'mattermost-redux/constants';
import FormattedMarkdownText from 'app/components/formatted_markdown_text';
import {changeOpacity, makeStyleSheetFromTheme} from 'app/utils/theme';
import {ViewTypes} from 'app/constants';

export default class ChannelSystemMessage extends React.PureComponent {
    static propTypes = {
        post: PropTypes.object.isRequired,
        theme: PropTypes.object.isRequired,
        navigator: PropTypes.object.isRequired,
        textStyles: PropTypes.object.isRequired,
    };

    render() {
        const {post, theme, navigator, textStyles} = this.props;

        const style = getStyleSheet(theme);

        const systemMessageRenderers = {
            [Posts.POST_TYPES.HEADER_CHANGE]: renderHeaderChangeMessage,
            [Posts.POST_TYPES.DISPLAYNAME_CHANGE]: renderDisplayNameChangeMessage,
            [Posts.POST_TYPES.PURPOSE_CHANGE]: renderPurposeChangeMessage,
            [Posts.POST_TYPES.CHANNEL_DELETED]: renderChannelDeletedMessage,
        };

        return post.type ? systemMessageRenderers[post.type](post, navigator, style, textStyles, theme) : null;
    }
}

const getStyleSheet = makeStyleSheetFromTheme(theme => {
    const stdPadding = 12;
    return {
        main: {
            flexDirection: 'row',
            paddingTop: stdPadding,
        },
        iconContainer: {
            paddingRight: stdPadding,
            paddingLeft: stdPadding,
            width: (stdPadding * 2) + ViewTypes.PROFILE_PICTURE_SIZE,
        },
        textContainer: {
            paddingBottom: 10,
            flex: 1,
            marginRight: stdPadding,
        },
        messageContainer: {
            marginTop: 3,
        },
        displayName: {
            color: theme.centerChannelColor,
            fontSize: 15,
            fontWeight: '600',
        },
        message: {
            color: changeOpacity(theme.centerChannelColor, 0.8),
            fontSize: 15,
            lineHeight: 22,
        },
    };
});

const renderUsername = (name) => {
    return (name[0] === '@') ? name : `@${name}`;
};

const renderDisplayNameChangeMessage = (post, navigator, style, textStyles, theme) => {
    if (!(post.props.username && post.props.old_displayname && post.props.new_displayname)) {
        return null;
    }
    const username = renderUsername(post.props.username);
    const oldDisplayName = post.props.old_displayname;
    const newDisplayName = post.props.new_displayname;
    return (
        <FormattedMarkdownText
            id='api.channel.post_update_channel_displayname_message_and_forget.updated_from'
            defaultMessage='{username} updated the channel display name from: {old} to: {new}'
            style={style.baseText}
            navigator={navigator}
            textStyles={textStyles}
            theme={theme}
            values={{
                username,
                old: oldDisplayName,
                new: newDisplayName,
            }}
        />
    );
};

const renderPurposeChangeMessage = (post, navigator, style, textStyles, theme) => {
    if (!post.props.username) {
        return null;
    }
    const username = renderUsername(post.props.username);
    const oldPurpose = post.props.old_purpose;
    const newPurpose = post.props.new_purpose;
    if (post.props.new_purpose) {
        if (post.props.old_purpose) {
            return (
                <FormattedMarkdownText
                    id='app.channel.post_update_channel_purpose_message.updated_from'
                    defaultMessage='{username} updated the channel purpose from: {old} to: {new}'
                    style={style.baseText}
                    navigator={navigator}
                    textStyles={textStyles}
                    theme={theme}
                    values={{
                        username,
                        old: oldPurpose,
                        new: newPurpose,
                    }}
                />
            );
        }
        return (
            <FormattedMarkdownText
                id='app.channel.post_update_channel_purpose_message.updated_to'
                defaultMessage='{username} updated the channel purpose to: {new}'
                style={style.baseText}
                navigator={navigator}
                theme={theme}
                textStyles={textStyles}
                values={{
                    username,
                    new: newPurpose,
                }}
            />
        );
    } else if (post.props.old_purpose) {
        return (
            <FormattedMarkdownText
                id='app.channel.post_update_channel_purpose_message.removed'
                defaultMessage='{username} removed the channel purpose (was: {old})'
                style={style.baseText}
                navigator={navigator}
                textStyles={textStyles}
                theme={theme}
                values={{
                    username,
                    old: oldPurpose,
                }}
            />
        );
    }
    return null;
}

const renderChannelDeletedMessage = (post, navigator, style, textStyles, theme) => {
    if (!post.props.username) {
        return null;
    }
    const username = renderUsername(post.props.username);
    return (
        <FormattedMarkdownText
            id='api.channel.delete_channel.archived'
            defaultMessage='{username} has archived the channel.'
            values={{username}}
            style={style.baseText}
            navigator={navigator}
            textStyles={textStyles}
            theme={theme}
        />
    );
};

const renderHeaderChangeMessage = (post, navigator, style, textStyles, theme) => {
    if (!post.props.username) {
        return null;
    }
    const username = renderUsername(post.props.username);
    const oldHeader = post.props.old_header ? post.props.old_header : null;
    const newHeader = post.props.new_header ? post.props.new_header : null;
    if (post.props.new_header) {
        if (post.props.old_header) {
            return (
                <FormattedMarkdownText
                    id='api.channel.post_update_channel_header_message_and_forget.updated_from'
                    defaultMessage='{username} updated the channel header from: {old} to: {new}'
                    navigator={navigator}
                    textStyles={textStyles}
                    theme={theme}
                    values={{
                        username,
                        old: oldHeader,
                        new: newHeader,
                    }}
                />
            );
        }
        return (
            <FormattedMarkdownText
                id='api.channel.post_update_channel_header_message_and_forget.updated_to'
                defaultMessage='{username} updated the channel header to: {new}'
                values={{
                    username,
                    new: newHeader,
                }}
                navigator={navigator}
                textStyles={textStyles}
                theme={theme}
                style={style.baseText}
            />
        );
    } else if (post.props.old_header) {
        return (
            <FormattedMarkdownText
                id='api.channel.post_update_channel_header_message_and_forget.removed'
                defaultMessage='{username} removed the channel header (was: {old})'
                style={style.baseText}
                navigator={navigator}
                textStyles={textStyles}
                theme={theme}
                values={{
                    username,
                    old: oldHeader,
                }}
            />
        );
    }
    return null;
};
