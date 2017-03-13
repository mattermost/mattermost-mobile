// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {Component, PropTypes} from 'react';
import {
    Platform,
    Image,
    StyleSheet,
    Text,
    TouchableHighlight,
    TouchableOpacity,
    View
} from 'react-native';

import FormattedText from 'app/components/formatted_text';
import FormattedTime from 'app/components/formatted_time';
import MattermostIcon from 'app/components/mattermost_icon';
import ProfilePicture from 'app/components/profile_picture';
import FileAttachmentList from 'app/components/file_attachment_list/file_attachment_list_container';
import {makeStyleSheetFromTheme} from 'app/utils/theme';

import {isSystemMessage} from 'service/utils/post_utils.js';

export default class Post extends Component {
    static propTypes = {
        style: View.propTypes.style,
        post: PropTypes.object.isRequired,
        user: PropTypes.object,
        displayName: PropTypes.string,
        renderReplies: PropTypes.bool,
        isFirstReply: PropTypes.bool,
        isLastReply: PropTypes.bool,
        commentedOnPost: PropTypes.object,
        commentedOnDisplayName: PropTypes.string,
        theme: PropTypes.object.isRequired,
        onPress: PropTypes.func,
        actions: PropTypes.shape({
            goToUserProfile: PropTypes.func.isRequired
        }).isRequired
    };

    handlePress = () => {
        if (this.props.onPress) {
            this.props.onPress(this.props.post);
        }
    };

    renderCommentedOnMessage = (style) => {
        if (!this.props.renderReplies || !this.props.commentedOnPost) {
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
        if (!this.props.renderReplies || !this.props.post.root_id) {
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
    };

    renderFileAttachments() {
        const {post} = this.props;
        const fileIds = post.file_ids || [];
        let attachments;
        if (fileIds.length > 0) {
            attachments = (<FileAttachmentList post={post}/>);
        }
        return attachments;
    }

    viewUserProfile = () => {
        this.props.actions.goToUserProfile(this.props.user.id);
    };

    renderMessage = (style, messageStyle, replyBar = false) => {
        return (
            <TouchableHighlight onPress={this.handlePress}>
                <View style={{flex: 1}}>
                    {replyBar && this.renderReplyBar(style)}
                    {this.props.post.message.length > 0 &&
                    <Text style={messageStyle}>
                        {this.props.post.message}
                    </Text>
                    }
                    {this.renderFileAttachments()}
                </View>
            </TouchableHighlight>
        );
    };

    render() {
        const style = getStyleSheet(this.props.theme);
        const PROFILE_PICTURE_SIZE = 32;

        let profilePicture;
        let displayName;
        let messageStyle;
        if (isSystemMessage(this.props.post)) {
            profilePicture = (
                <View style={style.profilePicture}>
                    <MattermostIcon
                        color={this.props.theme.centerChannelColor}
                        height={PROFILE_PICTURE_SIZE}
                        width={PROFILE_PICTURE_SIZE}
                    />
                </View>
            );

            displayName = (
                <FormattedText
                    id='post_info.system'
                    defaultMessage='System'
                    style={style.displayName}
                />
            );

            messageStyle = [style.message, style.systemMessage];
        } else if (this.props.post.props && this.props.post.props.from_webhook) {
            profilePicture = (
                <View style={style.profilePicture}>
                    <Image
                        source={{uri: this.props.post.props.override_icon_url}}
                        style={{
                            height: PROFILE_PICTURE_SIZE,
                            width: PROFILE_PICTURE_SIZE,
                            borderRadius: PROFILE_PICTURE_SIZE / 2
                        }}
                    />
                </View>
            );

            displayName = (
                <Text style={style.displayName}>
                    {this.props.post.props.override_username}
                </Text>
            );
            messageStyle = [style.message, style.webhookMessage];
        } else {
            profilePicture = (
                <TouchableOpacity onPress={this.viewUserProfile}>
                    <ProfilePicture
                        user={this.props.user}
                        size={PROFILE_PICTURE_SIZE}
                    />
                </TouchableOpacity>
            );

            if (this.props.displayName) {
                displayName = (
                    <TouchableOpacity onPress={this.viewUserProfile}>
                        <Text style={style.displayName}>
                            {this.props.displayName}
                        </Text>
                    </TouchableOpacity>
                );
            } else {
                displayName = (
                    <FormattedText
                        id='channel_loader.someone'
                        defaultMessage='Someone'
                        style={style.displayName}
                    />
                );
            }

            messageStyle = style.message;
        }

        let contents;
        if (this.props.commentedOnPost) {
            contents = (
                <View style={[style.container, this.props.style]}>
                    <View style={style.profilePictureContainer}>
                        {profilePicture}
                    </View>
                    <View style={style.rightColumn}>
                        <View style={style.postInfoContainer}>
                            {displayName}
                            <Text style={style.time}>
                                <FormattedTime value={this.props.post.create_at}/>
                            </Text>
                        </View>
                        <View>
                            {this.renderCommentedOnMessage(style)}
                        </View>
                        {this.renderMessage(style, messageStyle, true)}
                    </View>
                </View>
            );
        } else {
            contents = (
                <View style={[style.container, this.props.style]}>
                    <View style={style.profilePictureContainer}>
                        {profilePicture}
                    </View>
                    <View style={style.messageContainerWithReplyBar}>
                        {this.renderReplyBar(style)}
                        <View style={style.rightColumn}>
                            <View style={style.postInfoContainer}>
                                {displayName}
                                <Text style={style.time}>
                                    <FormattedTime value={this.props.post.create_at}/>
                                </Text>
                            </View>
                            {this.renderMessage(style, messageStyle)}
                        </View>
                    </View>
                </View>
            );
        }

        return contents;
    }

}

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return StyleSheet.create({
        container: {
            backgroundColor: theme.centerChannelBg,
            flexDirection: 'row'
        },
        rightColumn: {
            flex: 1,
            flexDirection: 'column',
            marginRight: 12
        },
        postInfoContainer: {
            alignItems: 'center',
            flexDirection: 'row',
            marginTop: 10
        },
        messageContainerWithReplyBar: {
            flexDirection: 'row',
            flex: 1
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
            ...Platform.select({
                ios: {
                    width: 3,
                    flexBasis: 3
                },
                android: {
                    width: 6,
                    flexBasis: 6
                }
            })
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
        },
        webhookMessage: {
            color: theme.centerChannelColor,
            fontSize: 16,
            fontWeight: '600'
        }
    });
});
