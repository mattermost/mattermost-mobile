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
import PostListRetry from 'app/components/post_list_retry';
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
        actions: PropTypes.shape({
            getPostsAfter: PropTypes.func.isRequired,
            getPostsBefore: PropTypes.func.isRequired,
            getPostThread: PropTypes.func.isRequired
        }).isRequired,
        channelId: PropTypes.string,
        channelName: PropTypes.string,
        currentUserId: PropTypes.string.isRequired,
        focusedPostId: PropTypes.string.isRequired,
        navigator: PropTypes.object,
        onClose: PropTypes.func,
        onPress: PropTypes.func,
        postIds: PropTypes.array,
        theme: PropTypes.object.isRequired
    };

    static defaultProps = {
        postIds: []
    };

    constructor(props) {
        super(props);

        const {postIds} = props;
        let show = false;
        if (postIds && postIds.length >= 10) {
            show = true;
        }

        this.state = {
            show,
            error: false
        };
    }

    componentDidMount() {
        if (!this.state.show) {
            this.loadPosts();
        }
    }

    handleClose = () => {
        if (this.refs.view) {
            this.refs.view.zoomOut().then(() => {
                if (this.props.onClose) {
                    this.props.onClose();
                }
            });
        }
    };

    handlePress = () => {
        const {channelId, channelName, onPress} = this.props;

        if (this.refs.view) {
            this.refs.view.growOut().then(() => {
                if (onPress) {
                    onPress(channelId, channelName);
                }
            });
        }
    };

    loadPosts = async () => {
        const {actions, channelId, focusedPostId} = this.props;

        const result = await Promise.all([
            actions.getPostThread(focusedPostId, false),
            actions.getPostsBefore(channelId, focusedPostId, 0, 5),
            actions.getPostsAfter(channelId, focusedPostId, 0, 5)
        ]);

        const error = result.some((res) => Boolean(res.error));
        this.setState({show: true, error});
    };

    retry = () => {
        this.setState({show: false, error: false});
        this.loadPosts();
    };

    render() {
        const {
            channelName,
            currentUserId,
            focusedPostId,
            navigator,
            postIds,
            theme
        } = this.props;
        const style = getStyleSheet(theme);

        let postList;
        if (this.state.error) {
            postList = (
                <PostListRetry
                    retry={this.retry}
                    theme={theme}
                />
            );
        } else if (this.state.show) {
            postList = (
                <PostList
                    highlightPostId={focusedPostId}
                    indicateNewMessages={false}
                    isSearchResult={true}
                    shouldRenderReplyButton={false}
                    renderReplies={false}
                    postIds={postIds}
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
                    duration={200}
                    delay={0}
                    style={style.wrapper}
                    useNativeDriver={true}
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
            marginBottom: 10,
            marginHorizontal: 10,
            opacity: 0,
            ...Platform.select({
                android: {
                    marginTop: 10
                },
                ios: {
                    marginTop: 20
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
