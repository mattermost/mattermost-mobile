import UIKit
import Social
import MobileCoreServices
import UploadAttachments

extension Bundle {
  var displayName: String? {
    return object(forInfoDictionaryKey: "CFBundleDisplayName") as? String
  }
}

class ShareViewController: SLComposeServiceViewController {
  
  private var dispatchGroup = DispatchGroup()
  private var attachments = AttachmentArray<AttachmentItem>()
  private var store = StoreManager.shared() as StoreManager
  private var entities: [AnyHashable:Any]? = nil
  private var sessionToken: String?
  private var serverURL: String?
  private var message: String?
  private var publicURL: String?
  
  fileprivate var selectedChannel: Item?
  fileprivate var selectedTeam: Item?

  // MARK: - Lifecycle methods
  override func viewDidLoad() {
    super.viewDidLoad()

    title = Bundle.main.displayName
    placeholder = "Write a message..."
    entities = store.getEntities(true) as [AnyHashable:Any]?
    sessionToken = store.getToken()
    serverURL = store.getServerUrl()

    extractDataFromContext()
    
    if sessionToken == nil {
      showErrorMessage(title: "", message: "Authentication required: Please first login using the app.", VC: self)
    }
  }
  
  override func isContentValid() -> Bool {
    // Do validation of contentText and/or NSExtensionContext attachments here
    if (attachments.count > 0) {
      let maxFileSize = store.getMaxFileSize()
      if attachments.hasAttachementLargerThan(fileSize: maxFileSize) {
        let readableMaxSize = formatFileSize(bytes: Double(maxFileSize))
        showErrorMessage(title: "", message: "File attachments shared in Mattermost must be less than \(readableMaxSize).", VC: self)
      }
    }

    return serverURL != nil &&
      sessionToken != nil &&
      attachmentsCount() == attachments.count &&
      selectedTeam != nil &&
      selectedChannel != nil
  }
  
  override func didSelectCancel() {
    UploadSessionManager.shared.clearTempDirectory()
    super.didSelectCancel()
  }
  
  override func didSelectPost() {
    // This is called after the user selects Post. Do the upload of contentText and/or NSExtensionContext attachments.
    if publicURL != nil {
      self.message = "\(contentText!)\n\n\(publicURL!)"
    } else {
      self.message = contentText
    }

    UploadManager.shared.uploadFiles(baseURL: serverURL!, token: sessionToken!, channelId: selectedChannel!.id!, message: message, attachments: attachments, callback: {
      // Inform the host that we're done, so it un-blocks its UI. Note: Alternatively you could call super's -didSelectPost, which will similarly complete the extension context.
      self.extensionContext!.completeRequest(returningItems: [], completionHandler: nil)
    })
  }
  
  override func loadPreviewView() -> UIView! {
    if attachments.findBy(type: kUTTypeFileURL as String) {
      let genericView = GenericView()
      genericView.contentMode = .scaleAspectFit
      genericView.clipsToBounds = true
      genericView.isUserInteractionEnabled = false
      genericView.addConstraints([
        NSLayoutConstraint(item: genericView, attribute: .width, relatedBy: .equal, toItem: nil, attribute: .width, multiplier: 1.0, constant: 70),
        NSLayoutConstraint(item: genericView, attribute: .height, relatedBy: .equal, toItem: nil, attribute: .height, multiplier: 1.0, constant: 70)
        ])
      
      if attachments.count > 1 {
        genericView.mainLabel.text = "\(attachments.count) Items"
      }
      
      return genericView
    }
    return super.loadPreviewView();
  }
  
  override func configurationItems() -> [Any]! {
    var items: [SLComposeSheetConfigurationItem] = []
  
    // To add configuration options via table cells at the bottom of the sheet, return an array of SLComposeSheetConfigurationItem here.
    let teamDecks = getTeamItems()
    if let teams = SLComposeSheetConfigurationItem() {
      teams.title = "Team"
      teams.value = selectedTeam?.title
      teams.tapHandler = {
        let vc = TeamsViewController()
        vc.teamDecks = teamDecks
        vc.delegate = self
        self.pushConfigurationViewController(vc)
      }
      items.append(teams)
    }

    let channelDecks = getChannelItems(forTeamId: selectedTeam?.id)
    if let channels = SLComposeSheetConfigurationItem() {
      channels.title = "Channels"
      channels.value = selectedChannel?.title
      channels.valuePending = channelDecks == nil
      channels.tapHandler = {
        let vc = ChannelsViewController()
        vc.channelDecks = channelDecks!
        vc.delegate = self
        self.pushConfigurationViewController(vc)
      }
      
      items.append(channels)
    }
    
    validateContent()
    return items
  }
  
  // MARK: - Extension Builder
  
