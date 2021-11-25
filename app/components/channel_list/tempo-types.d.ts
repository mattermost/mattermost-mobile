// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// THIS IS TEMPORARY POC/MVP - WILL BE REMOVEd
// @to-do - Wire up actual models
type TempoChannel = {
    id: string;
    name: string;
    highlight?: boolean;
};

type TempoCategory = {
    id: string;
    title: string;
    channels: TempoChannel[];
}
