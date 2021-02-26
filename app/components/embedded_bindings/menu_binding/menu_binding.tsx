// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';

import AutocompleteSelector from 'app/components/autocomplete_selector';
import {intlShape} from 'react-intl';
import {PostActionOption} from '@mm-redux/types/integration_actions';
import {Post} from '@mm-redux/types/posts';
import {AppBinding, AppCall} from '@mm-redux/types/apps';
import {ActionResult} from '@mm-redux/types/actions';
import {AppExpandLevels, AppBindingLocations} from '@mm-redux/constants/apps';

type Props = {
    actions: {
        doAppCall: (call: AppCall, intl: any) => Promise<ActionResult>;
    };
    binding?: AppBinding;
    post: Post;
    userId: string;
}

type State = {
    selected?: PostActionOption;
}

export default class MenuBinding extends PureComponent<Props, State> {
    static contextTypes = {
        intl: intlShape.isRequired,
    };

    constructor(props: Props) {
        super(props);
        this.state = {};
    }

    handleSelect = (selected?: PostActionOption) => {
        if (!selected) {
            return;
        }

        this.setState({selected});
        const binding = this.props.binding?.bindings?.find((b) => b.location === selected.value);
        if (!binding) {
            console.debug('Trying to select element not present in binding.'); //eslint-disable-line no-console
            return;
        }

        const {
            actions,
            post,
            userId,
        } = this.props;

        const call: AppCall = {
            url: binding.call?.url || '',
            expand: {
                post: AppExpandLevels.EXPAND_ALL,
            },
            context: {
                ...binding.call?.context,
                acting_user_id: userId,
                app_id: binding.app_id,
                channel_id: post.channel_id,
                location: AppBindingLocations.IN_POST + '/' + binding.location,
                post_id: post.id,
                user_id: userId,
            },
        };

        actions.doAppCall(call, this.context.intl);
    };

    render() {
        const {
            binding,
        } = this.props;
        const {selected} = this.state;

        const options = binding?.bindings?.map<PostActionOption>((b:AppBinding) => {
            return {text: b.label, value: b.location || ''};
        });

        return (
            <AutocompleteSelector
                placeholder={binding?.label}
                options={options}
                selected={selected}
                onSelected={this.handleSelect}
            />
        );
    }
}
