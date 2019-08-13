// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {
    Dimensions,
    findNodeHandle,
    InteractionManager,
    Keyboard,
    Platform,
    SectionList,
    Text,
    TouchableHighlight,
    View,
} from 'react-native';
import {intlShape} from 'react-intl';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';

import {General} from 'mattermost-redux/constants';
import {debounce} from 'mattermost-redux/actions/helpers';

import ChannelItem from 'app/components/sidebars/main/channels_list/channel_item';
import {DeviceTypes, ListTypes, ViewTypes} from 'app/constants';
import {SidebarSectionTypes} from 'app/constants/view';

import BottomSheet from 'app/utils/bottom_sheet';
import {t} from 'app/utils/i18n';
import {preventDoubleTap} from 'app/utils/tap';
import {changeOpacity} from 'app/utils/theme';

import {paddingLeft as padding} from 'app/components/safe_area_view/iphone_x_spacing';

const VIEWABILITY_CONFIG = {
    ...ListTypes.VISIBILITY_CONFIG_DEFAULTS,
    waitForInteraction: true,
};

let UnreadIndicator = null;

export default class List extends PureComponent {
    static propTypes = {
        canJoinPublicChannels: PropTypes.bool.isRequired,
        canCreatePrivateChannels: PropTypes.bool.isRequired,
        canCreatePublicChannels: PropTypes.bool.isRequired,
        favoriteChannelIds: PropTypes.array.isRequired,
        isLandscape: PropTypes.bool.isRequired,
        onSelectChannel: PropTypes.func.isRequired,
        orderedChannelIds: PropTypes.array.isRequired,
        previewChannel: PropTypes.func,
        showModal: PropTypes.func.isRequired,
        styles: PropTypes.object.isRequired,
        teammateDisplayNameSettings: PropTypes.string,
        theme: PropTypes.object.isRequired,
        unreadChannelIds: PropTypes.array.isRequired,
    };

    static contextTypes = {
        intl: intlShape,
    };

    constructor(props) {
        super(props);

        this.combinedActionsRef = React.createRef();
        this.listRef = React.createRef();

        this.state = {
            showIndicator: false,
            width: 0,
        };

        this.keyboardDismissProp = {
            keyboardDismissMode: Platform.OS === 'ios' ? 'interactive' : 'none',
            onScrollBeginDrag: this.scrollBeginDrag,
        };

        MaterialIcon.getImageSource('close', 20, this.props.theme.sidebarHeaderTextColor).then((source) => {
            this.closeButton = source;
        });
    }

    componentDidUpdate(prevProps) {
        // TODO: Fix ref
        if (prevProps.orderedChannelIds !== this.props.orderedChannelIds && this.listRef?.current?._wrapperListRef.getListRef()._viewabilityHelper) { //eslint-disable-line
            this.listRef.current.list.recordInteraction();
            this.updateUnreadIndicators({
                viewableItems: Array.from(this.listRef.current._wrapperListRef.getListRef()._viewabilityHelper._viewableItems.values()) //eslint-disable-line
            });
        }
    }

    getSectionConfigByType = (sectionType) => {
        const {canCreatePrivateChannels, canJoinPublicChannels} = this.props;

        switch (sectionType) {
        case SidebarSectionTypes.UNREADS:
            return {
                id: t('mobile.channel_list.unreads'),
                defaultMessage: 'UNREADS',
            };
        case SidebarSectionTypes.FAVORITE:
            return {
                id: t('sidebar.favorite'),
                defaultMessage: 'FAVORITES',
            };
        case SidebarSectionTypes.PUBLIC:
            return {
                action: canJoinPublicChannels ? this.goToMoreChannels : null,
                id: t('sidebar.channels'),
                defaultMessage: 'PUBLIC CHANNELS',
            };
        case SidebarSectionTypes.PRIVATE:
            return {
                action: canCreatePrivateChannels ? this.goToCreatePrivateChannel : null,
                id: t('sidebar.pg'),
                defaultMessage: 'PRIVATE CHANNELS',
            };
        case SidebarSectionTypes.DIRECT:
            return {
                action: this.goToDirectMessages,
                id: t('sidebar.direct'),
                defaultMessage: 'DIRECT MESSAGES',
            };
        case SidebarSectionTypes.RECENT_ACTIVITY:
            return {
                action: this.showCreateChannelOptions,
                id: t('sidebar.types.recent'),
                defaultMessage: 'RECENT ACTIVITY',
            };
        case SidebarSectionTypes.ALPHA:
            return {
                action: this.showCreateChannelOptions,
                id: t('mobile.channel_list.channels'),
                defaultMessage: 'CHANNELS',
            };
        default:
            return {
                action: this.showCreateChannelOptions,
                id: t('mobile.channel_list.channels'),
                defaultMessage: 'CHANNELS',
            };
        }
    };

