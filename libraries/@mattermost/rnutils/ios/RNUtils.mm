#import "RNUtils.h"

#ifdef RCT_NEW_ARCH_ENABLED
#import "RNUtilsSpec.h"

using namespace facebook::react;
using namespace JS::NativeRNUtils;
#endif

#if __has_include("mattermost_rnutils-Swift.h")
#import <mattermost_rnutils-Swift.h>
#else
#import <mattermost_rnutils/mattermost_rnutils-Swift.h>
#endif

@interface RNUtils() <RNUtilsDelegate>
@end

@implementation RNUtils {
    RNUtilsWrapper *wrapper;
}

-(instancetype)init {
    self = [super init];
    if (self) {
        wrapper = [RNUtilsWrapper new];
        wrapper.delegate = self;
        [wrapper captureEvents];
    }
    return self;
}

#pragma protocol

- (void)sendEventWithName:(NSString * _Nonnull)name result:(NSDictionary<NSString *,id> * _Nullable)result {
    [self sendEventWithName:name body:result];
}

- (NSArray<NSString *> *)supportedEvents {
  return [RNUtilsWrapper supportedEvents];
}

#pragma overrides
+ (BOOL)requiresMainQueueSetup {
  return NO;
}

- (NSDictionary *)constantsToExport {
  return @{
           @"appGroupIdentifier": [wrapper getAppGroupId],
           @"appGroupSharedDirectory" : [wrapper appGroupSharedDirectory]
           };
}

RCT_EXPORT_MODULE(RNUtils)

RCT_REMAP_BLOCKING_SYNCHRONOUS_METHOD(deleteDatabaseDirectory, NSDictionary*, databaseName:(NSString *)databaseName
                                       shouldRemoveDirectory:(BOOL)shouldRemoveDirectory) {
    return [wrapper deleteDatabaseDirectoryWithDatabaseName:databaseName shouldRemoveDirectory:shouldRemoveDirectory];
}

RCT_REMAP_BLOCKING_SYNCHRONOUS_METHOD(renameDatabase, NSDictionary*, dataabaseName:(NSString *)databaseName
                                       newDatabaseName:(NSString *)newDatabaseName) {
    return [wrapper renameDatabaseWithDatabaseName:databaseName newDatabaseName:newDatabaseName];
}

RCT_REMAP_BLOCKING_SYNCHRONOUS_METHOD(deleteEntitiesFile, NSNumber*, deleteEntities) {
    return [wrapper deleteEntitiesFile];
}

RCT_REMAP_BLOCKING_SYNCHRONOUS_METHOD(isRunningInSplitView, NSDictionary*, isSplitView) {
    return [wrapper isRunningInSplitView];
}

RCT_REMAP_BLOCKING_SYNCHRONOUS_METHOD(getWindowDimensions, NSDictionary*, windowDimensions) {
    return [wrapper getWindowDimensions];
}

RCT_REMAP_BLOCKING_SYNCHRONOUS_METHOD(getHasRegisteredLoad, NSDictionary*, getLoad) {
    return [wrapper getHasRegisteredLoad];
}

RCT_REMAP_METHOD(setHasRegisteredLoad, setLoad) {
    [wrapper setHasRegisteredLoad];
}

RCT_REMAP_METHOD(unlockOrientation, unlock) {
    [wrapper unlockOrientation];
}

RCT_REMAP_METHOD(lockPortrait, portrait) {
    [wrapper lockOrientation];
}

RCT_EXPORT_METHOD(getDeliveredNotifications:(RCTPromiseResolveBlock)resolve
                  withRejecter:(RCTPromiseRejectBlock)reject) {
    [self getNotifications:resolve];
}

RCT_REMAP_METHOD(removeChannelNotifications, serverUrl:(NSString *)serverUrl
                  channeId:(NSString *)channelId) {
    [self removeChannelNotifications:serverUrl channelId:channelId];
}

RCT_REMAP_METHOD(removeThreadNotifications, server:(NSString *)serverUrl
                  threadId:(NSString *)threadId) {
    [self removeThreadNotifications:serverUrl threadId:threadId];
}

RCT_REMAP_METHOD(removeServerNotifications, serverUrl:(NSString *)serverUrl) {
    [self removeServerNotifications:serverUrl];
}

RCT_EXPORT_METHOD(getRealFilePath:(NSString *)filePath
                  withResolver:(RCTPromiseResolveBlock)resolve
                  withRejecter:(RCTPromiseRejectBlock)reject) {
    [self getRealFilePath:filePath resolve:resolve reject:reject];
}

RCT_EXPORT_METHOD(saveFile:(NSString *)filePath
                  withResolver:(RCTPromiseResolveBlock)resolve
                  withRejecter:(RCTPromiseRejectBlock)reject) {
    [self saveFile:filePath resolve:resolve reject:reject];
}

