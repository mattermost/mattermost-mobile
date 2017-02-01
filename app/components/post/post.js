// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React from 'react';
import {
    StyleSheet,
    Text,
    View
} from 'react-native';

import FormattedText from 'app/components/formatted_text';
import FormattedTime from 'app/components/formatted_time';
import MattermostIcon from 'app/components/mattermost_icon';
import ProfilePicture from 'app/components/profile_picture';
import {makeStyleSheetFromTheme} from 'app/utils/theme';

import {isSystemMessage} from 'service/utils/post_utils.js';

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return StyleSheet.create({
        container: {
            backgroundColor: theme.centerChannelBg,
            flexDirection: 'row'
        },
        rightColumn: {
            flexGrow: 1,
            flexDirection: 'column',
            marginRight: 12
        },
        postInfoContainer: {
            alignItems: 'center',
            flexDirection: 'row',
            marginTop: 10
        },
        messageContainerWithReplyBar: {
            flexDirection: 'row'
        },
        profilePictureContainer: {
            marginBottom: 10,
            marginRight: 10,
            marginLeft: 12,
            marginTop: 10
        },
        replyBar: {
            backgroundColor: theme.centerChannelColor,
            opacity: 0.1,
            marginRight: 10,
            width: 3
        },
        replyBarFirst: {
            marginTop: 10
        },
        replyBarLast: {
            marginBottom: 10
        },
        displayName: {
            fontSize: 14,
            fontWeight: '600',
            marginRight: 10,
            color: theme.centerChannelColor
        },
        time: {
            color: theme.centerChannelColor,
            fontSize: 12,
            opacity: 0.5
        },
        commentedOn: {
            color: theme.centerChannelColor,
            lineHeight: 21
        },
        message: {
            color: theme.centerChannelColor,
            fontSize: 14,
            lineHeight: 21,
            marginBottom: 10
        },
        systemMessage: {
            opacity: 0.5
        }
    });
});

export default class Post extends React.Component {
    static propTypes = {
        style: React.PropTypes.oneOfType([React.PropTypes.object, React.PropTypes.number]),
        post: React.PropTypes.object.isRequired,
        user: React.PropTypes.object,
        displayName: React.PropTypes.string,
        isFirstReply: React.PropTypes.bool,
        isLastReply: React.PropTypes.bool,
        commentedOnPost: React.PropTypes.object,
        commentedOnDisplayName: React.PropTypes.string,
        theme: React.PropTypes.object.isRequired
    };

    renderCommentedOnMessage = (style) => {
        if (!this.props.commentedOnPost) {
            return null;
        }

        const displayName = this.props.commentedOnDisplayName;

        let name;
        if (displayName) {
            name = displayName;
        } else {
            name = (
                <FormattedText
                    id='channel_loader.someone'
                    defaultMessage='Someone'
                />
            );
        }

        let apostrophe;
        if (displayName && displayName.slice(-1) === 's') {
            apostrophe = '\'';
        } else {
            apostrophe = '\'s';
        }

        return (
            <FormattedText
                id='post_body.commentedOn'
                defaultMessage='Commented on {name}{apostrophe} message: '
                values={{
                    name,
                    apostrophe
                }}
                style={style.commentedOn}
            />
        );
    }

    renderReplyBar = (style) => {
        if (!this.props.post.root_id) {
            return null;
        }

        const replyBarStyle = [style.replyBar];

        if (this.props.isFirstReply && !this.props.commentedOnPost) {
            replyBarStyle.push(style.replyBarFirst);
        }

        if (this.props.isLastReply) {
            replyBarStyle.push(style.replyBarLast);
        }

        return <View style={replyBarStyle}/>;
    }

    render() {
        const style = getStyleSheet(this.props.theme);

        let profilePicture;
        let displayName;
        let messageStyle;
        if (isSystemMessage(this.props.post)) {
            profilePicture = (
                <View style={style.profilePicture}>
                    <MattermostIcon
                        color={this.props.theme.centerChannelColor}
                        height={32}
                        width={32}
                    />
                </View>
            );

            displayName = (
                <FormattedText
                    id='post_info.system'
                    defaultMessage='System'
                />
            );

            messageStyle = [style.message, style.systemMessage];
        } else {
            profilePicture = (
                <ProfilePicture
                    user={this.props.user}
                    size={32}
                />
            );

            if (this.props.displayName) {
                displayName = this.props.displayName;
            } else {
                displayName = (
                    <FormattedText
                        id='channel_loader.someone'
                        defaultMessage='Someone'
                    />
                );
            }

            messageStyle = style.message;
        }

        if (this.props.commentedOnPost) {
            return (
                <View style={[style.container, this.props.style]}>
                    <View style={style.profilePictureContainer}>
                        {profilePicture}
                    </View>
                    <View style={style.rightColumn}>
                        <View style={style.postInfoContainer}>
                            <Text style={style.displayName}>
                                {displayName}
                            </Text>
                            <Text style={style.time}>
                                <FormattedTime value={this.props.post.create_at}/>
                            </Text>
                        </View>
                        <View>
                            {this.renderCommentedOnMessage(style)}
                        </View>
                        <View style={style.messageContainerWithReplyBar}>
                            {this.renderReplyBar(style)}
                            <Text style={messageStyle}>
                                {this.props.post.message}
                            </Text>
                        </View>
                    </View>
                </View>
            );
        }

        return (
            <View style={[style.container, this.props.style]}>
                <View style={style.profilePictureContainer}>
                    {profilePicture}
                </View>
                {this.renderReplyBar(style)}
                <View style={style.rightColumn}>
                    <View style={style.postInfoContainer}>
                        <Text style={style.displayName}>
                            {displayName}
                        </Text>
                        <Text style={style.time}>
                            <FormattedTime value={this.props.post.create_at}/>
                        </Text>
                    </View>
                    <View style={style.messageContainer}>
                        <Text style={messageStyle}>
                            {this.props.post.message}
                        </Text>
                    </View>
                </View>
            </View>
        );
    }
}
