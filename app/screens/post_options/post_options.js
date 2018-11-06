// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {Alert, Clipboard, StyleSheet, View} from 'react-native';
import {intlShape} from 'react-intl';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';

import SlideUpPanel from 'app/components/slide_up_panel';
import {CONTAINER_MARGIN} from 'app/components/slide_up_panel/slide_up_panel';

import PostOption from './post_option';

const OPTION_HEIGHT = 51;

export default class PostOptions extends PureComponent {
    static propTypes = {
        actions: PropTypes.shape({
            addReaction: PropTypes.func.isRequired,
            deletePost: PropTypes.func.isRequired,
            flagPost: PropTypes.func.isRequired,
            removePost: PropTypes.func.isRequired,
            unflagPost: PropTypes.func.isRequired,
        }).isRequired,
        additionalOption: PropTypes.object,
        canAddReaction: PropTypes.bool,
        canDelete: PropTypes.bool,
        canEdit: PropTypes.bool,
        canEditUntil: PropTypes.number.isRequired,
        channelIsReadOnly: PropTypes.bool,
        currentTeamUrl: PropTypes.string.isRequired,
        deviceHeight: PropTypes.number.isRequired,
        hasBeenDeleted: PropTypes.bool,
        isFlagged: PropTypes.bool,
        isMyPost: PropTypes.bool,
        managedConfig: PropTypes.object.isRequired,
        navigator: PropTypes.object.isRequired,
        post: PropTypes.object.isRequired,
        showAddReaction: PropTypes.bool,
        theme: PropTypes.object.isRequired,
    };

    static contextTypes = {
        intl: intlShape.isRequired,
    };

    constructor(props) {
        super(props);
        this.contentOffsetY = -1;
        this.state = {
        };
    }

    close = () => {
        this.props.navigator.dismissModal({
            animationType: 'none',
        });
    };

    closeWithAnimation = () => {
        if (this.slideUpPanel) {
            this.slideUpPanel.getWrappedInstance().handleTouchEnd();
        } else {
            this.close();
        }
    };

    getAddReactionOption = () => {
        const {formatMessage} = this.context.intl;
        const {canAddReaction, channelIsReadOnly, showAddReaction} = this.props;

        if (showAddReaction && canAddReaction && !channelIsReadOnly) {
            return (
                <PostOption
                    key='reaction'
                    icon='emoji'
                    text={formatMessage({id: 'mobile.post_info.add_reaction', defaultMessage: 'Add Reaction'})}
                    onPress={this.handleAddReaction}
                />
            );
        }

        return null;
    };

    getCopyPermalink = () => {
        const {formatMessage} = this.context.intl;

        return (
            <PostOption
                key='permalink'
                icon='link'
                text={formatMessage({id: 'get_post_link_modal.title', defaultMessage: 'Copy Permalink'})}
                onPress={this.handleCopyPermalink}
            />
        );
    };

    getCopyText = () => {
        const {formatMessage} = this.context.intl;
        const {managedConfig, post} = this.props;

        if (managedConfig.copyAndPasteProtection !== 'true' && post.message) {
            return (
                <PostOption
                    key='copy'
                    icon='copy'
                    text={formatMessage({id: 'mobile.post_info.copy_text', defaultMessage: 'Copy Text'})}
                    onPress={this.handleCopyText}
                />
            );
        }

        return null;
    };

    getDeleteOption = () => {
        const {formatMessage} = this.context.intl;
        const {canDelete, hasBeenDeleted} = this.props;

        if (canDelete && !hasBeenDeleted) {
            return (
                <PostOption
                    destructive={true}
                    key='delete'
                    icon='trash'
                    text={formatMessage({id: 'post_info.del', defaultMessage: 'Delete'})}
                    onPress={this.handlePostDelete}
                />
            );
        }

        return null;
    };

    getEditOption = () => {
        const {formatMessage} = this.context.intl;
        const {canEdit, canEditUntil} = this.props;

        if (canEdit && (canEditUntil === -1 || canEditUntil > Date.now())) {
            return (
                <PostOption
                    key='edit'
                    icon='edit'
                    text={formatMessage({id: 'post_info.edit', defaultMessage: 'Edit'})}
                    onPress={this.handlePostEdit}
                />
            );
        }

        return null;
    };

    getFlagOption = () => {
        const {formatMessage} = this.context.intl;
        const {channelIsReadOnly, isFlagged} = this.props;

        if (channelIsReadOnly) {
            return null;
        }

        if (isFlagged) {
            return (
                <PostOption
                    key='unflag'
                    icon='flag'
                    text={formatMessage({id: 'post_info.mobile.unflag', defaultMessage: 'Unflag'})}
                    onPress={this.handleUnflagPost}
                />
            );
        }

        return (
            <PostOption
                key='flagged'
                icon='flag'
                text={formatMessage({id: 'post_info.mobile.flag', defaultMessage: 'Flag'})}
                onPress={this.handleFlagPost}
            />
        );
    };

