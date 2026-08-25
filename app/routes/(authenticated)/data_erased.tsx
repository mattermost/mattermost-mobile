// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import {usePropsFromParams} from '@hooks/props_from_params';
import DataErased, {type DataErasedProps} from '@screens/data_erased';

export default function DataErasedRoute() {
    const props = usePropsFromParams<DataErasedProps>();
    return <DataErased {...props}/>;
}
