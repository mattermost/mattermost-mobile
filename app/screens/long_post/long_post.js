// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {
    ScrollView,
    TouchableOpacity,
    View,
} from 'react-native';
import {intlShape} from 'react-intl';
import * as Animatable from 'react-native-animatable';
import {Navigation} from 'react-native-navigation';

import CompassIcon from '@components/compass_icon';
import FormattedText from '@components/formatted_text';
import Post from '@components/post';
import SafeAreaView from '@components/safe_area_view';
import {preventDoubleTap} from '@utils/tap';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {goToScreen, dismissModal} from '@actions/navigation';

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
            getPostThread: PropTypes.func.isRequired,
            selectPost: PropTypes.func.isRequired,
        }).isRequired,
        channelName: PropTypes.string,
        inThreadView: PropTypes.bool,
        managedConfig: PropTypes.object,
        onHashtagPress: PropTypes.func,
        onPermalinkPress: PropTypes.func,
        postId: PropTypes.string.isRequired,
        theme: PropTypes.object.isRequired,
    };

    static contextTypes = {
        intl: intlShape.isRequired,
    };

    componentDidMount() {
        this.navigationEventListener = Navigation.events().bindComponent(this);
    }

    navigationButtonPressed({buttonId}) {
        if (buttonId === 'backPress') {
            this.handleClose();
        }
    }

    setViewRef = (ref) => {
        this.viewRef = ref;
    }

    goToThread = preventDoubleTap((post) => {
        const {actions} = this.props;
        const channelId = post.channel_id;
        const rootId = (post.root_id || post.id);
        const screen = 'Thread';
        const title = '';
        const passProps = {
            channelId,
            rootId,
        };

        actions.getPostThread(rootId);
        actions.selectPost(rootId);

        goToScreen(screen, title, passProps);
    });

    handleClose = () => {
        if (this.viewRef) {
            this.viewRef.zoomOut().then(() => {
                dismissModal();
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

    render() {
        const {
            channelName,
            managedConfig,
            onHashtagPress,
            onPermalinkPress,
            postId,
            theme,
        } = this.props;
        const style = getStyleSheet(theme);

        return (
            <SafeAreaView
                backgroundColor='transparent'
                excludeHeader={true}
                footerColor='transparent'
            >
                <View style={style.container}>
                    <Animatable.View
                        ref={this.setViewRef}
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
                                <CompassIcon
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
                                testID='long_post.post'
                                postId={postId}
                                shouldRenderReplyButton={false}
                                onPress={this.handlePress}
                                isSearchResult={false}
                                showLongPost={true}
                                showAddReaction={false}
                                onHashtagPress={onHashtagPress}
                                onPermalinkPress={onPermalinkPress}
                                managedConfig={managedConfig}
                            />
                        </ScrollView>
                        <View style={style.footer}/>
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
            flex: 1,
        },
        footer: {
            alignItems: 'flex-start',
            justifyContent: 'center',
            borderBottomColor: changeOpacity(theme.centerChannelColor, 0.2),
            borderBottomWidth: 1,
            backgroundColor: theme.centerChannelBg,
            borderBottomLeftRadius: 6,
            borderBottomRightRadius: 6,
            flexDirection: 'column',
            marginBottom: 10,
            paddingLeft: 16,
        },
    };
});
