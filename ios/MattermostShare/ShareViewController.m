#import "ShareViewController.h"
#import <React/RCTBundleURLProvider.h>
#import <React/RCTRootView.h>
#import "PerformRequests.h"
#import "SessionManager.h"

NSExtensionContext* extensionContext;

@implementation ShareViewController
+ (BOOL)requiresMainQueueSetup
{
  return YES;
}

- (UIView*) shareView {
  NSURL *jsCodeLocation;
  
  jsCodeLocation = [[RCTBundleURLProvider sharedSettings] jsBundleURLForBundleRoot:@"share.ios" fallbackResource:nil];
  
  RCTRootView *rootView = [[RCTRootView alloc] initWithBundleURL:jsCodeLocation
                                                      moduleName:@"MattermostShare"
                                               initialProperties:nil
                                                   launchOptions:nil];
  rootView.backgroundColor = nil;
  return rootView;
}

RCT_EXPORT_MODULE(MattermostShare);

- (void)viewDidLoad {
  [super viewDidLoad];
  extensionContext = self.extensionContext;
  UIView *rootView = [self shareView];
  if (rootView.backgroundColor == nil) {
    rootView.backgroundColor = [[UIColor alloc] initWithRed:1 green:1 blue:1 alpha:0.1];
  }
  
  self.view = rootView;
}

RCT_REMAP_METHOD(getOrientation,
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
  if([UIScreen mainScreen].bounds.size.width < [UIScreen mainScreen].bounds.size.height) {
    resolve(@"PORTRAIT");
  } else {
    resolve(@"LANDSCAPE");
  }
}

RCT_EXPORT_METHOD(close:(NSDictionary *)data appGroupId:(NSString *)appGroupId) {
  if (data != nil) {
    NSString *requestId = [data objectForKey:@"requestId"];
    NSString *useBackgroundUpload = [data objectForKey:@"useBackgroundUpload"];
    BOOL isBackgroundUpload = useBackgroundUpload ? [useBackgroundUpload boolValue] : NO;

    if (isBackgroundUpload) {
      NSString *requestWithGroup = [NSString stringWithFormat:@"%@|%@", requestId, appGroupId];
      [[SessionManager sharedSession] setDataForRequest:data forRequestWithGroup:requestWithGroup];
      [[SessionManager sharedSession] createPostForRequest:requestWithGroup];

      [extensionContext completeRequestReturningItems:nil
                                    completionHandler:nil];
      NSLog(@"Extension closed");
    } else {
      NSDictionary *post = [data objectForKey:@"post"];
      NSArray *files = [data objectForKey:@"files"];
      PerformRequests *request = [[PerformRequests alloc] initWithPost:post withFiles:files forRequestId:requestId inAppGroupId:appGroupId inContext:extensionContext];
      [request createPost];
    }
  } else {
    [extensionContext completeRequestReturningItems:nil
                                completionHandler:nil];
    NSLog(@"Extension closed");
  }
}

RCT_REMAP_METHOD(data,
                 appGroupId: (NSString *)appGroupId
                 resolver:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject)
{
  [self extractDataFromContext: extensionContext withAppGroup: appGroupId andCallback:^(NSArray* items ,NSError* err) {
    if (err) {
      reject(@"data", @"Failed to extract attachment content", err);
      return;
    }
    resolve(items);
  }];
}

typedef void (^ProviderCallback)(NSString *content, NSString *contentType, BOOL owner, NSError *err);

- (void)extractDataFromContext:(NSExtensionContext *)context withAppGroup:(NSString *) appGroupId andCallback:(void(^)(NSArray *items ,NSError *err))callback {
  @try {
    NSExtensionItem *item = [context.inputItems firstObject];
    NSArray *attachments = item.attachments;
    NSMutableArray *items = [[NSMutableArray alloc] init];
    
    __block int attachmentIdx = 0;
    __block ProviderCallback providerCb = nil;
    __block __weak ProviderCallback weakProviderCb = nil;
    providerCb = ^ void (NSString *content, NSString *contentType, BOOL owner, NSError *err) {
      if (err) {
        callback(nil, err);
        return;
      }
      
      if (content != nil) {
        [items addObject:@{
                           @"type": contentType,
                           @"value": content,
                           @"owner": [NSNumber numberWithBool:owner],
                           }];
      }
      
      ++attachmentIdx;
      if (attachmentIdx == [attachments count]) {
        callback(items, nil);
      } else {
        [self extractDataFromProvider:attachments[attachmentIdx] withAppGroup:appGroupId andCallback: weakProviderCb];
      }
    };
    weakProviderCb = providerCb;
    [self extractDataFromProvider:attachments[0] withAppGroup:appGroupId andCallback: providerCb];
  }
  @catch (NSException *exc) {
    NSError *error = [NSError errorWithDomain:@"fiftythree.paste" code:1 userInfo:@{
                                                                                    @"reason": [exc description]
                                                                                    }];
    callback(nil, error);
  }
}

