// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import {View} from 'react-native';
import PropTypes from 'prop-types';
import {intlShape} from 'react-intl';

import AutocompleteSelector from 'app/components/autocomplete_selector';

export default class ActionMenu extends PureComponent {
    static propTypes = {
        actions: PropTypes.shape({
            selectAttachmentMenuAction: PropTypes.func.isRequired,
        }).isRequired,
        id: PropTypes.string.isRequired,
        name: PropTypes.string.isRequired,
        dataSource: PropTypes.string,
        options: PropTypes.arrayOf(PropTypes.object),
        postId: PropTypes.string.isRequired,
        selected: PropTypes.object,
        navigator: PropTypes.object,
    };

    static contextTypes = {
        intl: intlShape,
    };

    handleSelect = (selected) => {
        if (!selected) {
            return;
        }

        const {
            actions,
            id,
            postId,
        } = this.props;

        actions.selectAttachmentMenuAction(postId, id, selected.text, selected.value);
    };

    render() {
        const {
            name,
            dataSource,
            selected,
            options,
            navigator,
        } = this.props;

        return (
            <View>
                <AutocompleteSelector
                    placeholder={name}
                    dataSource={dataSource}
                    options={options}
                    selected={selected}
                    navigator={navigator}
                    onSelected={this.handleSelect}
                />
            </View>
        );
    }
}