// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
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

import FileAttachmentList from 'app/components/file_attachment_list';
import FormattedText from 'app/components/formatted_text';
import FormattedTime from 'app/components/formatted_time';
import MattermostIcon from 'app/components/mattermost_icon';
import Markdown from 'app/components/markdown';
import OptionsContext from 'app/components/options_context';
import ProfilePicture from 'app/components/profile_picture';
import ReplyIcon from 'app/components/reply_icon';
import {preventDoubleTap} from 'app/utils/tap';
import {changeOpacity, makeStyleSheetFromTheme} from 'app/utils/theme';

import webhookIcon from 'assets/images/icons/webhook.jpg';

import {Posts} from 'mattermost-redux/constants';
import DelayedAction from 'mattermost-redux/utils/delayed_action';
import {canDeletePost, canEditPost, isSystemMessage} from 'mattermost-redux/utils/post_utils';
import {isAdmin, isSystemAdmin} from 'mattermost-redux/utils/user_utils';

const BOT_NAME = 'BOT';

class Post extends PureComponent {
    static propTypes = {
        config: PropTypes.object.isRequired,
        commentCount: PropTypes.number.isRequired,
        currentUserId: PropTypes.string.isRequired,
        intl: intlShape.isRequired,
        style: View.propTypes.style,
        post: PropTypes.object.isRequired,
        user: PropTypes.object,
        displayName: PropTypes.string,
        renderReplies: PropTypes.bool,
        isFirstReply: PropTypes.bool,
        isFlagged: PropTypes.bool,
        isLastReply: PropTypes.bool,
        commentedOnDisplayName: PropTypes.string,
        commentedOnPost: PropTypes.object,
        license: PropTypes.object.isRequired,
        roles: PropTypes.string,
        theme: PropTypes.object.isRequired,
        onPress: PropTypes.func,
        actions: PropTypes.shape({
            deletePost: PropTypes.func.isRequired,
            flagPost: PropTypes.func.isRequired,
            goToUserProfile: PropTypes.func.isRequired,
            openEditPostModal: PropTypes.func.isRequired,
            removePost: PropTypes.func.isRequired,
            unflagPost: PropTypes.func.isRequired
        }).isRequired
    };

    constructor(props) {
        super(props);

        const {config, license, currentUserId, roles, post} = props;
        this.editDisableAction = new DelayedAction(this.handleEditDisable);
        this.state = {
            canEdit: canEditPost(config, license, currentUserId, post, this.editDisableAction),
            canDelete: canDeletePost(config, license, currentUserId, post, isAdmin(roles), isSystemAdmin(roles))
        };
    }

    componentWillReceiveProps(nextProps) {
        const {config, license, currentUserId, roles, post} = nextProps;
        this.setState({
            canEdit: canEditPost(config, license, currentUserId, post, this.editDisableAction),
            canDelete: canDeletePost(config, license, currentUserId, post, isAdmin(roles), isSystemAdmin(roles))
        });
    }

    componentWillUnmount() {
        this.editDisableAction.cancel();
    }

    handleEditDisable = () => {
        this.setState({canEdit: false});
    };

