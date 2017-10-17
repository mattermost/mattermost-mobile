// Copyright (c) 2016-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {
    SectionList,
    Text,
    TouchableHighlight,
    View
} from 'react-native';
import {injectIntl, intlShape} from 'react-intl';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';

import {General} from 'mattermost-redux/constants';
import {debounce} from 'mattermost-redux/actions/helpers';

import ChannelItem from 'app/components/channel_drawer/channels_list/channel_item';
import UnreadIndicator from 'app/components/channel_drawer/channels_list/unread_indicator';
import {wrapWithPreventDoubleTap} from 'app/utils/tap';
import {changeOpacity} from 'app/utils/theme';

class List extends PureComponent {
    static propTypes = {
        canCreatePrivateChannels: PropTypes.bool.isRequired,
        directChannelIds: PropTypes.array.isRequired,
        favoriteChannelIds: PropTypes.array.isRequired,
        intl: intlShape.isRequired,
        navigator: PropTypes.object,
        onSelectChannel: PropTypes.func.isRequired,
        publicChannelIds: PropTypes.array.isRequired,
        privateChannelIds: PropTypes.array.isRequired,
        styles: PropTypes.object.isRequired,
        theme: PropTypes.object.isRequired,
        unreadChannelIds: PropTypes.array.isRequired
    };

    constructor(props) {
        super(props);

        this.state = {
            sections: this.buildSections(props),
            showIndicator: false,
            width: 0
        };

        MaterialIcon.getImageSource('close', 20, this.props.theme.sidebarHeaderTextColor).then((source) => {
            this.closeButton = source;
        });
    }

    componentWillReceiveProps(nextProps) {
        const {
            canCreatePrivateChannels,
            directChannelIds,
            favoriteChannelIds,
            publicChannelIds,
            privateChannelIds,
            unreadChannelIds
        } = this.props;

        if (nextProps.canCreatePrivateChannels !== canCreatePrivateChannels ||
            nextProps.directChannelIds !== directChannelIds || nextProps.favoriteChannelIds !== favoriteChannelIds ||
            nextProps.publicChannelIds !== publicChannelIds || nextProps.privateChannelIds !== privateChannelIds ||
            nextProps.unreadChannelIds !== unreadChannelIds) {
            this.setState({sections: this.buildSections(nextProps)});
        }
    }

    componentDidUpdate(prevProps, prevState) {
        if (prevState.sections !== this.state.sections && this.refs.list) {
            this.refs.list.recordInteraction();
            this.updateUnreadIndicators({
                viewableItems: Array.from(this.refs.list._wrapperListRef._listRef._viewabilityHelper._viewableItems.values()) //eslint-disable-line
            });
        }
    }

    buildSections = (props) => {
        const {
            canCreatePrivateChannels,
            directChannelIds,
            favoriteChannelIds,
            publicChannelIds,
            privateChannelIds,
            unreadChannelIds
        } = props;
        const sections = [];

        if (unreadChannelIds.length) {
            sections.push({
                id: 'mobile.channel_list.unreads',
                defaultMessage: 'UNREADS',
                data: unreadChannelIds,
                renderItem: this.renderUnreadItem,
                topSeparator: false,
                bottomSeparator: true
            });
        }

        if (favoriteChannelIds.length) {
            sections.push({
                id: 'sidebar.favorite',
                defaultMessage: 'FAVORITES',
                data: favoriteChannelIds,
                topSeparator: unreadChannelIds.length > 0,
                bottomSeparator: true
            });
        }

        sections.push({
            action: this.goToMoreChannels,
            id: 'sidebar.channels',
            defaultMessage: 'PUBLIC CHANNELS',
            data: publicChannelIds,
            topSeparator: favoriteChannelIds.length > 0 || unreadChannelIds.length > 0,
            bottomSeparator: publicChannelIds.length > 0
        });

        sections.push({
            action: canCreatePrivateChannels ? this.goToCreatePrivateChannel : null,
            id: 'sidebar.pg',
            defaultMessage: 'PRIVATE CHANNELS',
            data: privateChannelIds,
            topSeparator: true,
            bottomSeparator: privateChannelIds.length > 0
        });

        sections.push({
            action: this.goToDirectMessages,
            id: 'sidebar.direct',
            defaultMessage: 'DIRECT MESSAGES',
            data: directChannelIds,
            topSeparator: true,
            bottomSeparator: false
        });

        return sections;
    };

    goToCreatePrivateChannel = wrapWithPreventDoubleTap(() => {
        const {intl, navigator, theme} = this.props;

        navigator.showModal({
            screen: 'CreateChannel',
            animationType: 'slide-up',
            title: intl.formatMessage({id: 'mobile.create_channel.private', defaultMessage: 'New Private Channel'}),
            backButtonTitle: '',
            animated: true,
            navigatorStyle: {
                navBarTextColor: theme.sidebarHeaderTextColor,
                navBarBackgroundColor: theme.sidebarHeaderBg,
                navBarButtonColor: theme.sidebarHeaderTextColor,
                screenBackgroundColor: theme.centerChannelBg
            },
            passProps: {
                channelType: General.PRIVATE_CHANNEL,
                closeButton: this.closeButton
            }
        });
    });