  func attachmentsCount() -> Int {
    var count = 0
    for item in extensionContext?.inputItems as! [NSExtensionItem] {
      guard let attachments = item.attachments else {return 0}
      for itemProvider in attachments {
        if itemProvider.hasItemConformingToTypeIdentifier(kUTTypeMovie as String) ||
          itemProvider.hasItemConformingToTypeIdentifier(kUTTypeImage as String) ||
          itemProvider.hasItemConformingToTypeIdentifier(kUTTypeFileURL as String) {
          count = count + 1
        }
      }
    }
    
    return count
  }
  
  func buildChannelSection(channels: NSArray, currentChannelId: String, key: String, title:String) -> Section {
    let section = Section()
    section.title = title
    for channel in channels as! [NSDictionary] {
      let item = Item()
      let id = channel.object(forKey: "id") as? String
      item.id = id
      item.title = channel.object(forKey: "display_name") as? String
      if id == currentChannelId {
        item.selected = true
        selectedChannel = item
      }
      section.items.append(item)
    }
    return section
  }
  
  func extractDataFromContext() {
    for item in extensionContext?.inputItems as! [NSExtensionItem] {
      guard let attachments = item.attachments else {continue}
      for itemProvider in attachments {
        if itemProvider.hasItemConformingToTypeIdentifier(kUTTypeMovie as String) {
          dispatchGroup.enter()
          itemProvider.loadItem(forTypeIdentifier: kUTTypeMovie as String, options: nil, completionHandler: ({item, error in
            if error == nil {
              let attachment = self.saveAttachment(url: item as! URL)
              if (attachment != nil) {
                attachment?.type = kUTTypeMovie as String
                self.attachments.append(attachment!)
              }
            }
            self.dispatchGroup.leave()
          }))
        } else if itemProvider.hasItemConformingToTypeIdentifier(kUTTypeImage as String) {
          dispatchGroup.enter()
          itemProvider.loadItem(forTypeIdentifier: kUTTypeImage as String, options: nil, completionHandler: ({item, error in
            if error == nil {
              let attachment = self.saveAttachment(url: item as! URL)
              if (attachment != nil) {
                attachment?.type = kUTTypeImage as String
                self.attachments.append(attachment!)
              }
            }
            self.dispatchGroup.leave()
          }))
        } else if itemProvider.hasItemConformingToTypeIdentifier(kUTTypeFileURL as String) {
          dispatchGroup.enter()
          itemProvider.loadItem(forTypeIdentifier: kUTTypeFileURL as String, options: nil, completionHandler: ({item, error in
            if error == nil {
              let attachment = self.saveAttachment(url: item as! URL)
              if (attachment != nil) {
                attachment?.type = kUTTypeFileURL as String
                self.attachments.append(attachment!)
              }
            }
            self.dispatchGroup.leave()
          }))
        } else if itemProvider.hasItemConformingToTypeIdentifier(kUTTypeURL as String) {
          itemProvider.loadItem(forTypeIdentifier: kUTTypeURL as String, options: nil, completionHandler: ({item, error in
            if let url = item as? URL {
              self.publicURL = url.absoluteString
            }
          }))
        }
      }
    }
    dispatchGroup.notify(queue: DispatchQueue.main) {
      self.validateContent()
    }
  }
  
  func getChannelsFromServerAndReload(forTeamId: String) {
    var currentChannel = store.getCurrentChannel() as NSDictionary?
    if currentChannel?.object(forKey: "team_id") as! String != forTeamId {
      currentChannel = store.getDefaultChannel(forTeamId) as NSDictionary?
    }
    
    // If currentChannel is nil it means we don't have the channels for this team
    if (currentChannel == nil) {
      let urlString = "\(serverURL!)/api/v4/users/me/teams/\(forTeamId)/channels"
      let url = URL(string: urlString)
      var request = URLRequest(url: url!)
      let auth = "Bearer \(sessionToken!)" as String
      request.setValue(auth, forHTTPHeaderField: "Authorization")
      
      let task = URLSession.shared.dataTask(with: request) { (data, response, error) in
        guard let dataResponse = data,
          error == nil else {
            print(error?.localizedDescription ?? "Response Error")
            return
            
        }
        
        do{
          //here dataResponse received from a network request
          let jsonArray = try JSONSerialization.jsonObject(with: dataResponse, options: []) as! NSArray
          let channels = jsonArray.filter {element in
            let channel = element as! NSDictionary
            let type = channel.object(forKey: "type") as! String
            return type == "O" || type == "P"
          }
          let ent = self.store.getEntities(false)! as NSDictionary
          let mutableEntities = ent.mutableCopy() as! NSMutableDictionary
          let entitiesChannels = NSDictionary(dictionary: mutableEntities.object(forKey: "channels") as! NSMutableDictionary)
            .object(forKey: "channels") as! NSMutableDictionary
          
          for item in channels {
            let channel = item as! NSDictionary
            entitiesChannels.setValue(channel, forKey: channel.object(forKey: "id") as! String)
          }
          
          if let entitiesData: NSData = try? JSONSerialization.data(withJSONObject: ent, options: JSONSerialization.WritingOptions.prettyPrinted) as NSData {
            let jsonString = String(data: entitiesData as Data, encoding: String.Encoding.utf8)! as String
            self.store.updateEntities(jsonString)
            self.store.getEntities(true)
            self.reloadConfigurationItems()
            self.view.setNeedsDisplay()
          }
        } catch let parsingError {
          print("Error", parsingError)
        }
      }
      task.resume()
    }
  }
  
