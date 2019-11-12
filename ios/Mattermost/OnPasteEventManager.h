//
//  PasteEventManager.h
//  Mattermost
//
//  Created by Tek Min Ewe on 05/08/2019.
//  Copyright © 2019 Facebook. All rights reserved.
//

#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>

NS_ASSUME_NONNULL_BEGIN

@interface OnPasteEventManager : RCTEventEmitter<RCTBridgeModule>

+(void)pasteFiles:(NSArray<NSDictionary *> *)data;

@end

NS_ASSUME_NONNULL_END
