// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {Alert, Clipboard, StyleSheet, View} from 'react-native';
import {intlShape} from 'react-intl';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';

import EventEmitter from 'mattermost-redux/utils/event_emitter';

import SlideUpPanel from 'app/components/slide_up_panel';
import {BOTTOM_MARGIN} from 'app/components/slide_up_panel/slide_up_panel';

import {OPTION_HEIGHT, getInitialPosition} from './post_options_utils';
import PostOption from './post_option';

export default class PostOptions extends PureComponent {
    static propTypes = {
        actions: PropTypes.shape({
            addReaction: PropTypes.func.isRequired,
            deletePost: PropTypes.func.isRequired,
            flagPost: PropTypes.func.isRequired,
            pinPost: PropTypes.func.isRequired,
            removePost: PropTypes.func.isRequired,
            unflagPost: PropTypes.func.isRequired,
            unpinPost: PropTypes.func.isRequired,
            dismissModal: PropTypes.func.isRequired,
            showModal: PropTypes.func.isRequired,
        }).isRequired,
        canAddReaction: PropTypes.bool,
        canReply: PropTypes.bool,
        canCopyPermalink: PropTypes.bool,
        canCopyText: PropTypes.bool,
        canDelete: PropTypes.bool,
        canFlag: PropTypes.bool,
        canPin: PropTypes.bool,
        canEdit: PropTypes.bool,
        canEditUntil: PropTypes.number.isRequired,
        currentTeamUrl: PropTypes.string.isRequired,
        deviceHeight: PropTypes.number.isRequired,
        isFlagged: PropTypes.bool,
        isMyPost: PropTypes.bool,
        post: PropTypes.object.isRequired,
        theme: PropTypes.object.isRequired,
        isLandscape: PropTypes.bool.isRequired,
    };

    static contextTypes = {
        intl: intlShape.isRequired,
    };

    close = async (cb) => {
        await this.props.actions.dismissModal();

        if (typeof cb === 'function') {
            setTimeout(cb, 300);
        }
    };

    closeWithAnimation = (cb) => {
        if (this.slideUpPanel) {
            this.slideUpPanel.closeWithAnimation(cb);
        } else {
            this.close(cb);
        }
    };

    getAddReactionOption = () => {
        const {formatMessage} = this.context.intl;
        const {canAddReaction, isLandscape} = this.props;

        if (canAddReaction) {
            return (
                <PostOption
                    key='reaction'
                    icon='emoji'
                    text={formatMessage({id: 'mobile.post_info.add_reaction', defaultMessage: 'Add Reaction'})}
                    onPress={this.handleAddReaction}
                    isLandscape={isLandscape}
                />
            );
        }

        return null;
    };

    getReplyOption = () => {
        const {formatMessage} = this.context.intl;
        const {canReply, isLandscape} = this.props;

        if (canReply) {
            return (
                <PostOption
                    key='reply'
                    icon='reply'
                    text={formatMessage({id: 'mobile.post_info.reply', defaultMessage: 'Reply'})}
                    onPress={this.handleReply}
                    isLandscape={isLandscape}
                />
            );
        }

        return null;
    }

    getCopyPermalink = () => {
        const {formatMessage} = this.context.intl;
        const {canCopyPermalink, isLandscape} = this.props;

        if (canCopyPermalink) {
            return (
                <PostOption
                    key='permalink'
                    icon='link'
                    text={formatMessage({id: 'get_post_link_modal.title', defaultMessage: 'Copy Permalink'})}
                    onPress={this.handleCopyPermalink}
                    isLandscape={isLandscape}
                />
            );
        }

        return null;
    };

    getCopyText = () => {
        const {formatMessage} = this.context.intl;
        const {canCopyText, isLandscape} = this.props;

        if (canCopyText) {
            return (
                <PostOption
                    key='copy'
                    icon='copy'
                    text={formatMessage({id: 'mobile.post_info.copy_text', defaultMessage: 'Copy Text'})}
                    onPress={this.handleCopyText}
                    isLandscape={isLandscape}
                />
            );
        }

        return null;
    };

    getDeleteOption = () => {
        const {formatMessage} = this.context.intl;
        const {canDelete, isLandscape} = this.props;

        if (canDelete) {
            return (
                <PostOption
                    destructive={true}
                    key='delete'
                    icon='trash'
                    text={formatMessage({id: 'post_info.del', defaultMessage: 'Delete'})}
                    onPress={this.handlePostDelete}
                    isLandscape={isLandscape}
                />
            );
        }

        return null;
    };

    getEditOption = () => {
        const {formatMessage} = this.context.intl;
        const {canEdit, canEditUntil, isLandscape} = this.props;

        if (canEdit && (canEditUntil === -1 || canEditUntil > Date.now())) {
            return (
                <PostOption
                    key='edit'
                    icon='edit'
                    text={formatMessage({id: 'post_info.edit', defaultMessage: 'Edit'})}
                    onPress={this.handlePostEdit}
                    isLandscape={isLandscape}
                />
            );
        }

        return null;
    };