    buildSections = (orderedChannelIds) => {
        return orderedChannelIds.map((s, i) => {
            return {
                ...this.getSectionConfigByType(s.type),
                data: s.items,
                topSeparator: i !== 0,
                bottomSeparator: s.items.length > 0,
            };
        });
    };

    showCreateChannelOptions = () => {
        const {formatMessage} = this.context.intl;
        const {
            canJoinPublicChannels,
            canCreatePrivateChannels,
            canCreatePublicChannels,
        } = this.props;

        const moreChannelsText = formatMessage({id: 'more_channels.title', defaultMessage: 'More Channels'});
        const newPublicChannelText = formatMessage({id: 'mobile.create_channel.public', defaultMessage: 'New Public Channel'});
        const newPrivateChannelText = formatMessage({id: 'mobile.create_channel.private', defaultMessage: 'New Private Channel'});
        const newDirectChannelText = formatMessage({id: 'mobile.more_dms.title', defaultMessage: 'New Conversation'});
        const cancelText = formatMessage({id: 'mobile.post.cancel', defaultMessage: 'Cancel'});
        const options = [];
        const actions = [];

        if (canJoinPublicChannels) {
            actions.push(this.goToMoreChannels);
            options.push(moreChannelsText);
        }

        if (canCreatePublicChannels) {
            actions.push(this.goToCreatePublicChannel);
            options.push(newPublicChannelText);
        }

        if (canCreatePrivateChannels) {
            actions.push(this.goToCreatePrivateChannel);
            options.push(newPrivateChannelText);
        }

        actions.push(this.goToDirectMessages);
        options.push(newDirectChannelText);
        options.push(cancelText);

        const cancelButtonIndex = options.length - 1;

        BottomSheet.showBottomSheetWithOptions({
            anchor: this.combinedActionsRef?.current ? findNodeHandle(this.combinedActionsRef.current) : null,
            options,
            cancelButtonIndex,
        }, (value) => {
            if (value !== cancelButtonIndex) {
                actions[value]();
            }
        });
    };

    goToCreatePublicChannel = preventDoubleTap(() => {
        const {showModal} = this.props;
        const {intl} = this.context;
        const screen = 'CreateChannel';
        const title = intl.formatMessage({id: 'mobile.create_channel.public', defaultMessage: 'New Public Channel'});
        const passProps = {
            channelType: General.OPEN_CHANNEL,
            closeButton: this.closeButton,
        };

        showModal(screen, title, passProps);
    });

    goToCreatePrivateChannel = preventDoubleTap(() => {
        const {showModal} = this.props;
        const {intl} = this.context;
        const screen = 'CreateChannel';
        const title = intl.formatMessage({id: 'mobile.create_channel.private', defaultMessage: 'New Private Channel'});
        const passProps = {
            channelType: General.PRIVATE_CHANNEL,
            closeButton: this.closeButton,
        };

        showModal(screen, title, passProps);
    });

    goToDirectMessages = preventDoubleTap(() => {
        const {showModal} = this.props;
        const {intl} = this.context;
        const screen = 'MoreDirectMessages';
        const title = intl.formatMessage({id: 'mobile.more_dms.title', defaultMessage: 'New Conversation'});
        const passProps = {};
        const options = {
            topBar: {
                leftButtons: [{
                    id: 'close-dms',
                    icon: this.closeButton,
                }],
            },
        };

        showModal(screen, title, passProps, options);
    });

    goToMoreChannels = preventDoubleTap(() => {
        const {showModal} = this.props;
        const {intl} = this.context;
        const screen = 'MoreChannels';
        const title = intl.formatMessage({id: 'more_channels.title', defaultMessage: 'More Channels'});
        const passProps = {
            closeButton: this.closeButton,
        };

        showModal(screen, title, passProps);
    });

    keyExtractor = (item) => item.id || item;

    onSelectChannel = (channel, currentChannelId) => {
        const {onSelectChannel} = this.props;
        if (DeviceTypes.IS_TABLET) {
            Keyboard.dismiss();
        }
        onSelectChannel(channel, currentChannelId);
    };

    onLayout = (event) => {
        const {width} = event.nativeEvent.layout;
        this.setState({width: width - 40});
    };

