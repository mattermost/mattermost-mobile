// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

/* eslint-disable */

import React from 'react';
import {VirtualizedList} from 'react-native';
import VirtualizedSectionList from 'react-native/Libraries/Lists/VirtualizedSectionList';

export default class VirtualizedScrollableSectionList extends VirtualizedSectionList {
    getListRef() {
        return this._listRef;
    }

    render() {
        return (
            <VirtualizedList {...this.state.childProps} ref={this._captureRef} />
        );
    }

    _listRef: VirtualizedList;
    _captureRef = (ref) => {
        this._listRef = ref;
    };
}
