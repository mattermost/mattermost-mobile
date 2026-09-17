// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// Not a withDatabase HOC: the create screen's own index.tsx already reads
// observeCreatableChannelAttributeFields, because the screen needs that same
// list to gate the Create button. A second subscription here would read the
// same rows twice for no benefit.
export {default, type ChannelAttributeFormValues} from './channel_attribute_form';
