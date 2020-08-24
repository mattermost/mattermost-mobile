// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';

import {doPluginAction} from '@actions/plugins';
import Separator from '@screens/channel_info/separator';

import ChannelInfoRow from '../channel_info_row';

const Pluggable = (props) => {
    const {plugins, ...optionProps} = props;
    if (plugins.length === 0) {
        return null;
    }

    const options = plugins.map((p) => (
        <Option
            key={p.id + p.extra.text}
            plugin={p}
            {...optionProps}
        />
    ));

    return (
        <>
            {options}
        </>
    );
}

Pluggable.propTypes = {
    plugins: PropTypes.array.isRequired,
    theme: PropTypes.object.isRequired,
    isLandscape: PropTypes.bool.isRequired,
    currentChannel: PropTypes.object.isRequired,
};

export default Pluggable;

class Option extends PureComponent {
    static propTypes = {
        plugin: PropTypes.object.isRequired,
        theme: PropTypes.object.isRequired,
        isLandscape: PropTypes.bool.isRequired,
        currentChannel: PropTypes.object.isRequired,
    }

    onPress = () => {
        const {id, request_url} = this.props.plugin;
        const channelId = this.props.currentChannel.id
        doPluginAction(id, request_url, {channel_id: channelId});
    }

    render() {
        const {plugin, theme, isLandscape} = this.props;
        return (
            <>
                <Separator theme={theme}/>
                <ChannelInfoRow
                    action={this.onPress}
                    defaultMessage={plugin.extra.text}
                    theme={theme}
                    isLandscape={isLandscape}
                    textId={plugin.id + plugin.request_url}
                    image={{uri: plugin.extra.icon}}
                />
            </>
        )
    }
}
