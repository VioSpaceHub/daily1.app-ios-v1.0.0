import UIKit
import WebKit
import FirebaseMessaging
import UserNotifications

var webView: WKWebView! = nil

class ViewController: UIViewController, WKNavigationDelegate, UIDocumentInteractionControllerDelegate {
    
    var documentController: UIDocumentInteractionController?
    func documentInteractionControllerViewControllerForPreview(_ controller: UIDocumentInteractionController) -> UIViewController {
        return self
    }
    
    @IBOutlet weak var loadingView: UIView!
    @IBOutlet weak var progressView: UIProgressView!
    @IBOutlet weak var connectionProblemView: UIImageView!
    @IBOutlet weak var webviewView: UIView!
    var toolbarView: UIToolbar!
    
    var htmlIsLoaded = false;
    
    private var themeObservation: NSKeyValueObservation?
    var currentWebViewTheme: UIUserInterfaceStyle = .unspecified
    override var preferredStatusBarStyle : UIStatusBarStyle {
        if #available(iOS 13, *), overrideStatusBar{
            if #available(iOS 15, *) {
                return .default
            } else {
                return statusBarTheme == "dark" ? .lightContent : .darkContent
            }
        }
        return .default
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        initWebView()
        initToolbarView()
        loadRootUrl()
    
        NotificationCenter.default.addObserver(self, selector: #selector(self.keyboardWillHide(_:)), name: UIResponder.keyboardWillHideNotification , object: nil)
        
        // Listen for FCM token updates
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(didReceiveFCMToken(_:)),
            name: Notification.Name("FCMToken"),
            object: nil
        )
    }

    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        Daily1.webView.frame = calcWebviewFrame(webviewView: webviewView, toolbarView: nil)
    }
    
    @objc func keyboardWillHide(_ notification: NSNotification) {
        Daily1.webView.setNeedsLayout()
    }
    
    func initWebView() {
        Daily1.webView = createWebView(container: webviewView, WKSMH: self, WKND: self, NSO: self, VC: self)
        webviewView.addSubview(Daily1.webView);
        
        Daily1.webView.uiDelegate = self;
        
        Daily1.webView.addObserver(self, forKeyPath: #keyPath(WKWebView.estimatedProgress), options: .new, context: nil)

        if pullToRefresh {
            #if !targetEnvironment(macCatalyst)
            let refreshControl = UIRefreshControl()
            refreshControl.addTarget(self, action: #selector(refreshWebView(_:)), for: .valueChanged)
            Daily1.webView.scrollView.addSubview(refreshControl)
            Daily1.webView.scrollView.bounces = true
            #endif
        }

        if #available(iOS 15.0, *), adaptiveUIStyle {
            themeObservation = Daily1.webView.observe(\.underPageBackgroundColor) { [unowned self] webView, _ in
                currentWebViewTheme = Daily1.webView.underPageBackgroundColor.isLight() ?? true ? .light : .dark
                self.overrideUIStyle()
            }
        }
    }

    @objc func refreshWebView(_ sender: UIRefreshControl) {
        Daily1.webView?.reload()
        sender.endRefreshing()
    }

    func createToolbarView() -> UIToolbar{
        let winScene = UIApplication.shared.connectedScenes.first
        let windowScene = winScene as! UIWindowScene
        var statusBarHeight = windowScene.statusBarManager?.statusBarFrame.height ?? 60
        
        #if targetEnvironment(macCatalyst)
        if (statusBarHeight == 0){
            statusBarHeight = 30
        }
        #endif
        
        let toolbarView = UIToolbar(frame: CGRect(x: 0, y: 0, width: webviewView.frame.width, height: 0))
        toolbarView.sizeToFit()
        toolbarView.frame = CGRect(x: 0, y: 0, width: webviewView.frame.width, height: toolbarView.frame.height + statusBarHeight)
        
        let flex = UIBarButtonItem(barButtonSystemItem: .flexibleSpace, target: nil, action: nil)
        let close = UIBarButtonItem(barButtonSystemItem: .done, target: self, action: #selector(loadRootUrl))
        toolbarView.setItems([close,flex], animated: true)
        
        toolbarView.isHidden = true
        
        return toolbarView
    }
    
    func overrideUIStyle(toDefault: Bool = false) {
        if #available(iOS 15.0, *), adaptiveUIStyle {
            if (((htmlIsLoaded && !Daily1.webView.isHidden) || toDefault) && self.currentWebViewTheme != .unspecified) {
                UIApplication
                    .shared
                    .connectedScenes
                    .flatMap { ($0 as? UIWindowScene)?.windows ?? [] }
                    .first { $0.isKeyWindow }?.overrideUserInterfaceStyle = toDefault ? .unspecified : self.currentWebViewTheme;
            }
        }
    }
    
    func initToolbarView() {
        toolbarView =  createToolbarView()
        webviewView.addSubview(toolbarView)
    }
    
    @objc func loadRootUrl() {
        Daily1.webView.load(URLRequest(url: SceneDelegate.universalLinkToLaunch ?? SceneDelegate.shortcutLinkToLaunch ?? rootUrl))
    }
    
    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!){
        htmlIsLoaded = true
        
        self.setProgress(1.0, true)
        self.animateConnectionProblem(false)
        
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.8) {
            Daily1.webView.isHidden = false
            self.loadingView.isHidden = true
           
            self.setProgress(0.0, false)
            
            self.overrideUIStyle()
        }
    }
    
    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
        htmlIsLoaded = false;
        
        if (error as NSError)._code != (-999) {
            self.overrideUIStyle(toDefault: true);

            webView.isHidden = true;
            loadingView.isHidden = false;
            animateConnectionProblem(true);
            
            setProgress(0.05, true);

            DispatchQueue.main.asyncAfter(deadline: .now() + 3) {
                self.setProgress(0.1, true);
                DispatchQueue.main.asyncAfter(deadline: .now() + 3) {
                    self.loadRootUrl();
                }
            }
        }
    }
    
    override func observeValue(forKeyPath keyPath: String?, of object: Any?, change: [NSKeyValueChangeKey : Any]?, context: UnsafeMutableRawPointer?) {

        if (keyPath == #keyPath(WKWebView.estimatedProgress) &&
                Daily1.webView.isLoading &&
                !self.loadingView.isHidden &&
                !self.htmlIsLoaded) {
                    var progress = Float(Daily1.webView.estimatedProgress);
                    
                    if (progress >= 0.8) { progress = 1.0; };
                    if (progress >= 0.3) { self.animateConnectionProblem(false); }
                    
                    self.setProgress(progress, true);
        }
    }
    
    func setProgress(_ progress: Float, _ animated: Bool) {
        self.progressView.setProgress(progress, animated: animated);
    }
    
    func animateConnectionProblem(_ show: Bool) {
        if (show) {
            self.connectionProblemView.isHidden = false;
            self.connectionProblemView.alpha = 0
            UIView.animate(withDuration: 0.7, delay: 0, options: [.repeat, .autoreverse], animations: {
                self.connectionProblemView.alpha = 1
            })
        }
        else {
            UIView.animate(withDuration: 0.3, delay: 0, options: [], animations: {
                self.connectionProblemView.alpha = 0
            }, completion: { _ in
                self.connectionProblemView.isHidden = true;
                self.connectionProblemView.layer.removeAllAnimations();
            })
        }
    }
        
    deinit {
        Daily1.webView.removeObserver(self, forKeyPath: #keyPath(WKWebView.estimatedProgress))
        NotificationCenter.default.removeObserver(self)
    }
}

