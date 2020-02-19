import UIKit

class ChannelsViewController: UIViewController {
  
  private var store = StoreManager.shared() as StoreManager
  private var serverURL: String?
  private var sessionToken: String?

  let searchController = UISearchController(searchResultsController: nil)
  
  lazy var tableView: UITableView = {
    let tableView = UITableView(frame: self.view.frame)
    tableView.autoresizingMask = [.flexibleWidth, .flexibleHeight]
    tableView.dataSource = self
    tableView.delegate = self
    tableView.backgroundColor = .clear
    tableView.register(UITableViewCell.self, forCellReuseIdentifier: Identifiers.ChannelCell)
    
    return tableView
  }()
  
  var navbarTitle: String? = "Channels"
  var channelDecks = [Section]()
  var filteredDecks: [Section]?
  weak var delegate: ChannelsViewControllerDelegate?
  
  var footerFrame = UIView()
  var footerLabel = UILabel()
  var indicator = UIActivityIndicatorView()
  var dispatchGroup = DispatchGroup()

  override func viewWillAppear(_ animated: Bool) {
    super.viewWillAppear(animated)
    if #available(iOS 11.0, *) {
      navigationItem.hidesSearchBarWhenScrolling = false
    }

    showActivityIndicator()
    dispatchGroup.enter()
    delegate?.loadedChannels()
    
    dispatchGroup.notify(queue: .main) {
      self.filteredDecks = self.channelDecks
      self.hideActivityIndicator()
    }
  }

  override func viewDidAppear(_ animated: Bool) {
    super.viewDidAppear(animated)
    if #available(iOS 11.0, *) {
      navigationItem.hidesSearchBarWhenScrolling = true
    }
  }
  
  override func viewDidLoad() {
    super.viewDidLoad()
    
    filteredDecks = channelDecks
    title = navbarTitle
    configureSearchBar()
    view.addSubview(tableView)
  }

  func showActivityIndicator() {
    footerFrame = UIView(frame: CGRect(x: 0, y: view.frame.midY - 25, width: 250, height: 50))
    footerFrame.center.x = view.center.x

    footerLabel = UILabel(frame: CGRect(x: 0, y: 0, width: 200, height: 50))
    footerLabel.textColor = UIColor.systemGray
    footerLabel.text = "Searching for Channels..."
    
    indicator.frame = CGRect(x: 200, y: 0, width: 50, height: 50)
    indicator.startAnimating()

    footerFrame.addSubview(footerLabel)
    footerFrame.addSubview(indicator)
    
    tableView.tableFooterView = footerFrame
  }
  
  func hideActivityIndicator() {
    tableView.tableFooterView = nil
    self.tableView.reloadData()
  }
  
  func leaveDispatchGroup() {
    dispatchGroup.leave()
  }
 
  func configureSearchBar() {
    searchController.searchResultsUpdater = self
    searchController.hidesNavigationBarDuringPresentation = false
    searchController.dimsBackgroundDuringPresentation = false
    searchController.searchBar.searchBarStyle = .minimal
    searchController.searchBar.autocapitalizationType = .none
    searchController.searchBar.delegate = self

    self.definesPresentationContext = true
    
    if #available(iOS 11.0, *) {
      // For iOS 11 and later, place the search bar in the navigation bar.
      
      // Give space at the top so provide a better look and feel
      let offset = UIOffset(horizontal: 0.0, vertical: 6.0)
      searchController.searchBar.searchFieldBackgroundPositionAdjustment = offset
      
      
      navigationItem.searchController = searchController
    } else {
      // For iOS 10 and earlier, place the search controller's search bar in the table view's header.
      tableView.tableHeaderView = searchController.searchBar
    }
  }
  
}

private extension ChannelsViewController {
  struct Identifiers {
    static let ChannelCell = "channelCell"
  }
}