    renderSectionAction = (styles, action, anchor) => {
        const {theme} = this.props;
        return (
            <TouchableHighlight
                style={styles.actionContainer}
                onPress={action}
                underlayColor={changeOpacity(theme.sidebarTextHoverBg, 0.5)}
            >
                <MaterialIcon
                    name='add'
                    ref={anchor ? this.combinedActionsRef : null}
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
        const {favoriteChannelIds, isLandscape, unreadChannelIds, previewChannel, teammateDisplayNameSettings, theme} = this.props;

        return (
            <ChannelItem
                channelId={item}
                isFavorite={favoriteChannelIds.includes(item)}
                isLandscape={isLandscape}
                isUnread={unreadChannelIds.includes(item)}
                onSelectChannel={this.onSelectChannel}
                previewChannel={previewChannel}
                teammateDisplayNameSettings={teammateDisplayNameSettings}
                theme={theme}
            />
        );
    };

    renderSectionHeader = ({section}) => {
        const {styles, isLandscape} = this.props;
        const {intl} = this.context;
        const {
            action,
            bottomSeparator,
            defaultMessage,
            id,
            topSeparator,
        } = section;

        const anchor = (id === 'sidebar.types.recent' || id === 'mobile.channel_list.channels');

        return (
            <View>
                {topSeparator && this.renderSectionSeparator()}
                <View style={[styles.titleContainer, padding(isLandscape)]}>
                    <Text style={styles.title}>
                        {intl.formatMessage({id, defaultMessage}).toUpperCase()}
                    </Text>
                    {action && this.renderSectionAction(styles, action, anchor)}
                </View>
                {bottomSeparator && this.renderSectionSeparator()}
            </View>
        );
    };

    scrollToTop = () => {
        if (this.listRef?.current) {
            this.listRef.current.list._wrapperListRef.getListRef().scrollToOffset({ //eslint-disable-line no-underscore-dangle
                x: 0,
                y: 0,
                animated: true,
            });
        }
    };

    emitUnreadIndicatorChange = debounce((showIndicator) => {
        if (showIndicator && !UnreadIndicator) {
            UnreadIndicator = require('app/components/sidebars/main/channels_list/unread_indicator').default;
        }
        this.setState({showIndicator});
    }, 100);

    updateUnreadIndicators = ({viewableItems}) => {
        InteractionManager.runAfterInteractions(() => {
            const {unreadChannelIds} = this.props;
            const firstUnread = unreadChannelIds.length && unreadChannelIds[0];
            if (firstUnread && viewableItems.length) {
                const isVisible = viewableItems.find((v) => v.item === firstUnread);

                return this.emitUnreadIndicatorChange(!isVisible);
            }

            return this.emitUnreadIndicatorChange(false);
        });
    };

    scrollBeginDrag = () => {
        if (DeviceTypes.IS_TABLET) {
            Keyboard.dismiss();
        }
    };

    listContentPadding = () => {
        if (DeviceTypes.IS_TABLET) {
            return 64;
        }

        const {width, height} = Dimensions.get('window');
        const landscape = width > height;
        if (DeviceTypes.IS_IPHONE_X) {
            return landscape ? 54 : 44;
        }

        return 64;
    };

    render() {
        const {styles, theme, isLandscape, orderedChannelIds} = this.props;
        const {width, showIndicator} = this.state;

        const paddingBottom = this.listContentPadding();

        const unreadBarStyles = DeviceTypes.IS_IPHONE_X && isLandscape ? {width: width - 32, marginLeft: ViewTypes.IOS_HORIZONTAL_LANDSCAPE + 16} : {width};

        const unreadTextStyles = DeviceTypes.IS_IPHONE_X && isLandscape ? {marginLeft: -44} : null;

        return (
            <View
                style={styles.container}
                onLayout={this.onLayout}
            >
                <SectionList
                    ref='list'
                    sections={this.buildSections(orderedChannelIds)}
                    contentContainerStyle={{paddingBottom}}
                    renderItem={this.renderItem}
                    renderSectionHeader={this.renderSectionHeader}
                    keyExtractor={this.keyExtractor}
                    onViewableItemsChanged={this.updateUnreadIndicators}
                    maxToRenderPerBatch={10}
                    stickySectionHeadersEnabled={false}
                    viewabilityConfig={VIEWABILITY_CONFIG}
                    keyboardShouldPersistTaps={'always'}
                    {...this.keyboardDismissProp}
                />
                {showIndicator &&
                <UnreadIndicator
                    show={showIndicator}
                    style={[styles.above, unreadBarStyles]}
                    textStyle={unreadTextStyles}
                    onPress={this.scrollToTop}
                    theme={theme}
                />
                }
            </View>
        );
    }
}