// MARK: - Push Notification Message Handlers
extension ViewController: WKScriptMessageHandler {
    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        if message.name == "print" {
            printView(webView: Daily1.webView)
        }
        if message.name == "push-subscribe" {
            handlePushPermission()
        }
        if message.name == "push-permission-request" {
            handlePushPermission()
        }
        if message.name == "push-permission-state" {
            handlePushState()
        }
        if message.name == "push-token" {
            handleFCMToken()
        }
    }
    
    @objc func didReceiveFCMToken(_ notification: Notification) {
        if let token = notification.userInfo?["token"] as? String, !token.isEmpty {
            DispatchQueue.main.async {
                let script = "window.postMessage({type: 'fcm-token', token: '\(token)'}, '*');"
                Daily1.webView.evaluateJavaScript(script, completionHandler: nil)
                print("FCM Token sent via notification: \(token.prefix(20))...")
            }
        }
    }
    
    func handlePushPermission() {
        guard let appDelegate = UIApplication.shared.delegate as? AppDelegate else { return }
        
        appDelegate.requestNotificationPermission { granted in
            let script = "window.postMessage({type: 'push-permission-result', granted: \(granted)}, '*');"
            Daily1.webView.evaluateJavaScript(script, completionHandler: nil)
            
            if granted {
                self.handleFCMTokenWithRetry(retryCount: 0)
            }
        }
    }
    
    func handleFCMTokenWithRetry(retryCount: Int) {
        let maxRetries = 5
        
        Messaging.messaging().token { token, error in
            DispatchQueue.main.async {
                if let token = token {
                    let script = "window.postMessage({type: 'fcm-token', token: '\(token)'}, '*');"
                    Daily1.webView.evaluateJavaScript(script, completionHandler: nil)
                    print("FCM Token sent: \(token.prefix(20))...")
                } else {
                    print("FCM Token not ready, attempt \(retryCount + 1)/\(maxRetries)")
                    if retryCount < maxRetries {
                        DispatchQueue.main.asyncAfter(deadline: .now() + 2.0) {
                            self.handleFCMTokenWithRetry(retryCount: retryCount + 1)
                        }
                    } else {
                        let errorMsg = error?.localizedDescription ?? "Token unavailable"
                        let script = "window.postMessage({type: 'fcm-token', token: null, error: '\(errorMsg)'}, '*');"
                        Daily1.webView.evaluateJavaScript(script, completionHandler: nil)
                    }
                }
            }
        }
    }
    
    func handlePushState() {
        UNUserNotificationCenter.current().getNotificationSettings { settings in
            DispatchQueue.main.async {
                let state: String
                switch settings.authorizationStatus {
                case .authorized, .provisional, .ephemeral:
                    state = "granted"
                case .denied:
                    state = "denied"
                case .notDetermined:
                    state = "prompt"
                @unknown default:
                    state = "prompt"
                }
                let script = "window.postMessage({type: 'push-permission-state', state: '\(state)'}, '*');"
                Daily1.webView.evaluateJavaScript(script, completionHandler: nil)
            }
        }
    }
    
    func handleFCMToken() {
        handleFCMTokenWithRetry(retryCount: 0)
    }
}

extension UIColor {
    func isLight(threshold: Float = 0.5) -> Bool? {
        let originalCGColor = self.cgColor
        let RGBCGColor = originalCGColor.converted(to: CGColorSpaceCreateDeviceRGB(), intent: .defaultIntent, options: nil)
        guard let components = RGBCGColor?.components else { return nil }
        guard components.count >= 3 else { return nil }
        let brightness = Float(((components[0] * 299) + (components[1] * 587) + (components[2] * 114)) / 1000)
        return (brightness > threshold)
    }
}
