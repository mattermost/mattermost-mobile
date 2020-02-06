// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {
    Dimensions,
    findNodeHandle,
    Keyboard,
    Platform,
    SectionList,
    Text,
    TouchableHighlight,
    View,
} from 'react-native';
import {intlShape} from 'react-intl';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import FontAwesomePro from 'react-native-vector-icons/Ionicons';

import {General} from 'mattermost-redux/constants';
import {debounce} from 'mattermost-redux/actions/helpers';

import ChannelItem from 'app/components/sidebars/main/channels_list/channel_item';
import {paddingLeft as padding} from 'app/components/safe_area_view/iphone_x_spacing';
import {DeviceTypes, ListTypes} from 'app/constants';
import {SidebarSectionTypes} from 'app/constants/view';

import BottomSheet from 'app/utils/bottom_sheet';
import {t} from 'app/utils/i18n';
import {preventDoubleTap} from 'app/utils/tap';
import {showModal} from 'app/actions/navigation';

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
        onSelectChannel: PropTypes.func.isRequired,
        unreadChannelIds: PropTypes.array.isRequired,
        styles: PropTypes.object.isRequired,
        theme: PropTypes.object.isRequired,
        orderedChannelIds: PropTypes.array.isRequired,
        isLandscape: PropTypes.bool.isRequired,
    };

    static contextTypes = {
        intl: intlShape,
    };

    constructor(props) {
        super(props);

        this.combinedActionsRef = React.createRef();

        this.state = {
            sections: this.buildSections(props),
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

    componentDidMount() {
        if (!UnreadIndicator) {
            UnreadIndicator = require('app/components/sidebars/main/channels_list/unread_indicator').default;
        }
    }

    componentWillReceiveProps(nextProps) {
        const {
            canCreatePrivateChannels,
            orderedChannelIds,
            unreadChannelIds,
        } = this.props;

        if (nextProps.canCreatePrivateChannels !== canCreatePrivateChannels ||
            nextProps.unreadChannelIds !== unreadChannelIds ||
            nextProps.orderedChannelIds !== orderedChannelIds) {
            this.setState({sections: this.buildSections(nextProps)});
        }
    }

    componentDidUpdate(prevProps, prevState) {
        if (prevState.sections !== this.state.sections && this.listRef?._wrapperListRef?.getListRef()._viewabilityHelper) { //eslint-disable-line
            this.listRef.recordInteraction();
            this.updateUnreadIndicators({
                viewableItems: Array.from(this.listRef._wrapperListRef.getListRef()._viewabilityHelper._viewableItems.values()) //eslint-disable-line
            });
        }
    }

    setListRef = (ref) => {
        this.listRef = ref;
    }

    getSectionConfigByType = (props, sectionType) => {
        const {canCreatePrivateChannels, canJoinPublicChannels} = props;

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

    buildSections = (props) => {
        const {
            orderedChannelIds,
        } = props;

        return orderedChannelIds.map((s) => {
            return {
                ...this.getSectionConfigByType(props, s.type),
                data: s.items,
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
        return (
            <TouchableHighlight
                style={styles.actionContainer}
                onPress={action}
                underlayColor={'transparent'}
                hitSlop={styles.hitSlop}
            >
                <FontAwesomePro
                    name='ios-add-circle-outline'
                    ref={anchor ? this.combinedActionsRef : null}
                    style={styles.action}
                />
            </TouchableHighlight>
        );
    };

    renderItem = ({item}) => {
        const {favoriteChannelIds, unreadChannelIds} = this.props;

        return (
            <ChannelItem
                channelId={item}
                isUnread={unreadChannelIds.includes(item)}
                isFavorite={favoriteChannelIds.includes(item)}
                onSelectChannel={this.onSelectChannel}
            />
        );
    };

    renderSectionHeader = ({section}) => {
        const {styles, isLandscape} = this.props;
        const {intl} = this.context;
        const {
            action,
            defaultMessage,
            id,
        } = section;

        const anchor = (id === 'sidebar.types.recent' || id === 'mobile.channel_list.channels');

        return (
            <React.Fragment>
                <View style={[styles.titleContainer, padding(isLandscape)]}>
                    <Text style={styles.title}>
                        {intl.formatMessage({id, defaultMessage}).toUpperCase()}
                    </Text>
                    <View style={styles.separatorContainer}>
                        <View style={styles.separator}/>
                    </View>
                    {action && this.renderSectionAction(styles, action, anchor)}
                </View>
            </React.Fragment>
        );
    };

    scrollToTop = () => {
        if (this.listRef?._wrapperListRef) {
            this.listRef._wrapperListRef.getListRef().scrollToOffset({ //eslint-disable-line no-underscore-dangle
                x: 0,
                y: 0,
                animated: true,
            });
        }
    };

    emitUnreadIndicatorChange = debounce((showIndicator) => {
        this.setState({showIndicator});
    }, 10);

    updateUnreadIndicators = ({viewableItems}) => {
        const {unreadChannelIds} = this.props;
        const firstUnread = unreadChannelIds.length && unreadChannelIds[0];
        if (firstUnread && viewableItems.length) {
            const isVisible = viewableItems.find((v) => v.item === firstUnread);

            return this.emitUnreadIndicatorChange(!isVisible);
        }

        return this.emitUnreadIndicatorChange(false);
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
        if (DeviceTypes.IS_IPHONE_WITH_INSETS) {
            return landscape ? 54 : 44;
        }

        return 64;
    };

    render() {
        const {styles, theme} = this.props;
        const {sections, showIndicator} = this.state;

        const paddingBottom = this.listContentPadding();

        return (
            <View
                style={styles.container}
                onLayout={this.onLayout}
            >
                <SectionList
                    ref={this.setListRef}
                    sections={sections}
                    contentContainerStyle={{paddingBottom}}
                    renderItem={this.renderItem}
                    renderSectionHeader={this.renderSectionHeader}
                    keyboardShouldPersistTaps={'always'}
                    keyExtractor={this.keyExtractor}
                    onViewableItemsChanged={this.updateUnreadIndicators}
                    maxToRenderPerBatch={10}
                    stickySectionHeadersEnabled={true}
                    viewabilityConfig={VIEWABILITY_CONFIG}
                    {...this.keyboardDismissProp}
                />
                {UnreadIndicator &&
                <UnreadIndicator
                    onPress={this.scrollToTop}
                    theme={theme}
                    style={styles.above}
                    visible={showIndicator}
                />
                }
            </View>
        );
    }
}