RCT_REMAP_METHOD(setSoftKeyboardToAdjustResize, setAdjustResize) {
    [self setSoftKeyboardToAdjustResize];
}

RCT_REMAP_METHOD(setSoftKeyboardToAdjustNothing, setAdjustNothing) {
    [self setSoftKeyboardToAdjustNothing];
}

RCT_EXPORT_METHOD(createZipFile:(NSArray<NSString *> *)paths
                  withResolver:(RCTPromiseResolveBlock)resolve
                  withRejecter:(RCTPromiseRejectBlock)reject) {
    [self createZipFile:paths resolve:resolve reject:reject];
}

// Don't compile this code when we build for the old architecture.
#ifdef RCT_NEW_ARCH_ENABLED
- (std::shared_ptr<TurboModule>)getTurboModule:
    (const ObjCTurboModule::InitParams &)params
{
    return std::make_shared<NativeRNUtilsSpecJSI>(params);
}

- (ModuleConstants<Constants::Builder>)getConstants {
    NSDictionary *appGroup = [wrapper appGroupSharedDirectory];
    NSString *sharedDirectory = appGroup[@"sharedDirectory"];
    NSString *databasePath = appGroup[@"databasePath"];
    NSString *appGroupIdentifier = [wrapper getAppGroupId];
    
    ConstantsAppGroupSharedDirectory::Builder::Input sharedDirectoryInput = {
          sharedDirectory,
          databasePath
        };
    
    ConstantsAppGroupSharedDirectory::Builder sharedDirectoryBuilder(sharedDirectoryInput);
    Constants::Builder::Input constantsInput = {
          appGroupIdentifier,
          sharedDirectoryBuilder
        };
    
    Constants::Builder constantsBuilder(constantsInput);

    return [_RCTTypedModuleConstants newWithUnsafeDictionary:constantsBuilder.buildUnsafeRawValue()];
}
#endif

- (NSDictionary *)deleteDatabaseDirectory:(NSString *)databaseName shouldRemoveDirectory:(BOOL)shouldRemoveDirectory {
    return [wrapper deleteDatabaseDirectoryWithDatabaseName:databaseName shouldRemoveDirectory:shouldRemoveDirectory];
}

- (NSDictionary *)renameDatabase:(NSString *)databaseName newDatabaseName:(NSString *)newDatabaseName {
    return [wrapper renameDatabaseWithDatabaseName:databaseName newDatabaseName:newDatabaseName];
}

- (NSNumber *)deleteEntitiesFile {
    return [wrapper deleteEntitiesFile];
}

- (NSDictionary *)isRunningInSplitView {
    return [wrapper isRunningInSplitView];
}

- (NSDictionary *)getWindowDimensions {
    return [wrapper getWindowDimensions];
}

- (NSDictionary *)getHasRegisteredLoad {
    return [wrapper getHasRegisteredLoad];
}

- (void)setHasRegisteredLoad {
    [wrapper setHasRegisteredLoad];
}

- (void)lockPortrait {
    [wrapper lockOrientation];
}

- (void)unlockOrientation {
    [wrapper unlockOrientation];
}


- (void)getDeliveredNotifications:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject {
    [self getNotifications:resolve];
}


- (void)removeChannelNotifications:(NSString *)serverUrl channelId:(NSString *)channelId {
    [[NotificationManager shared] removeChannelNotificationsWithServerUrl:serverUrl channelId:channelId];
}

- (void)removeThreadNotifications:(NSString *)serverUrl threadId:(NSString *)threadId {
    [[NotificationManager shared] removeThreadNotificationsWithServerUrl:serverUrl threadId:threadId];
}

- (void)removeServerNotifications:(NSString *)serverUrl {
    [[NotificationManager shared] removeServerNotificationsWithServerUrl:serverUrl];
}

- (void)getRealFilePath:(NSString *)filePath resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject {
    resolve(@"");
}

- (void)saveFile:(NSString *)filePath resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject {
    resolve(@"");
}

- (void)createZipFile:(NSArray<NSString *> *)paths resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject {
    NSDictionary *result = [wrapper createZipFileWithSourcePaths:paths];
    
    if ([[result objectForKey:@"success"] boolValue]) {
        resolve([result objectForKey:@"zipFilePath"]);
    } else {
        reject(@"create_zip_error", [result objectForKey:@"error"], nil);
    }
}

-(void)setSoftKeyboardToAdjustResize {
    // Do nothing as it does not apply to iOS
}

-(void)setSoftKeyboardToAdjustNothing {
    // Do nothing as it does not apply to iOS
}

#pragma helpers
-(void)getNotifications:(RCTPromiseResolveBlock)resolve {
    [[NotificationManager shared] getDeliveredNotificationsWithCompletionHandler:^(NSArray<NSDictionary *> * _Nonnull notifications) {
        resolve(notifications);
    }];
}


@end