  func getChannelItems(forTeamId: String?) -> [Section]? {
    var channelDecks = [Section]()
    var currentChannel = store.getCurrentChannel() as NSDictionary?
    if currentChannel?.object(forKey: "team_id") as? String != forTeamId {
      currentChannel = store.getDefaultChannel(forTeamId) as NSDictionary?
    }
    
    if currentChannel == nil {
      return nil
    }
    
    let channelsInTeamBySections = store.getChannelsBySections(forTeamId) as NSDictionary
    channelDecks.append(buildChannelSection(
      channels: channelsInTeamBySections.object(forKey: "public") as! NSArray,
      currentChannelId: selectedChannel?.id ?? currentChannel?.object(forKey: "id") as! String,
      key: "public",
      title: "Public Channels"
    ))
    
    channelDecks.append(buildChannelSection(
      channels: channelsInTeamBySections.object(forKey: "private") as! NSArray,
      currentChannelId: selectedChannel?.id ?? currentChannel?.object(forKey: "id") as! String,
      key: "private",
      title: "Private Channels"
    ))
    
    channelDecks.append(buildChannelSection(
      channels: channelsInTeamBySections.object(forKey: "direct") as! NSArray,
      currentChannelId: selectedChannel?.id ?? currentChannel?.object(forKey: "id") as! String,
      key: "direct",
      title: "Direct Channels"
    ))
    
    return channelDecks
  }
  
  func getTeamItems() -> [Item] {
    var teamDecks = [Item]()
    let currentTeamId = store.getCurrentTeamId()
    let teams = store.getMyTeams() as NSArray?

    for case let team as NSDictionary in teams! {
      let item = Item()
      item.title = team.object(forKey: "display_name") as! String?
      item.id = team.object(forKey: "id") as! String?
      item.selected = false
      if (item.id == (selectedTeam?.id ?? currentTeamId)) {
        item.selected = true
        selectedTeam = item
      }
      teamDecks.append(item)
    }
    
    return teamDecks
  }

  func saveAttachment(url: URL) -> AttachmentItem? {
    let tempURL: URL? = UploadSessionManager.shared.tempContainerURL() as URL?
    let fileMgr = FileManager.default
    let fileName = url.lastPathComponent
    let tempFileURL = tempURL?.appendingPathComponent(fileName)

    do {
      try? FileManager.default.removeItem(at: tempFileURL!)
      try fileMgr.copyItem(at: url, to: tempFileURL!)
      let attr = try fileMgr.attributesOfItem(atPath: (tempFileURL?.path)!) as NSDictionary

      let attachment = AttachmentItem()
      attachment.fileName = fileName
      attachment.fileURL = tempFileURL
      attachment.fileSize = attr.fileSize()
      return attachment
    } catch {
      return nil
    }
  }
  
  // MARK: - Utiilities
  
  func showErrorMessage(title: String, message: String, VC: UIViewController) {
    let alert: UIAlertController = UIAlertController(title: title, message: message, preferredStyle: UIAlertController.Style.alert)
    let okAction = UIAlertAction(title: "OK", style: UIAlertAction.Style.default) {
      UIAlertAction in
      self.cancel()
    }
    alert.addAction(okAction)
    VC.present(alert, animated: true, completion: nil)
  }

  func formatFileSize(bytes: Double) -> String {
    guard bytes > 0 else {
      return "0 bytes"
    }

    // Adapted from http://stackoverflow.com/a/18650828
    let suffixes = ["bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"]
    let k: Double = 1024
    let i = floor(log(bytes) / log(k))

    // Format number with thousands separator and everything below 1 GB with no decimal places.
    let numberFormatter = NumberFormatter()
    numberFormatter.maximumFractionDigits = i < 3 ? 0 : 1
    numberFormatter.numberStyle = .decimal

    let numberString = numberFormatter.string(from: NSNumber(value: bytes / pow(k, i))) ?? "Unknown"
    let suffix = suffixes[Int(i)]
    return "\(numberString) \(suffix)"
  }
}

extension ShareViewController: TeamsViewControllerDelegate {
  func selectedTeam(deck: Item) {
    selectedTeam = deck
    selectedChannel = nil
    self.getChannelsFromServerAndReload(forTeamId: deck.id!)
    reloadConfigurationItems()
    popConfigurationViewController()
  }
}

extension ShareViewController: ChannelsViewControllerDelegate {
  func selectedChannel(deck: Item) {
    selectedChannel = deck
    reloadConfigurationItems()
    popConfigurationViewController()
  }
}
