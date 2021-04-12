// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import {Alert, StyleSheet, View} from 'react-native';
import Clipboard from '@react-native-community/clipboard';
import {intlShape} from 'react-intl';

import {showModal, dismissModal} from '@actions/navigation';
import CompassIcon from '@components/compass_icon';
import ReactionPicker from '@components/reaction_picker';
import SlideUpPanel from '@components/slide_up_panel';
import {BOTTOM_MARGIN} from '@components/slide_up_panel/slide_up_panel';
import {REACTION_PICKER_HEIGHT} from '@constants/reaction_picker';
import EventEmitter from '@mm-redux/utils/event_emitter';
import {isSystemMessage} from '@mm-redux/utils/post_utils';
import {t} from '@utils/i18n';
import {preventDoubleTap} from '@utils/tap';

import PostOption from './post_option';
import {OPTION_HEIGHT, getInitialPosition} from './post_options_utils';
import Bindings from './bindings';
import {Post} from '@mm-redux/types/posts';
import {Theme} from '@mm-redux/types/preferences';

type Props = {
    actions: {
        addReaction: (postId: string, emojiName: string) => void,
        deletePost: (post: Post) => void,
        flagPost: (postId: string) => void,
        pinPost: (postId: string) => void,
        removePost: (post: Post) => void,
        unflagPost: (postId: string) => void,
        unpinPost: (postId: string) => void,
        setUnreadPost: (userId: string, postId: string) => void,
    },
    canAddReaction?: boolean,
    canReply?: boolean,
    canCopyPermalink?: boolean,
    canCopyText?: boolean,
    canDelete?: boolean,
    canFlag?: boolean,
    canPin?: boolean,
    canEdit?: boolean,
    canMarkAsUnread?: boolean, //#backwards-compatibility:5.18v
    canEditUntil: number,
    showAppOptions: boolean,
    currentTeamUrl: string,
    currentUserId: string,
    deviceHeight: number,
    isFlagged?: boolean,
    post: Post,
    theme: Theme,
}

export default class PostOptions extends PureComponent<Props> {
    static contextTypes = {
        intl: intlShape.isRequired,
    };

    // TODO: Remove any. Currently, high order component mess with types
    private slideUpPanel?: any;

    close = async (cb?: () => void) => {
        await dismissModal();

        if (typeof cb === 'function') {
            requestAnimationFrame(cb);
        }
    };

    closeWithAnimation = (cb?: () => void) => {
        if (this.slideUpPanel) {
            this.slideUpPanel.closeWithAnimation(cb);
        } else {
            this.close(cb);
        }
    };

    getOption = (key: string | number, icon: string, message: {id: string, defaultMessage: string}, onPress: () => void, destructive = false) => {
        const {formatMessage} = this.context.intl;
        const {theme} = this.props;
        const testID = `post.options.${key}.action`;

        return (
            <PostOption
                testID={testID}
                key={key}
                icon={icon}
                text={formatMessage(message)}
                onPress={onPress}
                destructive={destructive}
                theme={theme}
            />
        );
    }

    getReplyOption = () => {
        const {canReply} = this.props;

        if (canReply) {
            const key = 'reply';
            const icon = 'reply-outline';
            const message = {id: t('mobile.post_info.reply'), defaultMessage: 'Reply'};
            const onPress = this.handleReply;

            return this.getOption(key, icon, message, onPress);
        }

        return null;
    }

    getCopyPermalink = () => {
        const {canCopyPermalink} = this.props;

        if (canCopyPermalink) {
            const key = 'permalink';
            const icon = 'link-variant';
            const message = {id: t('get_post_link_modal.title'), defaultMessage: 'Copy Link'};
            const onPress = this.handleCopyPermalink;

            return this.getOption(key, icon, message, onPress);
        }

        return null;
    };

    getCopyText = () => {
        const {canCopyText} = this.props;

        if (canCopyText) {
            const key = 'copy';
            const icon = 'content-copy';
            const message = {id: t('mobile.post_info.copy_text'), defaultMessage: 'Copy Text'};
            const onPress = this.handleCopyText;

            return this.getOption(key, icon, message, onPress);
        }

        return null;
    };

    getDeleteOption = () => {
        const {canDelete} = this.props;

        if (canDelete) {
            const key = 'delete';
            const icon = 'trash-can-outline';
            const message = {id: t('post_info.del'), defaultMessage: 'Delete'};
            const onPress = this.handlePostDelete;
            const destructive = true;

            return this.getOption(key, icon, message, onPress, destructive);
        }

        return null;
    };

    getEditOption = () => {
        const {canEdit, canEditUntil} = this.props;

        if (canEdit && (canEditUntil === -1 || canEditUntil > Date.now())) {
            const key = 'edit';
            const icon = 'pencil-outline';
            const message = {id: t('post_info.edit'), defaultMessage: 'Edit'};
            const onPress = this.handlePostEdit;

            return this.getOption(key, icon, message, onPress);
        }

        return null;
    };

