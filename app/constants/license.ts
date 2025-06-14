// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

export const SKU_SHORT_NAME = {
    E10: 'E10',
    E20: 'E20',
    Starter: 'starter',
    Professional: 'professional',
    Enterprise: 'enterprise',
    EnterpriseAdvanced: 'advanced',
};

export const SelfHostedProducts = {
    STARTER: 'starter',
};

export const TIER = {
    ProfessionalTier: 10,
    EnterpriseTier: 20,
    EnterpriseAdvancedTier: 30,
};

export const LicenseSkuTier = {
    [SKU_SHORT_NAME.Professional]: TIER.ProfessionalTier,
    [SKU_SHORT_NAME.Enterprise]: TIER.EnterpriseTier,
    [SKU_SHORT_NAME.EnterpriseAdvanced]: TIER.EnterpriseAdvancedTier,
};

export default {
    SKU_SHORT_NAME,
    SelfHostedProducts,
    TIER,
    LicenseSkuTier,
};