    handlePostDelete = () => {
        const {formatMessage} = this.props.intl;
        const {post, actions} = this.props;

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
                    this.editDisableAction.cancel();
                    actions.deletePost(post);
                }
            }]
        );
    };

    handlePostEdit = () => {
        const {actions, post} = this.props;
        actions.openEditPostModal(post);
    };

    handlePress = () => {
        const {post, onPress} = this.props;
        if (onPress && post.state !== Posts.POST_DELETED && !isSystemMessage(post)) {
            preventDoubleTap(onPress, null, post);
        } else if (post.state === Posts.POST_DELETED) {
            preventDoubleTap(this.onRemovePost, this, post);
        }
    };

    hideOptionsContext = () => {
        if (Platform.OS === 'ios') {
            this.refs.tooltip.hide();
        }
    };

    onRemovePost = (post) => {
        const {removePost} = this.props.actions;
        removePost(post);
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

        if (this.props.isFirstReply || this.props.commentedOnPost) {
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
                    onPress={this.handlePress}
                    post={post}
                    toggleSelected={this.toggleSelected}
                />
            );
        }
        return attachments;
    }

    renderMessage = (style, messageStyle, replyBar = false) => {
        const {formatMessage} = this.props.intl;
        const {isFlagged, post, theme} = this.props;
        const {flagPost, unflagPost} = this.props.actions;
        const actions = [];

        // we should check for the user roles and permissions
        if (isFlagged) {
            actions.push({
                text: formatMessage({id: 'post_info.mobile.unflag', defaultMessage: 'Unflag'}),
                onPress: () => unflagPost(post.id)
            });
        } else {
            actions.push({
                text: formatMessage({id: 'post_info.mobile.flag', defaultMessage: 'Flag'}),
                onPress: () => flagPost(post.id)
            });
        }

        if (this.state.canEdit) {
            actions.push({text: formatMessage({id: 'post_info.edit', defaultMessage: 'Edit'}), onPress: () => this.handlePostEdit()});
        }

        if (this.state.canDelete && post.state !== Posts.POST_DELETED) {
            actions.push({text: formatMessage({id: 'post_info.del', defaultMessage: 'Delete'}), onPress: () => this.handlePostDelete()});
        }

        let messageContainer;
        let message;
        if (post.state === Posts.POST_DELETED) {
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
                <View style={style.messageContainerWithReplyBar}>
                    {replyBar && this.renderReplyBar(style)}
                    <View style={{flex: 1}}>
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
                </View>
            );
        } else {
            messageContainer = (
                <View style={style.messageContainerWithReplyBar}>
                    {replyBar && this.renderReplyBar(style)}
                    <TouchableHighlight
                        onHideUnderlay={() => this.toggleSelected(false)}
                        onLongPress={this.showOptionsContext}
                        onPress={this.handlePress}
                        onShowUnderlay={() => this.toggleSelected(true)}
                        underlayColor='transparent'
                        style={{flex: 1}}
                    >
                        <View style={{flex: 1}}>
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
        preventDoubleTap(this.props.actions.goToUserProfile, null, this.props.user.id);
    };

    toggleSelected = (selected) => {
        this.setState({selected});
    };

    render() {
        const {
            commentCount,
            config,
            post,
            renderReplies,
            theme
        } = this.props;
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
                        <View style={[style.rightColumn, (this.props.isLastReply && style.rightColumnPadding)]}>
                            <View style={style.postInfoContainer}>
                                <View style={{flexDirection: 'row', flex: 1}}>
                                    {displayName}
                                    <Text style={style.time}>
                                        <FormattedTime value={this.props.post.create_at}/>
                                    </Text>
                                </View>
                                {(commentCount > 0 && renderReplies) &&
                                    <TouchableOpacity
                                        onPress={this.handlePress}
                                        style={style.replyIconContainer}
                                    >
                                        <ReplyIcon
                                            height={15}
                                            width={15}
                                            color={theme.linkColor}
                                        />
                                        <Text style={style.replyText}>{commentCount}</Text>
                                    </TouchableOpacity>
                                }
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
        rightColumnPadding: {
            paddingBottom: 3
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
            width: 3,
            flexBasis: 3
        },
        replyBarFirst: {
            paddingTop: 10
        },
        replyBarLast: {
            paddingBottom: 10
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
            alignSelf: 'flex-end',
            color: theme.centerChannelColor,
            fontSize: 12,
            marginLeft: 5,
            opacity: 0.5
        },
        commentedOn: {
            color: changeOpacity(theme.centerChannelColor, 0.65),
            lineHeight: 21
        },
        message: {
            color: theme.centerChannelColor,
            fontSize: 14,
            lineHeight: 21
        },
        systemMessage: {
            opacity: 0.6
        },
        webhookMessage: {
            color: theme.centerChannelColor,
            fontSize: 16,
            fontWeight: '600'
        },
        selected: {
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.1)
        },
        replyIconContainer: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center'
        },
        replyText: {
            fontSize: 14,
            marginLeft: 3,
            color: theme.linkColor
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
        },
        mention: {
            color: theme.linkColor
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
