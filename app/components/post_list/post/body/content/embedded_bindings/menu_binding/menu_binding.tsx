// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useState} from 'react';
import {intlShape, injectIntl} from 'react-intl';

import {showAppForm} from '@actions/navigation';
import AutocompleteSelector from '@components/autocomplete_selector';
import {AppBindingLocations, AppCallResponseTypes} from '@mm-redux/constants/apps';
import {ActionResult} from '@mm-redux/types/actions';
import {Theme} from '@mm-redux/types/theme';
import {createCallContext} from '@utils/apps';

import type {AppBinding} from '@mm-redux/types/apps';
import type {PostActionOption} from '@mm-redux/types/integration_actions';
import type {Post} from '@mm-redux/types/posts';
import type {HandleBindingClick, PostEphemeralCallResponseForPost} from '@mm-types/actions/apps';

type Props = {
    binding: AppBinding;
    handleBindingClick: HandleBindingClick;
    intl: typeof intlShape;
    post: Post;
    postEphemeralCallResponseForPost: PostEphemeralCallResponseForPost;
    handleGotoLocation: (href: string, intl: any) => Promise<ActionResult>;
    teamID: string;
    theme: Theme;
}

const MenuBinding = ({binding, handleBindingClick, intl, post, postEphemeralCallResponseForPost, handleGotoLocation, teamID, theme}: Props) => {
    const [selected, setSelected] = useState<PostActionOption>();

    const onSelect = useCallback(async (picked?: PostActionOption) => {
        if (!picked) {
            return;
        }
        setSelected(picked);

        const bind = binding.bindings?.find((b) => b.location === picked.value);
        if (!bind) {
            console.debug('Trying to select element not present in binding.'); //eslint-disable-line no-console
            return;
        }

        const context = createCallContext(
            bind.app_id,
            AppBindingLocations.IN_POST + bind.location,
            post.channel_id,
            teamID,
            post.id,
        );

        const res = await handleBindingClick(bind, context, intl);
        if (res.error) {
            const errorResponse = res.error;
            const errorMessage = errorResponse.text || intl.formatMessage({
                id: 'apps.error.unknown',
                defaultMessage: 'Unknown error occurred.',
            });
            postEphemeralCallResponseForPost(res.error, errorMessage, post);
            return;
        }

        const callResp = res.data!;
        switch (callResp.type) {
        case AppCallResponseTypes.OK:
            if (callResp.text) {
                postEphemeralCallResponseForPost(callResp, callResp.text, post);
            }
            return;
        case AppCallResponseTypes.NAVIGATE:
            handleGotoLocation(callResp.navigate_to_url!, intl);
            return;
        case AppCallResponseTypes.FORM:
            showAppForm(callResp.form, context, theme);
            return;
        default: {
            const errorMessage = intl.formatMessage({
                id: 'apps.error.responses.unknown_type',
                defaultMessage: 'App response type not supported. Response type: {type}.',
            }, {
                type: callResp.type,
            });
            postEphemeralCallResponseForPost(callResp, errorMessage, post);
        }
        }
    }, [theme]);

    const options = binding.bindings?.map<PostActionOption>((b: AppBinding) => {
        return {text: b.label, value: b.location || ''};
    });

    return (
        <AutocompleteSelector
            placeholder={binding.label}
            options={options}
            selected={selected}
            onSelected={onSelect}
        />
    );
};

export default injectIntl(MenuBinding);
