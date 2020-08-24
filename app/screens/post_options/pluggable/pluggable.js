// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';

import {doPluginAction} from '@actions/plugins';
import {isSystemMessage} from '@mm-redux/utils/post_utils';

import PostOption from '../post_option';

const Pluggable = (props) => {
    const {plugins, post, ...optionProps} = props;
    if (plugins.length === 0) {
        return null;
    }

    if (isSystemMessage(post)) {
        return null;
    }

    const options = plugins.map((p) => (
        <Option
            key={p.id + p.extra.text}
            plugin={p}
            post={post}
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
    post: PropTypes.object.isRequired,
    closeWithAnimation: PropTypes.func.isRequired,
};

export default Pluggable;

class Option extends PureComponent {
    static propTypes = {
        plugin: PropTypes.object.isRequired,
        theme: PropTypes.object.isRequired,
        isLandscape: PropTypes.bool.isRequired,
        post: PropTypes.object.isRequired,
        closeWithAnimation: PropTypes.func.isRequired,
    }

    onPress = () => {
        const {id, request_url} = this.props.plugin;
        const {closeWithAnimation, post} = this.props
        doPluginAction(id, request_url, {post_id: post.id});
        closeWithAnimation();
    }

    render() {
        const {plugin, theme, isLandscape} = this.props;
        return (
            <PostOption
                icon={plugin.extra.icon}
                text={plugin.extra.text}
                onPress={this.onPress}
                isLandscape={isLandscape}
                theme={theme}
            />
        )
    }
}
