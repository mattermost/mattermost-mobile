// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React from 'react';
import PureRenderMixin from 'react-addons-pure-render-mixin';

import Drawer from 'react-native-drawer';
import ChannelList from './channel_list';

export default class ChannelSidebar extends React.Component {
    static propTypes = {
        children: React.PropTypes.element.isRequired,
        actions: React.PropTypes.shape({
            selectChannel: React.PropTypes.func.isRequired,
            closeChannelSidebar: React.PropTypes.func.isRequired
        }).isRequired,
        currentTeam: React.PropTypes.object,
        currentChannelId: React.PropTypes.string,
        channels: React.PropTypes.object,
        preferences: React.PropTypes.object,
        theme: React.PropTypes.object.isRequired,
        isOpen: React.PropTypes.bool.isRequired
    };

    constructor(props) {
        super(props);

        this.shouldComponentUpdate = PureRenderMixin.shouldComponentUpdate.bind(this);
    }

    componentWillReceiveProps(nextProps) {
        if (!this.props.isOpen && nextProps.isOpen) {
            this.drawer.open();
        } else if (this.props.isOpen && !nextProps.isOpen) {
            this.drawer.close();
        }
    }

    render() {
        const {
            currentChannelId,
            currentTeam,
            channels,
            preferences,
            theme
        } = this.props;

        return (
            <Drawer
                ref={(ref) => {
                    this.drawer = ref;
                }}
                onClose={this.props.actions.closeChannelSidebar}
                drawerType='displace'
                openDrawerOffset={100}
                closedDrawerOffset={0}
                panOpenMask={0.1}
                panCloseMask={0.9}
                relativeDrag={false}
                panThreshold={0.25}
                tweenHandlerOn={false}
                tweenDuration={350}
                tweenEasing='linear'
                acceptTap={false}
                acceptPan={true}
                tapToClose={true}
                negotiatePan={false}
                content={
                    <ChannelList
                        currentTeam={currentTeam}
                        currentChannelId={currentChannelId}
                        channels={channels}
                        preferences={preferences}
                        theme={theme}
                        onSelectChannel={this.props.actions.selectChannel}
                        closeChannelSidebar={this.props.actions.closeChannelSidebar}
                    />
                    }
            >
                {this.props.children}
            </Drawer>
        );
    }
}
