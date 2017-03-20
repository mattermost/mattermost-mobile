// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PropTypes, PureComponent} from 'react';
import {
    Alert,
    Image,
    Platform,
    StyleSheet,
    Text,
    TouchableHighlight,
    TouchableOpacity,
    View
} from 'react-native';
import {injectIntl, intlShape} from 'react-intl';

import FormattedText from 'app/components/formatted_text';
import FormattedTime from 'app/components/formatted_time';
import MattermostIcon from 'app/components/mattermost_icon';
import Markdown from 'app/components/markdown/markdown';
import OptionsContext from 'app/components/options_context';
import ProfilePicture from 'app/components/profile_picture';
import FileAttachmentList from 'app/components/file_attachment_list/file_attachment_list_container';
import {changeOpacity, makeStyleSheetFromTheme} from 'app/utils/theme';

import webhookIcon from 'assets/images/icons/webhook.jpg';

import {Constants} from 'mattermost-redux/constants';
import {isSystemMessage} from 'mattermost-redux/utils/post_utils';
import {isAdmin} from 'mattermost-redux/utils/user_utils';

const BOT_NAME = 'BOT';

class Post extends PureComponent {
    static propTypes = {
        config: PropTypes.object.isRequired,
        currentTeamId: PropTypes.string.isRequired,
        currentUserId: PropTypes.string.isRequired,
        intl: intlShape.isRequired,
        style: View.propTypes.style,
        post: PropTypes.object.isRequired,
        user: PropTypes.object,
        displayName: PropTypes.string,
        renderReplies: PropTypes.bool,
        isFirstReply: PropTypes.bool,
        isLastReply: PropTypes.bool,
        commentedOnDisplayName: PropTypes.string,
        commentedOnPost: PropTypes.object,
        roles: PropTypes.string,
        theme: PropTypes.object.isRequired,
        onPress: PropTypes.func,
        actions: PropTypes.shape({
            deletePost: PropTypes.func.isRequired,
            goToUserProfile: PropTypes.func.isRequired
        }).isRequired
    };

    handlePostDelete = () => {
        const {formatMessage} = this.props.intl;
        const {currentTeamId, post, actions} = this.props;

        Alert.alert(
            formatMessage({id: 'mobile.post.delete_title', defaultMessage: 'Delete Post'}),
            formatMessage({id: 'mobile.post.delete_question', defaultMessage: 'Are you sure you want to delete this post?'}),
            [{
                text: formatMessage({id: 'mobile.post.cancel', defaultMessage: 'Cancel'}),
                style: 'cancel'
            }, {
                text: formatMessage({id: 'post_info.del', defaultMessage: 'Delete'}),
                style: 'destructive',
                onPress: () => {
                    actions.deletePost(currentTeamId, post);
                }
            }]
        );
    };

    handlePress = () => {
        if (this.props.onPress) {
            this.props.onPress(this.props.post);
        }
    };

    hideOptionsContext = () => {
        if (Platform.OS === 'ios') {
            this.refs.tooltip.hide();
        }
    };

