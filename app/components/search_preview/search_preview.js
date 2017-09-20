// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {
    Platform,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import * as Animatable from 'react-native-animatable';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';

import FormattedText from 'app/components/formatted_text';
import Loading from 'app/components/loading';
import PostList from 'app/components/post_list';
import {changeOpacity, makeStyleSheetFromTheme} from 'app/utils/theme';

Animatable.initializeRegistryWithDefinitions({
    growOut: {
        from: {
            opacity: 1,
            scale: 1
        },
        0.5: {
            opacity: 1,
            scale: 3
        },
        to: {
            opacity: 0,
            scale: 5
        }
    }
});

export default class SearchPreview extends PureComponent {
    static propTypes = {
        channelId: PropTypes.string,
        channelName: PropTypes.string,
        currentUserId: PropTypes.string.isRequired,
        navigator: PropTypes.object,
        onClose: PropTypes.func,
        onPress: PropTypes.func,
        posts: PropTypes.array,
        theme: PropTypes.object.isRequired
    };

    static defaultProps = {
        posts: []
    };

    state = {
        showPosts: false,
        animationEnded: false
    };

    componentWillReceiveProps(nextProps) {
        const {animationEnded, showPosts} = this.state;
        if (animationEnded && !showPosts && nextProps.posts.length) {
            this.setState({showPosts: true});
        }
    }

    handleClose = () => {
        this.refs.view.zoomOut().then(() => {
            if (this.props.onClose) {
                this.props.onClose();
            }
        });
        return true;
    };

    handlePress = () => {
        const {channelId, onPress} = this.props;
        this.refs.view.growOut().then(() => {
            if (onPress) {
                onPress(channelId);
            }
        });
    };

    showPostList = () => {
        this.setState({animationEnded: true});
        if (!this.state.showPosts && this.props.posts.length) {
            this.setState({showPosts: true});
        }
    };

    render() {
        const {channelName, currentUserId, posts, theme} = this.props;
        const style = getStyleSheet(theme);

        let postList;
        if (this.state.showPosts) {
            postList = (
                <PostList
                    indicateNewMessages={false}
                    isSearchResult={true}
                    shouldRenderReplyButton={false}
                    renderReplies={false}
                    posts={posts}
                    currentUserId={currentUserId}
                    lastViewedAt={0}
                    navigator={navigator}
                />
            );
        } else {
            postList = <Loading/>;
        }

        return (
            <View
                style={style.container}
            >
                <Animatable.View
                    ref='view'
                    animation='zoomIn'
                    duration={500}
                    delay={0}
                    style={style.wrapper}
                    onAnimationEnd={this.showPostList}
                >
                    <View
                        style={style.header}
                    >
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
                            <Text
                                ellipsizeMode='tail'
                                numberOfLines={1}
                                style={style.title}
                            >
                                {channelName}
                            </Text>
                        </View>
                    </View>
                    <View style={style.postList}>
                        {postList}
                    </View>
                    <TouchableOpacity
                        style={style.footer}
                        onPress={this.handlePress}
                    >
                        <FormattedText
                            id='mobile.search.jump'
                            defautMessage='JUMP'
                            style={style.jump}
                        />
                    </TouchableOpacity>
                </Animatable.View>
            </View>
        );
    }
}

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        container: {
            position: 'absolute',
            backgroundColor: changeOpacity('#000', 0.3),
            height: '100%',
            top: 0,
            left: 0,
            zIndex: 10,
            width: '100%'
        },
        wrapper: {
            flex: 1,
            marginHorizontal: 10,
            opacity: 0,
            ...Platform.select({
                android: {
                    marginTop: 10,
                    marginBottom: 35
                },
                ios: {
                    marginTop: 20,
                    marginBottom: 10
                }
            })
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
            width: '100%'
        },
        close: {
            justifyContent: 'center',
            height: 44,
            width: 40,
            paddingLeft: 7
        },
        titleContainer: {
            alignItems: 'center',
            flex: 1,
            paddingRight: 40
        },
        title: {
            color: theme.centerChannelColor,
            fontSize: 17,
            fontWeight: '600'
        },
        postList: {
            backgroundColor: theme.centerChannelBg,
            flex: 1
        },
        footer: {
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: theme.buttonBg,
            borderBottomLeftRadius: 6,
            borderBottomRightRadius: 6,
            flexDirection: 'row',
            height: 44,
            paddingRight: 16,
            width: '100%'
        },
        jump: {
            color: theme.buttonColor,
            fontSize: 16,
            fontWeight: '600',
            textAlignVertical: 'center'
        }
    };
});
