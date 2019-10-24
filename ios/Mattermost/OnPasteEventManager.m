//
//  PasteEventManager.m
//  Mattermost
//
//  Created by Tek Min Ewe on 05/08/2019.
//  Copyright © 2019 Facebook. All rights reserved.
//

#import "OnPasteEventManager.h"

@implementation OnPasteEventManager {
  bool hasListeners;
}

RCT_EXPORT_MODULE();

-(void)startObserving {
  hasListeners = YES;
  
  [[NSNotificationCenter defaultCenter] addObserver:self selector:@selector(onPaste:) name:@"onPaste" object:nil];
}

-(void)stopObserving {
  hasListeners = NO;
  
  [[NSNotificationCenter defaultCenter] removeObserver:self];
}

-(NSArray<NSString *>*)supportedEvents {
  return @[@"onPaste"];
}

-(void)onPaste:(NSNotification *)data {
  if (!hasListeners) {
    return;
  }
  
  [self sendEventWithName:@"onPaste" body:data.userInfo[@"data"]];
}

+(void)pasteFiles:(NSArray<NSDictionary *> *)data {
  [[NSNotificationCenter defaultCenter] postNotificationName:@"onPaste" object:data userInfo:@{
                                                                                               @"data": data
                                                                                               }];
}

@end