extension ChannelsViewController: UITableViewDataSource {
  func numberOfSections(in tableView: UITableView) -> Int {
    var empty = true
    for sec in filteredDecks! {
      if sec.items.count > 0 {
        empty = false
        break
      }
    }
    
    if (empty) {
      let noDataLabel: UILabel  = UILabel(frame: CGRect(x: 0, y: 0, width: tableView.bounds.size.width, height: tableView.bounds.size.height))
      noDataLabel.text          = "No Results Found"
      noDataLabel.textColor     = UIColor.systemGray
      noDataLabel.textAlignment = .center
      tableView.backgroundView  = noDataLabel
      tableView.separatorStyle  = .none
      return 0
    }
    tableView.separatorStyle = .singleLine
    tableView.backgroundView = nil
    return filteredDecks?.count ?? 0
  }

  func tableView(_ tableView: UITableView, titleForHeaderInSection section: Int) -> String? {
    let sec = filteredDecks?[section]
    if (sec?.items.count)! > 0 {
      return sec?.title
    }
    
    return nil
  }
  
  func tableView(_ tableView: UITableView, numberOfRowsInSection section: Int) -> Int {
    return filteredDecks?[section].items.count ?? 0
  }
  
  func tableView(_ tableView: UITableView, cellForRowAt indexPath: IndexPath) -> UITableViewCell {
    let section = filteredDecks?[indexPath.section]
    let cell = tableView.dequeueReusableCell(withIdentifier: Identifiers.ChannelCell, for: indexPath)
    let item = section?.items[indexPath.row]
    cell.textLabel?.text = item?.title
    if item?.selected ?? false {
      cell.accessoryType = .checkmark
    } else {
      cell.accessoryType = .none
    }
    cell.backgroundColor = .clear
    return cell
  }
}

protocol ChannelsViewControllerDelegate: class {
  func selectedChannel(deck: Item)
  func loadedChannels()
  func searchOnTyping(term: String)
}

extension ChannelsViewController: UITableViewDelegate {
  func tableView(_ tableView: UITableView, didSelectRowAt indexPath: IndexPath) {
    let section = filteredDecks?[indexPath.section]
    if (section?.items != nil) {
      delegate?.selectedChannel(deck: (section?.items[indexPath.row])!)
    }
  }
}

extension ChannelsViewController: UISearchResultsUpdating {
  func updateSearchResults(for searchController: UISearchController) {
    if let searchText = searchController.searchBar.text, !searchText.isEmpty {
      showActivityIndicator()
      dispatchGroup.enter()
      delegate?.searchOnTyping(term: searchText)
      
      dispatchGroup.notify(queue: .main) {
        self.filteredDecks = self.channelDecks.map {section in
          let s = section.copy() as! Section
          let items = section.items.filter{($0.title?.lowercased().contains(searchText.lowercased()))!}
          s.items = items
          return s
        }
        self.hideActivityIndicator()
      }
    } else {
      filteredDecks = channelDecks
    }
    
    tableView.reloadData()
  }
}

extension ChannelsViewController: UISearchBarDelegate {
  func searchBarCancelButtonClicked(_ searchBar: UISearchBar) {
    searchBar.showsCancelButton = false
    searchBar.text = ""
    searchBar.resignFirstResponder()
    tableView.reloadData()
  }
  
  func searchBarTextDidBeginEditing(_ searchBar: UISearchBar) {
    searchBar.showsCancelButton = true
    
    // Center the Cancel Button
    if #available(iOS 11.0, *) {
      searchBar.cancelButton?.titleEdgeInsets = UIEdgeInsets(top: 12.0, left: 0, bottom: 0, right: 0)
    }
  }
}

// get the cancel button of the Search Bar
extension UISearchBar {
  var cancelButton : UIButton? {
    let topView: UIView = self.subviews[0] as UIView
    
    if let pvtClass = NSClassFromString("UINavigationButton") {
      for v in topView.subviews {
        if v.isKind(of: pvtClass) {
          return v as? UIButton
        }
      }
    }
    
    return nil
  }
}