    getFlagOption = () => {
        const {canFlag, isFlagged} = this.props;

        if (!canFlag) {
            return null;
        }

        let key;
        let message;
        let onPress;
        const icon = 'bookmark-outline';

        if (isFlagged) {
            key = 'unflag';
            message = {id: t('mobile.post_info.unflag'), defaultMessage: 'Unsave'};
            onPress = this.handleUnflagPost;
        } else {
            key = 'flagged';
            message = {id: t('mobile.post_info.flag'), defaultMessage: 'Save'};
            onPress = this.handleFlagPost;
        }

        return this.getOption(key, icon, message, onPress);
    };

    getPinOption = () => {
        const {canPin, post} = this.props;

        if (!canPin) {
            return null;
        }

        let key;
        let message;
        let onPress;
        const icon = 'pin-outline';

        if (post.is_pinned) {
            key = 'unpin';
            message = {id: t('mobile.post_info.unpin'), defaultMessage: 'Unpin from Channel'};
            onPress = this.handleUnpinPost;
        } else {
            key = 'pin';
            message = {id: t('mobile.post_info.pin'), defaultMessage: 'Pin to Channel'};
            onPress = this.handlePinPost;
        }

        return this.getOption(key, icon, message, onPress);
    };

    getMarkAsUnreadOption = () => {
        const {post, theme} = this.props;
        const {formatMessage} = this.context.intl;

        if (!isSystemMessage(post) && this.props.canMarkAsUnread) {
            return (
                <PostOption
                    testID='post.options.markUnread.action'
                    key='markUnread'
                    icon='mark-as-unread'
                    text={formatMessage({id: 'mobile.post_info.mark_unread', defaultMessage: 'Mark as Unread'})}
                    onPress={this.handleMarkUnread}
                    theme={theme}
                />
            );
        }
        return null;
    };

    getAppsOptions = () => {
        const {post} = this.props;
        return (
            <Bindings
                key='bindings'
                post={post}
                closeWithAnimation={this.closeWithAnimation}
            />
        );
    }

    getPostOptions = () => {
        const actions = [
            this.getReplyOption(),
            this.getMarkAsUnreadOption(),
            this.getCopyPermalink(),
            this.getFlagOption(),
            this.getCopyText(),
            this.getPinOption(),
            this.getEditOption(),
            this.getDeleteOption(),
            this.getAppsOptions(),
        ];

        return actions.filter((a) => a !== null);
    };

    handleAddReactionScreen = () => {
        const {theme} = this.props;
        const {formatMessage} = this.context.intl;

        CompassIcon.getImageSource('close', 24, theme.sidebarHeaderTextColor).then((source) => {
            const screen = 'AddReaction';
            const title = formatMessage({id: 'mobile.post_info.add_reaction', defaultMessage: 'Add Reaction'});
            const passProps = {
                closeButton: source,
                onEmojiPress: this.handleAddReactionToPost,
            };

            this.closeWithAnimation(() => showModal(screen, title, passProps));
        });
    };

    handleReply = () => {
        const {post} = this.props;
        this.closeWithAnimation(() => {
            EventEmitter.emit('goToThread', post);
        });
    };

    handleAddReaction = preventDoubleTap((emoji: string) => {
        this.handleAddReactionToPost(emoji);
        this.closeWithAnimation();
    }, 500);

    handleAddReactionToPost = (emoji: string) => {
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

    handleMarkUnread = () => {
        const {actions, post, currentUserId} = this.props;

        this.closeWithAnimation();
        requestAnimationFrame(() => {
            actions.setUnreadPost(currentUserId, post.id);
        });
    }

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
            }],
        );
    };

    handlePostEdit = () => {
        const {theme, post} = this.props;
        const {intl} = this.context;

        CompassIcon.getImageSource('close', 24, theme.sidebarHeaderTextColor).then((source) => {
            const screen = 'EditPost';
            const title = intl.formatMessage({id: 'mobile.edit_post.title', defaultMessage: 'Editing Message'});
            const passProps = {
                post,
                closeButton: source,
            };

            this.closeWithAnimation(() => showModal(screen, title, passProps, {modal: {swipeToDismiss: false}}));
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

    refSlideUpPanel = (r: any) => {
        this.slideUpPanel = r;
    };

    render() {
        const {deviceHeight, theme, canAddReaction} = this.props;
        const options = this.getPostOptions();
        let reactionHeight = 0;
        let reactionPicker;

        if (!options || !options.length) {
            return null;
        }

        if (canAddReaction) {
            reactionHeight = REACTION_PICKER_HEIGHT;
            reactionPicker = (
                <ReactionPicker
                    testID='post_options.reaction_picker.action'
                    addReaction={this.handleAddReaction}
                    openReactionScreen={this.handleAddReactionScreen}
                />
            );
        }

        const marginFromTop = deviceHeight - BOTTOM_MARGIN - ((options.length + 1) * OPTION_HEIGHT) - reactionHeight;
        const initialPosition = getInitialPosition(deviceHeight, marginFromTop);

        return (
            <View
                testID='post.options'
                style={style.container}
            >
                <SlideUpPanel
                    allowStayMiddle={false}
                    ref={this.refSlideUpPanel}
                    marginFromTop={marginFromTop > 0 ? marginFromTop : 0}
                    onRequestClose={this.close}
                    initialPosition={initialPosition}
                    key={marginFromTop}
                    theme={theme}
                >
                    {reactionPicker}
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