    getFlagOption = () => {
        const {formatMessage} = this.context.intl;
        const {canFlag, isFlagged, isLandscape} = this.props;

        if (!canFlag) {
            return null;
        }

        if (isFlagged) {
            return (
                <PostOption
                    key='unflag'
                    icon='flag'
                    text={formatMessage({id: 'mobile.post_info.unflag', defaultMessage: 'Unflag'})}
                    onPress={this.handleUnflagPost}
                    isLandscape={isLandscape}
                />
            );
        }

        return (
            <PostOption
                key='flagged'
                icon='flag'
                text={formatMessage({id: 'mobile.post_info.flag', defaultMessage: 'Flag'})}
                onPress={this.handleFlagPost}
                isLandscape={isLandscape}
            />
        );
    };

    getPinOption = () => {
        const {formatMessage} = this.context.intl;
        const {canPin, post, isLandscape} = this.props;

        if (!canPin) {
            return null;
        }

        if (post.is_pinned) {
            return (
                <PostOption
                    key='unpin'
                    icon='pin'
                    text={formatMessage({id: 'mobile.post_info.unpin', defaultMessage: 'Unpin from Channel'})}
                    onPress={this.handleUnpinPost}
                    isLandscape={isLandscape}
                />
            );
        }

        return (
            <PostOption
                key='pin'
                icon='pin'
                text={formatMessage({id: 'mobile.post_info.pin', defaultMessage: 'Pin to Channel'})}
                onPress={this.handlePinPost}
                isLandscape={isLandscape}
            />
        );
    };

    getMyPostOptions = () => {
        const actions = [
            this.getEditOption(),
            this.getReplyOption(),
            this.getFlagOption(),
            this.getPinOption(),
            this.getAddReactionOption(),
            this.getCopyPermalink(),
            this.getCopyText(),
            this.getDeleteOption(),
        ];

        return actions.filter((a) => a !== null);
    };

    getOthersPostOptions = () => {
        const actions = [
            this.getReplyOption(),
            this.getFlagOption(),
            this.getAddReactionOption(),
            this.getPinOption(),
            this.getCopyPermalink(),
            this.getCopyText(),
            this.getEditOption(),
            this.getDeleteOption(),
        ];

        return actions.filter((a) => a !== null);
    };

    getPostOptions = () => {
        const {isMyPost} = this.props;

        return isMyPost ? this.getMyPostOptions() : this.getOthersPostOptions();
    };

    handleAddReaction = () => {
        const {actions, theme} = this.props;
        const {formatMessage} = this.context.intl;

        this.close(() => {
            MaterialIcon.getImageSource('close', 20, theme.sidebarHeaderTextColor).then((source) => {
                const screen = 'AddReaction';
                const title = formatMessage({id: 'mobile.post_info.add_reaction', defaultMessage: 'Add Reaction'});
                const passProps = {
                    closeButton: source,
                    onEmojiPress: this.handleAddReactionToPost,
                };

                actions.showModal(screen, title, passProps);
            });
        });
    };

    handleReply = () => {
        const {post} = this.props;
        this.closeWithAnimation(() => {
            EventEmitter.emit('goToThread', post);
        });
    };

    handleAddReactionToPost = (emoji) => {
        const {actions, post} = this.props;

        actions.addReaction(post.id, emoji);
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

        this.closeWithAnimation();
        requestAnimationFrame(() => {
            actions.flagPost(post.id);
        });
    };

    handlePinPost = () => {
        const {actions, post} = this.props;

        this.closeWithAnimation();
        requestAnimationFrame(() => {
            actions.pinPost(post.id);
        });
    };

    handlePostDelete = () => {
        const {formatMessage} = this.context.intl;
        const {actions, post} = this.props;

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
                    this.closeWithAnimation(() => {
                        actions.deletePost(post);
                        actions.removePost(post);
                    });
                },
            }]
        );
    };

    handlePostEdit = () => {
        const {actions, theme, post} = this.props;
        const {intl} = this.context;

        this.close(() => {
            MaterialIcon.getImageSource('close', 20, theme.sidebarHeaderTextColor).then((source) => {
                const screen = 'EditPost';
                const title = intl.formatMessage({id: 'mobile.edit_post.title', defaultMessage: 'Editing Message'});
                const passProps = {
                    post,
                    closeButton: source,
                };

                actions.showModal(screen, title, passProps);
            });
        });
    };

    handleUnflagPost = () => {
        const {actions, post} = this.props;

        this.closeWithAnimation();
        requestAnimationFrame(() => {
            actions.unflagPost(post.id);
        });
    };

    handleUnpinPost = () => {
        const {actions, post} = this.props;

        this.closeWithAnimation();
        requestAnimationFrame(() => {
            actions.unpinPost(post.id);
        });
    };

    refSlideUpPanel = (r) => {
        this.slideUpPanel = r;
    };

    render() {
        const {deviceHeight} = this.props;
        const options = this.getPostOptions();
        if (!options || !options.length) {
            return null;
        }

        const marginFromTop = deviceHeight - BOTTOM_MARGIN - ((options.length + 1) * OPTION_HEIGHT);
        const initialPosition = getInitialPosition(deviceHeight, marginFromTop);

        return (
            <View style={style.container}>
                <SlideUpPanel
                    allowStayMiddle={false}
                    ref={this.refSlideUpPanel}
                    marginFromTop={marginFromTop > 0 ? marginFromTop : 0}
                    onRequestClose={this.close}
                    initialPosition={initialPosition}
                    key={marginFromTop}
                >
                    {options}
                </SlideUpPanel>
            </View>
        );
    }
}

const style = StyleSheet.create({
    container: {
        flex: 1,
    },
});
