// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {realmConnect} from 'realm-react-redux';

import TestItem from './test_item';

function mapPropsToQueries(realm, ownProps) {
    const item = realm.objects('Channel').filtered('id=$0', ownProps.itemId);
    return [item];
}

function mapQueriesToProps([items]) {
    // the returned user is always a different object, avoid passing the full object as props to prevent re-renders
    const item = items[0];
    return {
        item,
    };
}

export default realmConnect(mapPropsToQueries, mapQueriesToProps, null, null, {allowUnsafeWrites: true, watchUnsafeWrites: true})(TestItem);