    goToDirectMessages = wrapWithPreventDoubleTap(() => {
        const {intl, navigator, theme} = this.props;

        navigator.showModal({
            screen: 'MoreDirectMessages',
            title: intl.formatMessage({id: 'mobile.more_dms.title', defaultMessage: 'New Conversation'}),
            animationType: 'slide-up',
            animated: true,
            backButtonTitle: '',
            navigatorStyle: {
                navBarTextColor: theme.sidebarHeaderTextColor,
                navBarBackgroundColor: theme.sidebarHeaderBg,
                navBarButtonColor: theme.sidebarHeaderTextColor,
                screenBackgroundColor: theme.centerChannelBg
            },
            navigatorButtons: {
                leftButtons: [{
                    id: 'close-dms',
                    icon: this.closeButton
                }]
            }
        });
    });

    goToMoreChannels = wrapWithPreventDoubleTap(() => {
        const {intl, navigator, theme} = this.props;

        navigator.showModal({
            screen: 'MoreChannels',
            animationType: 'slide-up',
            title: intl.formatMessage({id: 'more_channels.title', defaultMessage: 'More Channels'}),
            backButtonTitle: '',
            animated: true,
            navigatorStyle: {
                navBarTextColor: theme.sidebarHeaderTextColor,
                navBarBackgroundColor: theme.sidebarHeaderBg,
                navBarButtonColor: theme.sidebarHeaderTextColor,
                screenBackgroundColor: theme.centerChannelBg
            },
            passProps: {
                closeButton: this.closeButton
            }
        });
    });

    keyExtractor = (item) => item.id || item;

    onSelectChannel = (channel, currentChannelId) => {
        const {onSelectChannel} = this.props;
        onSelectChannel(channel, currentChannelId);
    };

    onLayout = (event) => {
        const {width} = event.nativeEvent.layout;
        this.setState({width: width - 40});
    };

    renderSectionAction = (styles, action) => {
        const {theme} = this.props;
        return (
            <TouchableHighlight
                style={styles.actionContainer}
                onPress={action}
                underlayColor={changeOpacity(theme.sidebarTextHoverBg, 0.5)}
            >
                <MaterialIcon
                    name='add'
                    style={styles.action}
                />
            </TouchableHighlight>
        );
    };

    renderSectionSeparator = () => {
        const {styles} = this.props;
        return (
            <View style={[styles.divider]}/>
        );
    };

    renderItem = ({item}) => {
        return (
            <ChannelItem
                channelId={item}
                onSelectChannel={this.onSelectChannel}
            />
        );
    };

    renderUnreadItem = ({item}) => {
        return (
            <ChannelItem
                channelId={item}
                isUnread={true}
                onSelectChannel={this.onSelectChannel}
            />
        );
    };

    renderSectionHeader = ({section}) => {
        const {intl, styles} = this.props;
        const {
            action,
            bottomSeparator,
            defaultMessage,
            id,
            topSeparator
        } = section;

        return (
            <View>
                {topSeparator && this.renderSectionSeparator()}
                <View style={styles.titleContainer}>
                    <Text style={styles.title}>
                        {intl.formatMessage({id, defaultMessage}).toUpperCase()}
                    </Text>
                    {action && this.renderSectionAction(styles, action)}
                </View>
                {bottomSeparator && this.renderSectionSeparator()}
            </View>
        );
    };

    scrollToTop = () => {
        if (this.refs.list) {
            this.refs.list.scrollToOffset({
                x: 0,
                y: 0,
                animated: true
            });
        }
    };

    emitUnreadIndicatorChange = debounce((showIndicator) => {
        this.setState({showIndicator});
    }, 100);

    updateUnreadIndicators = ({viewableItems}) => {
        const {unreadChannelIds} = this.props;
        const firstUnread = unreadChannelIds[0];
        if (firstUnread) {
            const isVisible = viewableItems.find((v) => v.item === firstUnread);

            if (isVisible) {
                return this.emitUnreadIndicatorChange(false);
            }
            return this.emitUnreadIndicatorChange(true);
        }

        return this.emitUnreadIndicatorChange(false);
    };

    render() {
        const {styles, theme} = this.props;
        const {sections, width, showIndicator} = this.state;

        return (
            <View
                style={styles.container}
                onLayout={this.onLayout}
            >
                <SectionList
                    ref='list'
                    sections={sections}
                    renderItem={this.renderItem}
                    renderSectionHeader={this.renderSectionHeader}
                    keyExtractor={this.keyExtractor}
                    onViewableItemsChanged={this.updateUnreadIndicators}
                    keyboardDismissMode='on-drag'
                    maxToRenderPerBatch={10}
                    stickySectionHeadersEnabled={false}
                    viewabilityConfig={{
                        viewAreaCoveragePercentThreshold: 3,
                        waitForInteraction: false
                    }}
                />
                <UnreadIndicator
                    show={showIndicator}
                    style={[styles.above, {width}]}
                    onPress={this.scrollToTop}
                    theme={theme}
                />
            </View>
        );
    }
}

export default injectIntl(List);
