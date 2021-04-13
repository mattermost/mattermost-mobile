// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';

import AutocompleteSelector from 'app/components/autocomplete_selector';
import {intlShape} from 'react-intl';
import {PostActionOption} from '@mm-redux/types/integration_actions';
import {Post} from '@mm-redux/types/posts';
import {AppBinding} from '@mm-redux/types/apps';
import {ActionResult} from '@mm-redux/types/actions';
import {DoAppCall, PostEphemeralCallResponseForPost} from 'types/actions/apps';
import {AppExpandLevels, AppBindingLocations, AppCallTypes, AppCallResponseTypes} from '@mm-redux/constants/apps';
import {Channel} from '@mm-redux/types/channels';
import {createCallContext, createCallRequest} from '@utils/apps';

type Props = {
    actions: {
        doAppCall: DoAppCall;
        getChannel: (channelId: string) => Promise<ActionResult>;
        postEphemeralCallResponseForPost: PostEphemeralCallResponseForPost;
    };
    binding?: AppBinding;
    post: Post;
    currentTeamID: string;
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

    handleSelect = async (selected?: PostActionOption) => {
        if (!selected) {
            return;
        }

        this.setState({selected});
        const binding = this.props.binding?.bindings?.find((b) => b.location === selected.value);
        if (!binding) {
            console.debug('Trying to select element not present in binding.'); //eslint-disable-line no-console
            return;
        }

        if (!binding.call) {
            return;
        }

        const {
            actions,
            post,
            currentTeamID,
        } = this.props;
        const intl = this.context.intl;

        let teamID = '';
        const {data} = await this.props.actions.getChannel(post.channel_id) as {data?: any; error?: any};
        if (data) {
            const channel = data as Channel;
            teamID = channel.team_id;
        }

        const context = createCallContext(
            binding.app_id,
            AppBindingLocations.IN_POST + binding.location,
            post.channel_id,
            teamID || currentTeamID,
            post.id,
        );
        const call = createCallRequest(
            binding.call,
            context,
            {post: AppExpandLevels.EXPAND_ALL},
        );

        const res = await actions.doAppCall(call, AppCallTypes.SUBMIT, intl);
        if (res.error) {
            const errorResponse = res.error;
            const errorMessage = errorResponse.error || intl.formatMessage({
                id: 'apps.error.unknown',
                defaultMessage: 'Unknown error occurred.',
            });
            this.props.actions.postEphemeralCallResponseForPost(res.error, errorMessage, post);
            return;
        }

        const callResp = res.data!;
        switch (callResp.type) {
        case AppCallResponseTypes.OK:
            if (callResp.markdown) {
                this.props.actions.postEphemeralCallResponseForPost(callResp, callResp.markdown, post);
            }
            return;
        case AppCallResponseTypes.NAVIGATE:
        case AppCallResponseTypes.FORM:
            return;
        default: {
            const errorMessage = intl.formatMessage({
                id: 'apps.error.responses.unknown_type',
                defaultMessage: 'App response type not supported. Response type: {type}.',
            }, {
                type: callResp.type,
            });
            this.props.actions.postEphemeralCallResponseForPost(callResp, errorMessage, post);
        }
        }
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