    getMyPostOptions = () => {
        const actions = [
            this.getEditOption(),
            this.getDeleteOption(),
            this.getFlagOption(),
            this.getAddReactionOption(),
            this.getCopyPermalink(),
            this.getCopyText(),
        ];

        return actions.filter((a) => a !== null);
    };

    getOthersPostOptions = () => {
        const actions = [
            this.getFlagOption(),
            this.getAddReactionOption(),
            this.getCopyPermalink(),
            this.getCopyText(),
            this.getEditOption(),
            this.getDeleteOption(),
        ];

        return actions.filter((a) => a !== null);
    };

    getPostOptions = () => {
        const {isMyPost} = this.props;

        if (isMyPost) {
            return this.getMyPostOptions();
        }

        return this.getOthersPostOptions();
    };

    handleAddReaction = () => {
        const {formatMessage} = this.context.intl;
        const {navigator, theme} = this.props;

        this.close();
        requestAnimationFrame(() => {
            MaterialIcon.getImageSource('close', 20, theme.sidebarHeaderTextColor).then((source) => {
                navigator.showModal({
                    screen: 'AddReaction',
                    title: formatMessage({id: 'mobile.post_info.add_reaction', defaultMessage: 'Add Reaction'}),
                    animated: true,
                    navigatorStyle: {
                        navBarTextColor: theme.sidebarHeaderTextColor,
                        navBarBackgroundColor: theme.sidebarHeaderBg,
                        navBarButtonColor: theme.sidebarHeaderTextColor,
                        screenBackgroundColor: theme.centerChannelBg,
                    },
                    passProps: {
                        closeButton: source,
                        onEmojiPress: this.handleAddReactionToPost,
                    },
                });
            });
        });
    };

    handleAddReactionToPost = (emoji) => {
        const {post} = this.props;
        this.props.actions.addReaction(post.id, emoji);
    };

    handleCopyPermalink = () => {
        const {currentTeamUrl, post} = this.props;
        const permalink = `${currentTeamUrl}/pl/${post.id}`;

        Clipboard.setString(permalink);
        this.closeWithAnimation();
    };

    handleCopyText = () => {
        const {message} = this.props.post;

        Clipboard.setString(message);
        this.closeWithAnimation();
    };

    handleFlagPost = () => {
        const {actions, post} = this.props;
        actions.flagPost(post.id);
        this.closeWithAnimation();
    };

    handlePostDelete = () => {
        const {formatMessage} = this.context.intl;
        const {actions, isMyPost, post} = this.props;

        Alert.alert(
            formatMessage({id: 'mobile.post.delete_title', defaultMessage: 'Delete Post'}),
            formatMessage({
                id: 'mobile.post.delete_question',
                defaultMessage: 'Are you sure you want to delete this post?',
            }),
            [{
                text: formatMessage({id: 'mobile.post.cancel', defaultMessage: 'Cancel'}),
                style: 'cancel',
            }, {
                text: formatMessage({id: 'post_info.del', defaultMessage: 'Delete'}),
                style: 'destructive',
                onPress: () => {
                    actions.deletePost(post);
                    if (isMyPost) {
                        actions.removePost(post);
                    }
                    this.closeWithAnimation();
                },
            }]
        );
    };

    handlePostEdit = () => {
        const {intl} = this.context;
        const {navigator, post, theme} = this.props;

        this.close();
        requestAnimationFrame(() => {
            MaterialIcon.getImageSource('close', 20, theme.sidebarHeaderTextColor).then((source) => {
                navigator.showModal({
                    screen: 'EditPost',
                    title: intl.formatMessage({id: 'mobile.edit_post.title', defaultMessage: 'Editing Message'}),
                    animated: true,
                    navigatorStyle: {
                        navBarTextColor: theme.sidebarHeaderTextColor,
                        navBarBackgroundColor: theme.sidebarHeaderBg,
                        navBarButtonColor: theme.sidebarHeaderTextColor,
                        screenBackgroundColor: theme.centerChannelBg,
                    },
                    passProps: {
                        post,
                        closeButton: source,
                    },
                });
            });
        });
    };

    handleUnflagPost = () => {
        const {actions, post} = this.props;
        actions.unflagPost(post.id);
        this.closeWithAnimation();
    };

    refSlideUpPanel = (r) => {
        this.slideUpPanel = r;
    };

    render() {
        const {deviceHeight} = this.props;
        const options = this.getPostOptions();
        const marginFromTop = deviceHeight - (options.length * OPTION_HEIGHT) - CONTAINER_MARGIN;

        return (
            <View style={style.flex}>
                <SlideUpPanel
                    ref={this.refSlideUpPanel}
                    marginFromTop={marginFromTop}
                    onRequestClose={this.close}
                    initialPosition={325}
                >
                    {options}
                </SlideUpPanel>
            </View>
        );
    }
}

const style = StyleSheet.create({
    flex: {
        flex: 1,
    },
});
