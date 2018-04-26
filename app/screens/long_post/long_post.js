// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {
    ScrollView,
    TouchableOpacity,
    View,
} from 'react-native';
import {intlShape} from 'react-intl';
import * as Animatable from 'react-native-animatable';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';

import FileAttachmentList from 'app/components/file_attachment_list';
import FormattedText from 'app/components/formatted_text';
import Post from 'app/components/post';
import Reactions from 'app/components/reactions';
import SafeAreaView from 'app/components/safe_area_view';
import {emptyFunction} from 'app/utils/general';
import {preventDoubleTap} from 'app/utils/tap';
import {changeOpacity, makeStyleSheetFromTheme} from 'app/utils/theme';

Animatable.initializeRegistryWithDefinitions({
    growOut: {
        from: {
            opacity: 1,
            scale: 1,
        },
        0.5: {
            opacity: 1,
            scale: 3,
        },
        to: {
            opacity: 0,
            scale: 5,
        },
    },
});

export default class LongPost extends PureComponent {
    static propTypes = {
        actions: PropTypes.shape({
            loadThreadIfNecessary: PropTypes.func.isRequired,
            selectPost: PropTypes.func.isRequired,
        }).isRequired,
        channelName: PropTypes.string,
        fileIds: PropTypes.array,
        hasReactions: PropTypes.bool,
        isPermalink: PropTypes.bool,
        inThreadView: PropTypes.bool,
        managedConfig: PropTypes.object,
        navigator: PropTypes.object,
        onAddReaction: PropTypes.func,
        onPermalinkPress: PropTypes.func,
        postId: PropTypes.string.isRequired,
        theme: PropTypes.object.isRequired,
    };

    static defaultProps = {
        fileIds: [],
    };

    static contextTypes = {
        intl: intlShape.isRequired,
    };

    constructor(props) {
        super(props);

        props.navigator.setOnNavigatorEvent(this.onNavigatorEvent);
    }

    goToThread = preventDoubleTap((post) => {
        const {actions, navigator, theme} = this.props;
        const channelId = post.channel_id;
        const rootId = (post.root_id || post.id);

        actions.loadThreadIfNecessary(rootId, channelId);
        actions.selectPost(rootId);

        const options = {
            screen: 'Thread',
            animated: true,
            backButtonTitle: '',
            navigatorStyle: {
                navBarTextColor: theme.sidebarHeaderTextColor,
                navBarBackgroundColor: theme.sidebarHeaderBg,
                navBarButtonColor: theme.sidebarHeaderTextColor,
                screenBackgroundColor: theme.centerChannelBg,
            },
            passProps: {
                channelId,
                rootId,
            },
        };

        navigator.push(options);
    });

    handleClose = () => {
        const {navigator} = this.props;
        if (this.refs.view) {
            this.refs.view.zoomOut().then(() => {
                navigator.dismissModal({animationType: 'none'});
            });
        }
    };

    handlePress = (post) => {
        const {inThreadView} = this.props;

        if (inThreadView) {
            this.handleClose();
        } else {
            this.goToThread(post);
        }
    };

    onNavigatorEvent = (event) => {
        switch (event.id) {
        case 'backPress':
            this.handleClose();
            break;
        default:
            break;
        }
    };

    renderFileAttachments(style) {
        const {
            fileIds,
            navigator,
            postId,
        } = this.props;

        let attachments;
        if (fileIds.length > 0) {
            attachments = (
                <View style={style.attachments}>
                    <FileAttachmentList
                        fileIds={fileIds}
                        hideOptionsContext={emptyFunction}
                        isFailed={false}
                        onLongPress={emptyFunction}
                        onPress={this.handlePress}
                        postId={postId}
                        toggleSelected={emptyFunction}
                        navigator={navigator}
                    />
                </View>
            );
        }
        return attachments;
    }

    renderReactions = (style) => {
        const {hasReactions, postId, onAddReaction} = this.props;

        if (!hasReactions) {
            return null;
        }

        return (
            <View style={style.reactions}>
                <Reactions
                    position='left'
                    postId={postId}
                    onAddReaction={onAddReaction}
                />
            </View>
        );
    };

    render() {
        const {
            channelName,
            fileIds,
            hasReactions,
            managedConfig,
            navigator,
            onPermalinkPress,
            postId,
            theme,
        } = this.props;
        const style = getStyleSheet(theme);

        let footer;
        if (hasReactions || fileIds.length) {
            footer = (
                <View style={style.footer}>
                    {this.renderFileAttachments(style)}
                    {this.renderReactions(style)}
                </View>
            );
        }

        return (
            <SafeAreaView
                backgroundColor='transparent'
                excludeHeader={true}
                footerColor='transparent'
                forceTop={44}
            >
                <View style={style.container}>
                    <Animatable.View
                        ref='view'
                        animation='zoomIn'
                        duration={200}
                        delay={0}
                        style={style.wrapper}
                        useNativeDriver={true}
                    >
                        <View style={style.header}>
                            <TouchableOpacity
                                style={style.close}
                                onPress={this.handleClose}
                            >
                                <MaterialIcon
                                    name='close'
                                    size={20}
                                    color={theme.centerChannelColor}
                                />
                            </TouchableOpacity>
                            <View style={style.titleContainer}>
                                <FormattedText
                                    id='mobile.long_post_title'
                                    defaultMessage='{channelName} - Post'
                                    values={{channelName}}
                                    ellipsizeMode='tail'
                                    numberOfLines={1}
                                    style={style.title}
                                />
                            </View>
                        </View>
                        <ScrollView style={style.postList}>
                            <Post
                                postId={postId}
                                shouldRenderReplyButton={false}
                                onPress={this.handlePress}
                                isSearchResult={false}
                                showLongPost={true}
                                onPermalinkPress={onPermalinkPress}
                                navigator={navigator}
                                managedConfig={managedConfig}
                            />
                        </ScrollView>
                        {footer}
                    </Animatable.View>
                </View>
            </SafeAreaView>
        );
    }
}

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        container: {
            flex: 1,
            marginTop: 20,
        },
        wrapper: {
            backgroundColor: theme.centerChannelBg,
            borderRadius: 6,
            flex: 1,
            margin: 10,
            opacity: 0,
        },
        header: {
            alignItems: 'center',
            backgroundColor: theme.centerChannelBg,
            borderBottomColor: changeOpacity(theme.centerChannelColor, 0.2),
            borderBottomWidth: 1,
            borderTopLeftRadius: 6,
            borderTopRightRadius: 6,
            flexDirection: 'row',
            height: 44,
            paddingRight: 16,
            width: '100%',
        },
        close: {
            justifyContent: 'center',
            height: 44,
            width: 40,
            paddingLeft: 7,
        },
        titleContainer: {
            alignItems: 'center',
            flex: 1,
            paddingRight: 40,
        },
        title: {
            color: theme.centerChannelColor,
            fontSize: 17,
            fontWeight: '600',
        },
        postList: {
            backgroundColor: theme.centerChannelBg,
            flex: 1,
        },
        footer: {
            alignItems: 'flex-start',
            justifyContent: 'center',
            borderTopColor: changeOpacity(theme.centerChannelColor, 0.2),
            borderTopWidth: 1,
            backgroundColor: theme.centerChannelBg,
            borderBottomLeftRadius: 6,
            borderBottomRightRadius: 6,
            flexDirection: 'column',
            marginVertical: 10,
            paddingLeft: 16,
        },
        attachments: {
            backgroundColor: theme.centerChannelBg,
            height: 95,
            width: '100%',
        },
        reactions: {
            height: 47,
            width: '100%',
        },
    };
});
