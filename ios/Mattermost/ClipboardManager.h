//
//  ClipboardManager.h
//  Mattermost
//
//  Created by Tek Min Ewe on 03/08/2019.
//  Copyright © 2019 Facebook. All rights reserved.
//

#import <Foundation/Foundation.h>

NS_ASSUME_NONNULL_BEGIN

@interface ClipboardManager : NSObject

+(NSDictionary *)getCopiedImage;

@end

NS_ASSUME_NONNULL_END
