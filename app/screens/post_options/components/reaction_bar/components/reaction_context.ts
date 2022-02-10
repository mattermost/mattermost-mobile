// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

const ReactionContext = React.createContext('');

export const ReactionProvider = ReactionContext.Provider;
export const ReactionConsumer = ReactionContext.Consumer;

export const useSelectedReaction = () => React.useContext(ReactionContext);