    showOptionsContext = () => {
        if (Platform.OS === 'ios') {
            return this.refs.tooltip.show();
        }

        return this.refs.bottomSheet.show();
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
    };

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
            attachments = (
                <FileAttachmentList
                    hideOptionsContext={this.hideOptionsContext}
                    onLongPress={this.showOptionsContext}
                    post={post}
                    toggleSelected={this.toggleSelected}
                />
            );
        }
        return attachments;
    }

    renderMessage = (style, messageStyle, replyBar = false) => {
        const {formatMessage} = this.props.intl;
        const {currentUserId, post, roles, theme} = this.props;
        const actions = [];

        // we should check for the user roles and permissions
        // actions.push({text: 'Flag', onPress: () => console.log('flag pressed')}); //eslint-disable-line no-console
        // if (post.user_id === currentUserId) {
        //     actions.push({text: 'Edit', onPress: () => console.log('edit pressed')}); //eslint-disable-line no-console
        // }
        if (post.user_id === currentUserId || isAdmin(roles)) {
            actions.push({text: formatMessage({id: 'post_info.del', defaultMessage: 'Delete'}), onPress: () => this.handlePostDelete()});
        }

        let messageContainer;
        let message;
        if (post.state === Constants.POST_DELETED) {
            message = (
                <FormattedText
                    style={messageStyle}
                    id='post_body.deleted'
                    defaultMessage='(message deleted)'
                />
            );
        } else if (this.props.post.message.length) {
            message = (
                <Markdown
                    baseTextStyle={messageStyle}
                    textStyles={getMarkdownTextStyles(theme)}
                    blockStyles={getMarkdownBlockStyles(theme)}
                    value={post.message}
                />
            );
        }

        if (Platform.OS === 'ios') {
            messageContainer = (
                <View style={{flex: 1}}>
                    {replyBar && this.renderReplyBar(style)}
                    <OptionsContext
                        actions={actions}
                        ref='tooltip'
                        onPress={this.handlePress}
                        toggleSelected={this.toggleSelected}
                    >
                        {message}
                        {this.renderFileAttachments()}
                    </OptionsContext>
                </View>
            );
        } else {
            messageContainer = (
                <View style={{flex: 1}}>
                    {replyBar && this.renderReplyBar(style)}
                    <TouchableHighlight
                        onHideUnderlay={() => this.toggleSelected(false)}
                        onLongPress={this.showOptionsContext}
                        onPress={this.handlePress}
                        onShowUnderlay={() => this.toggleSelected(true)}
                        underlayColor='transparent'
                    >
                        <View>
                            {message}
                            <OptionsContext
                                ref='bottomSheet'
                                actions={actions}
                                cancelText={formatMessage({id: 'mobile.post.cancel', defaultMessage: 'Cancel'})}
                            />
                            {this.renderFileAttachments()}
                        </View>
                    </TouchableHighlight>
                </View>
            );
        }

        return messageContainer;
    };

    viewUserProfile = () => {
        this.props.actions.goToUserProfile(this.props.user.id);
    };

    toggleSelected = (selected) => {
        this.setState({selected});
    };

    render() {
        const {config, post, theme} = this.props;
        const style = getStyleSheet(theme);
        const PROFILE_PICTURE_SIZE = 32;

        let profilePicture;
        let displayName;
        let messageStyle;
        if (isSystemMessage(post)) {
            profilePicture = (
                <View style={style.profilePicture}>
                    <MattermostIcon
                        color={theme.centerChannelColor}
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
        } else if (post.props && post.props.from_webhook) {
            if (config.EnablePostIconOverride === 'true') {
                const icon = post.props.override_icon_url ? {uri: post.props.override_icon_url} : webhookIcon;
                profilePicture = (
                    <View style={style.profilePicture}>
                        <Image
                            source={icon}
                            style={{
                                height: PROFILE_PICTURE_SIZE,
                                width: PROFILE_PICTURE_SIZE,
                                borderRadius: PROFILE_PICTURE_SIZE / 2
                            }}
                        />
                    </View>
                );
            } else {
                profilePicture = (
                    <ProfilePicture
                        user={this.props.user}
                        size={PROFILE_PICTURE_SIZE}
                    />
                );
            }

            let name = this.props.displayName;
            if (post.props.override_username && config.EnablePostUsernameOverride === 'true') {
                name = post.props.override_username;
            }
            displayName = (
                <View style={style.botContainer}>
                    <Text style={style.displayName}>
                        {name}
                    </Text>
                    <Text style={style.bot}>
                        {BOT_NAME}
                    </Text>
                </View>
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

        const selected = this.state && this.state.selected ? style.selected : null;
        let contents;
        if (this.props.commentedOnPost) {
            contents = (
                <View style={[style.container, this.props.style, selected]}>
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
                <View style={[style.container, this.props.style, selected]}>
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
            color: theme.centerChannelColor,
            fontSize: 14,
            fontWeight: '600',
            marginRight: 5
        },
        botContainer: {
            flexDirection: 'row'
        },
        bot: {
            alignSelf: 'center',
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.15),
            borderRadius: 2,
            color: theme.centerChannelColor,
            fontSize: 10,
            fontWeight: '600',
            marginRight: 5,
            paddingVertical: 2,
            paddingHorizontal: 4
        },
        time: {
            color: theme.centerChannelColor,
            fontSize: 12,
            marginLeft: 5,
            opacity: 0.5
        },
        commentedOn: {
            color: theme.centerChannelColor,
            lineHeight: 21
        },
        message: {
            color: theme.centerChannelColor,
            fontSize: 14,
            lineHeight: 21
        },
        systemMessage: {
            opacity: 0.5
        },
        webhookMessage: {
            color: theme.centerChannelColor,
            fontSize: 16,
            fontWeight: '600'
        },
        selected: {
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.1)
        }
    });
});

const getMarkdownTextStyles = makeStyleSheetFromTheme((theme) => {
    const codeFont = Platform.OS === 'ios' ? 'Courier New' : 'monospace';

    return StyleSheet.create({
        emph: {
            fontStyle: 'italic'
        },
        strong: {
            fontWeight: 'bold'
        },
        link: {
            color: theme.linkColor
        },
        heading1: {
            fontSize: 30,
            lineHeight: 45
        },
        heading2: {
            fontSize: 24,
            lineHeight: 36
        },
        heading3: {
            fontSize: 20,
            lineHeight: 30
        },
        heading4: {
            fontSize: 16,
            lineHeight: 24
        },
        heading5: {
            fontSize: 14,
            lineHeight: 21
        },
        heading6: {
            fontSize: 14,
            lineHeight: 21,
            opacity: 0.8
        },
        code: {
            alignSelf: 'center',
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.1),
            fontFamily: codeFont,
            paddingHorizontal: 4,
            paddingVertical: 2
        },
        codeBlock: {
            fontFamily: codeFont
        },
        horizontalRule: {
            backgroundColor: theme.centerChannelColor,
            height: StyleSheet.hairlineWidth,
            flex: 1,
            marginVertical: 10
        }
    });
});

const getMarkdownBlockStyles = makeStyleSheetFromTheme((theme) => {
    return StyleSheet.create({
        codeBlock: {
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.1),
            borderRadius: 4,
            paddingHorizontal: 4,
            paddingVertical: 2
        },
        horizontalRule: {
            backgroundColor: theme.centerChannelColor
        }
    });
});

export default injectIntl(Post);