- (void)extractDataFromProvider:(NSItemProvider *)provider withAppGroup:(NSString *) appGroupId andCallback:(void(^)(NSString* content, NSString* contentType, BOOL owner, NSError *err))callback {
  if([provider hasItemConformingToTypeIdentifier:@"public.movie"]) {
    [provider loadItemForTypeIdentifier:@"public.movie" options:nil completionHandler:^(id<NSSecureCoding, NSObject> item, NSError *error) {
      @try {
        if ([item isKindOfClass: NSURL.class]) {
          NSURL *url = (NSURL *)item;
          return callback([url absoluteString], @"public.movie", NO, nil);
        }
        return callback(nil, nil, NO, nil);
      }
      @catch(NSException *exc) {
        NSError *error = [NSError errorWithDomain:@"fiftythree.paste" code:2 userInfo:@{
                                                                                        @"reason": [exc description]
                                                                                        }];
        callback(nil, nil, NO, error);
      }
    }];
    return;
  }
  if([provider hasItemConformingToTypeIdentifier:@"public.image"]) {
    [provider loadItemForTypeIdentifier:@"public.image" options:nil completionHandler:^(id<NSSecureCoding, NSObject> item, NSError *error) {
      if (error) {
        callback(nil, nil, NO, error);
        return;
      }
      
      @try {
        if ([item isKindOfClass: NSURL.class]) {
          NSURL *url = (NSURL *)item;
          return callback([url absoluteString], @"public.image", NO, nil);
        } else if ([item isKindOfClass: UIImage.class]) {
          UIImage *image = (UIImage *)item;
          NSString *fileName = [NSString stringWithFormat:@"%@.jpg", [[NSUUID UUID] UUIDString]];
          NSURL *tempContainerURL = [[SessionManager sharedSession] tempContainerURL:appGroupId];
          if (tempContainerURL == nil){
            return callback(nil, nil, NO, nil);
          }
          
          NSURL *tempFileURL = [tempContainerURL URLByAppendingPathComponent: fileName];
          BOOL created = [UIImageJPEGRepresentation(image, 1) writeToFile:[tempFileURL path] atomically:YES];
          if (created) {
            return callback([tempFileURL absoluteString], @"public.image", YES, nil);
          } else {
            return callback(nil, nil, NO, nil);
          }
        } else if ([item isKindOfClass: NSData.class]) {
          NSString *fileName = [NSString stringWithFormat:@"%@.jpg", [[NSUUID UUID] UUIDString]];
          NSData *data = (NSData *)item;
          UIImage *image = [UIImage imageWithData:data];
          NSURL *tempContainerURL = [[SessionManager sharedSession] tempContainerURL:appGroupId];
          if (tempContainerURL == nil){
            return callback(nil, nil, NO, nil);
          }
          NSURL *tempFileURL = [tempContainerURL URLByAppendingPathComponent: fileName];
          BOOL created = [UIImageJPEGRepresentation(image, 0.95) writeToFile:[tempFileURL path] atomically:YES];
          if (created) {
            return callback([tempFileURL absoluteString], @"public.image", YES, nil);
          } else {
            return callback(nil, nil, NO, nil);
          }
        } else {
          // Do nothing, some type we don't support.
          return callback(nil, nil, NO, nil);
        }
      }
      @catch(NSException *exc) {
        NSError *error = [NSError errorWithDomain:@"fiftythree.paste" code:2 userInfo:@{
                                                                                        @"reason": [exc description]
                                                                                        }];
        callback(nil, nil, NO, error);
      }
    }];
    return;
  }
  
  if([provider hasItemConformingToTypeIdentifier:@"public.file-url"]) {
    [provider loadItemForTypeIdentifier:@"public.file-url" options:nil completionHandler:^(id<NSSecureCoding, NSObject> item, NSError *error) {
      if (error) {
        callback(nil, nil, NO, error);
        return;
      }
      
      if ([item isKindOfClass:NSURL.class]) {
        return callback([(NSURL *)item absoluteString], @"public.file-url", NO, nil);
      } else if ([item isKindOfClass:NSString.class]) {
        return callback((NSString *)item, @"public.file-url", NO, nil);
      }
      callback(nil, nil, NO, nil);
    }];
    return;
  }
  
  if([provider hasItemConformingToTypeIdentifier:@"public.url"]) {
    [provider loadItemForTypeIdentifier:@"public.url" options:nil completionHandler:^(id<NSSecureCoding, NSObject> item, NSError *error) {
      if (error) {
        callback(nil, nil, NO, error);
        return;
      }
      
      if ([item isKindOfClass:NSURL.class]) {
        return callback([(NSURL *)item absoluteString], @"public.url", NO, nil);
      } else if ([item isKindOfClass:NSString.class]) {
        return callback((NSString *)item, @"public.url", NO, nil);
      }
    }];
    return;
  }
  
  if([provider hasItemConformingToTypeIdentifier:@"public.plain-text"]) {
    [provider loadItemForTypeIdentifier:@"public.plain-text" options:nil completionHandler:^(id<NSSecureCoding, NSObject> item, NSError *error) {
      if (error) {
        callback(nil, nil, NO, error);
        return;
      }
      
      if ([item isKindOfClass:NSString.class]) {
        return callback((NSString *)item, @"public.plain-text", NO, nil);
      } else if ([item isKindOfClass:NSAttributedString.class]) {
        NSAttributedString *str = (NSAttributedString *)item;
        return callback([str string], @"public.plain-text", NO, nil);
      } else if ([item isKindOfClass:NSData.class]) {
        NSString *str = [[NSString alloc] initWithData:(NSData *)item encoding:NSUTF8StringEncoding];
        if (str) {
          return callback(str, @"public.plain-text", NO, nil);
        } else {
          return callback(nil, nil, NO, nil);
        }
      } else {
        return callback(nil, nil, NO, nil);
      }
    }];
    return;
  }
  
  callback(nil, nil, NO, nil);
}
@end
