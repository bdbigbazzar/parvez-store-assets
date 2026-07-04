
  //<![CDATA[

  // ============================================================
  // ✅ গ্লোবাল AUTH স্টেট
  // ============================================================
  let currentUser     = null;
  let currentUserRole = null;
  // ✅ NEW (feature-64): নিরাপদ JSON.parse — localStorage-এর কোনো ভ্যালু করাপ্ট/খালি স্ট্রিং হলেও
  // পুরো স্ক্রিপ্ট থেমে যাওয়া (SyntaxError: Unexpected end of input) ঠেকাতে সব localStorage
  // JSON.parse কল এই হেল্পার দিয়ে wrap করা হলো — এটাই সাইট splash-এ আটকে থাকার মূল কারণ ছিল।
  function safeJSONParse(str, fallback) {
    try {
      if (str === null || str === undefined || str === '') return fallback;
      return JSON.parse(str);
    } catch (e) {
      return fallback;
    }
  }
  // ✅ [FIX #2] ADMIN_EMAILS — Object.freeze() দিয়ে console থেকে modify করা ঠেকানো হয়েছে
  // 📌 নোট: আপনার admin email এখানে বসান। Server-side enforce-এর জন্য Firestore Rules ব্যবহার করুন।
  const ADMIN_EMAILS  = Object.freeze(["bdbigbazzar@gmail.com"]);

  // ✅ পেমেন্ট কনফিগারেশন — আপনার নম্বর এখানে বসান
  // ============================================================
  // 🔴 [FIX #9] PAYMENT_CONFIG — নিচের dummy নম্বরগুলো আপনার আসল নম্বর দিয়ে বদলান
  // 📌 bKash: আপনার বিকাশ মার্চেন্ট/পার্সোনাল নম্বর
  // 📌 Nagad: আপনার নগদ মার্চেন্ট/পার্সোনাল নম্বর
  // 📌 Rocket: আপনার রকেট একাউন্ট নম্বর
  // ⚠️ এটি না বদলালে কাস্টমার ভুল নম্বরে টাকা পাঠাবে!
  // ============================================================
  const PAYMENT_CONFIG = {
    bkash:  { number: "01700000000", name: "বিকাশ",  color: "pink",   emoji: "🟣" }, // ← আপনার বিকাশ নম্বর দিন
    nagad:  { number: "01700000000", name: "নগদ",    color: "orange", emoji: "🟠" }, // ← আপনার নগদ নম্বর দিন
    rocket: { number: "01700000000", name: "রকেট",   color: "blue",   emoji: "🔵" }, // ← আপনার রকেট নম্বর দিন
    // ✅ QR কোড পেমেন্ট — bKash/Nagad QR ইমেজ লিংক এখানে বসান
    qr: {
      name: "QR কোড পেমেন্ট", color: "violet", emoji: "📱",
      imageUrl: "https://i.ibb.co/0jL5y6Q/sample-qr-placeholder.png" // আপনার নিজের QR কোড ইমেজ লিংক দিয়ে পরিবর্তন করুন
    },
    // ✅ EMI / কিস্তি সুবিধা — শুধুমাত্র এই থ্রেশহোল্ডের উপরে অর্ডারে দেখাবে
    emi: {
      minOrderAmount: 5000,
      providers: [
        { name: "bKash কিস্তি (পে লেটার)", tenor: "৩ মাস পর্যন্ত", interest: "ব্যাংক/bKash পলিসি অনুযায়ী" },
        { name: "City Bank EMI কার্ড",      tenor: "৩ / ৬ / ১২ মাস", interest: "ব্যাংক পলিসি অনুযায়ী" },
        { name: "IDLC Finance",             tenor: "৩ / ৬ / ১২ মাস", interest: "ব্যাংক পলিসি অনুযায়ী" }
      ]
    }
  };

  // ✅ ডেলিভারি কনফিগারেশন — ফরিদপুর থেকে হিসাব
  const DELIVERY_CONFIG = {
    originCity:     "ফরিদপুর",
    originDivision: "ঢাকা",
    // ঢাকার মধ্যে
    dhakaBase:      60,   // বেস চার্জ (৳)
    dhakaPerKg:     10,   // প্রতি কেজি অতিরিক্ত
    dhakaFreeOver:  2000, // এই টাকার বেশি অর্ডারে ফ্রি ডেলিভারি
    // সারাদেশ
    nationalBase:   120,  // বেস চার্জ (৳)
    nationalPerKg:  20,   // প্রতি কেজি অতিরিক্ত
    nationalFreeOver: 5000, // ফ্রি ডেলিভারির সীমা
    // বিভাগ অনুযায়ী অতিরিক্ত চার্জ
    divisionExtra: {
      "ঢাকা":       0,
      "চট্টগ্রাম":  20,
      "সিলেট":      30,
      "রাজশাহী":    20,
      "খুলনা":      20,
      "বরিশাল":     30,
      "ময়মনসিংহ":  10,
      "রংপুর":      40,
    }
  };

  // ============================================================
  // ✅ TOAST — সব জায়গায় ব্যবহারযোগ্য নোটিফিকেশন
  // ============================================================
  function showCartToast(message, type) {
    type = type || 'success';
    var old = document.getElementById('cart-toast-popup');
    if (old) old.remove();
    var colors = {
      success: { bg: '#16a34a', icon: '✅' },
      error:   { bg: '#dc2626', icon: '❌' },
      warning: { bg: '#d97706', icon: '⚠️' },
      info:    { bg: '#2563eb', icon: 'ℹ️' }
    };
    var c = colors[type] || colors.success;
    if (!document.getElementById('toast-style')) {
      var s = document.createElement('style');
      s.id = 'toast-style';
      s.textContent = '@keyframes fadeInUp{from{opacity:0;transform:translateX(-50%) translateY(16px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}';
      document.head.appendChild(s);
    }
    var toast = document.createElement('div');
    toast.id = 'cart-toast-popup';
    toast.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:' + c.bg + ';color:#fff;padding:10px 18px;border-radius:12px;box-shadow:0 4px 16px rgba(0,0,0,0.25);z-index:2147483646;font-size:13px;max-width:90vw;text-align:center;display:flex;align-items:center;gap:8px;animation:fadeInUp .25s ease;font-family:sans-serif;';
    toast.innerHTML = '<span>' + c.icon + '</span><span>' + message + '</span>';
    document.body.appendChild(toast);
    setTimeout(function() { if (toast.parentNode) toast.remove(); }, 3500);
  }

  // ============================================================
  // ✅ Google লগইন
  // ============================================================
  function signInWithGoogle() {
    auth.signInWithPopup(googleProvider)
      .then(function(result) {
        // ✅ Popup সফল — সাথে সাথে profile modal বন্ধ করো
        var profileModal = document.getElementById('profile-modal');
        if (profileModal) {
          profileModal.classList.add('hidden');
          document.body.style.overflow = 'auto';
        }
      })
      .catch(function(err) {
        if (err.code !== 'auth/popup-closed-by-user') {
          alert("লগইন ব্যর্থ হয়েছে: " + err.message);
        }
      });
  }

  // ============================================================
  // ✅ ইমেইল/পাসওয়ার্ড অথ — Sign in / Sign up ট্যাব টগল
  // ============================================================
  window._currentAuthTab = 'signin';

  function switchAuthTab(tab) {
    window._currentAuthTab = tab;
    const signinForm = document.getElementById('auth-signin-form');
    const signupForm = document.getElementById('auth-signup-form');
    const tabSignin   = document.getElementById('auth-tab-signin');
    const tabSignup   = document.getElementById('auth-tab-signup');
    if (!signinForm || !signupForm || !tabSignin || !tabSignup) return;
    if (tab === 'signup') {
      signinForm.classList.add('hidden');
      signupForm.classList.remove('hidden');
      tabSignin.classList.remove('active');
      tabSignup.classList.add('active');
    } else {
      signupForm.classList.add('hidden');
      signinForm.classList.remove('hidden');
      tabSignup.classList.remove('active');
      tabSignin.classList.add('active');
    }
    refreshAuthToggleText();
  }

  function refreshAuthToggleText() {
    const tab = window._currentAuthTab || 'signin';
    const q = document.getElementById('auth-toggle-question');
    const l = document.getElementById('auth-toggle-link-btn');
    if (!q || !l) return;
    if (tab === 'signin') {
      q.innerText = t('authNoAccountText');
      l.innerText = t('authSignupLink');
      l.setAttribute('onclick', "switchAuthTab('signup')");
    } else {
      q.innerText = t('authHaveAccountText');
      l.innerText = t('authSigninLink');
      l.setAttribute('onclick', "switchAuthTab('signin')");
    }
  }

  function toggleAuthPasswordVisibility(inputId, iconEl) {
    const input = document.getElementById(inputId);
    if (!input || !iconEl) return;
    if (input.type === 'password') {
      input.type = 'text';
      iconEl.classList.remove('fa-eye-slash');
      iconEl.classList.add('fa-eye');
    } else {
      input.type = 'password';
      iconEl.classList.remove('fa-eye');
      iconEl.classList.add('fa-eye-slash');
    }
  }

  // ✅ Firebase Auth এরর কোড → বাংলা/ইংরেজি বার্তা
  function getAuthErrorMessage(err) {
    const lang = document.documentElement.lang || 'bn';
    const map = {
      'auth/invalid-email':           lang === 'en' ? 'Invalid email address'                      : 'ইমেইল ঠিকানাটি সঠিক নয়',
      'auth/user-disabled':           lang === 'en' ? 'This account has been disabled'              : 'এই অ্যাকাউন্টটি নিষ্ক্রিয় করা হয়েছে',
      'auth/user-not-found':          lang === 'en' ? 'No account found with this email'            : 'এই ইমেইলে কোনো অ্যাকাউন্ট পাওয়া যায়নি',
      'auth/wrong-password':          lang === 'en' ? 'Incorrect password'                          : 'পাসওয়ার্ড সঠিক নয়',
      'auth/invalid-credential':      lang === 'en' ? 'Incorrect email or password'                 : 'ইমেইল অথবা পাসওয়ার্ড সঠিক নয়',
      'auth/email-already-in-use':    lang === 'en' ? 'An account already exists with this email'   : 'এই ইমেইল দিয়ে আগেই একটি অ্যাকাউন্ট আছে',
      'auth/weak-password':           lang === 'en' ? 'Password must be at least 6 characters'      : 'পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে',
      'auth/too-many-requests':       lang === 'en' ? 'Too many attempts. Please try again later'   : 'অনেকবার চেষ্টা করা হয়েছে। কিছুক্ষণ পর আবার চেষ্টা করুন',
      'auth/network-request-failed':  lang === 'en' ? 'Network error. Check your connection'        : 'নেটওয়ার্ক সমস্যা। ইন্টারনেট সংযোগ চেক করুন'
    };
    return map[err.code] || ((lang === 'en' ? 'Something went wrong: ' : 'কিছু একটা সমস্যা হয়েছে: ') + err.message);
  }

  // ============================================================
  // ✅ ইমেইল দিয়ে সাইন আপ
  // ============================================================
  function signUpWithEmail() {
    const lang    = document.documentElement.lang || 'bn';
    const name    = (document.getElementById('auth-signup-name')    || {}).value?.trim() || '';
    const email   = (document.getElementById('auth-signup-email')   || {}).value?.trim() || '';
    const pass    = (document.getElementById('auth-signup-password')|| {}).value || '';
    const confirm = (document.getElementById('auth-signup-confirm') || {}).value || '';

    if (!name)  { showCartToast(lang === 'en' ? 'Please enter your name'  : 'নাম লিখুন', 'warning'); return; }
    if (!email) { showCartToast(lang === 'en' ? 'Please enter your email' : 'ইমেইল লিখুন', 'warning'); return; }
    if (pass.length < 6) { showCartToast(lang === 'en' ? 'Password must be at least 6 characters' : 'পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে', 'warning'); return; }
    if (pass !== confirm) { showCartToast(lang === 'en' ? 'Passwords do not match' : 'পাসওয়ার্ড দুটো মিলছে না', 'warning'); return; }

    const btn = document.getElementById('auth-signup-submit-btn');
    if (btn) { btn.disabled = true; }

    auth.createUserWithEmailAndPassword(email, pass)
      .then(function(cred) {
        return cred.user.updateProfile({ displayName: name });
      })
      .then(function() {
        const profileModal = document.getElementById('profile-modal');
        if (profileModal) {
          profileModal.classList.add('hidden');
          document.body.style.overflow = 'auto';
        }
      })
      .catch(function(err) {
        showCartToast(getAuthErrorMessage(err), 'error');
      })
      .finally(function() {
        if (btn) { btn.disabled = false; }
      });
  }

  // ============================================================
  // ✅ ইমেইল দিয়ে সাইন ইন
  // ============================================================
  function signInWithEmail() {
    const lang     = document.documentElement.lang || 'bn';
    const email    = (document.getElementById('auth-signin-email')    || {}).value?.trim() || '';
    const pass     = (document.getElementById('auth-signin-password') || {}).value || '';
    const remember = (document.getElementById('auth-remember-me') || {}).checked || false;

    if (!email || !pass) {
      showCartToast(lang === 'en' ? 'Please enter email and password' : 'ইমেইল ও পাসওয়ার্ড লিখুন', 'warning');
      return;
    }

    const btn = document.getElementById('auth-signin-submit-btn');
    if (btn) { btn.disabled = true; }

    const persistence = remember ? firebase.auth.Auth.Persistence.LOCAL : firebase.auth.Auth.Persistence.SESSION;

    auth.setPersistence(persistence)
      .then(function() {
        return auth.signInWithEmailAndPassword(email, pass);
      })
      .then(function() {
        const profileModal = document.getElementById('profile-modal');
        if (profileModal) {
          profileModal.classList.add('hidden');
          document.body.style.overflow = 'auto';
        }
      })
      .catch(function(err) {
        showCartToast(getAuthErrorMessage(err), 'error');
      })
      .finally(function() {
        if (btn) { btn.disabled = false; }
      });
  }

  // ============================================================
  // ✅ পাসওয়ার্ড রিসেট (Forgot Password)
  // ============================================================
  function forgotPasswordFlow() {
    const lang  = document.documentElement.lang || 'bn';
    const email = (document.getElementById('auth-signin-email') || {}).value?.trim() || '';
    if (!email) {
      showCartToast(lang === 'en' ? 'Please enter your email first' : 'প্রথমে ইমেইল লিখুন', 'warning');
      return;
    }
    auth.sendPasswordResetEmail(email)
      .then(function() {
        showCartToast(lang === 'en' ? 'Password reset link sent to your email' : 'পাসওয়ার্ড রিসেট লিংক ইমেইলে পাঠানো হয়েছে', 'success');
      })
      .catch(function(err) {
        showCartToast(getAuthErrorMessage(err), 'error');
      });
  }

  function signOutUser() {
    auth.signOut().then(() => {
      currentUser = null;
      currentUserRole = null;
      closeProfile();
    });
  }

  // ============================================================
  // ✅ Auth State
  // ============================================================
  var _prevAuthUid = null; // Welcome toast একবারই দেখাতে

  // ✅ [FIX] auth undefined হলে (Firebase init ব্যর্থ হলে) গার্ড — নাহলে এখানে আরেকটা
  // uncaught error হয়ে বাকি script execution থেমে যেত (watchdog ইতিমধ্যে error দেখিয়ে দিয়েছে)
  if (typeof auth !== 'undefined' && auth) {
  auth.onAuthStateChanged(async (user) => {
    currentUser = user;
    if (user) {
      await loadUserRole(user);
      updateNavbarAfterLogin(user);

      // ✅ Welcome back toast — নতুন login হলেই দেখাও
      if (_prevAuthUid !== user.uid) {
        _prevAuthUid = user.uid;
        var firstName = (user.displayName || '').split(' ')[0] || 'বন্ধু';
        var lang = document.documentElement.lang || 'bn';
        var msg = lang === 'en'
          ? '👋 Welcome back, ' + firstName + '!'
          : '👋 স্বাগতম, ' + firstName + '!';
        setTimeout(function() { showCartToast(msg, 'success'); }, 600);
      }
      updateGoogleVerifyUI(user);
      if (ADMIN_EMAILS.includes(user.email) && !window._adminNotifListenerStarted) {
        window._adminNotifListenerStarted = true;
        initAdminNotificationListener();
      }
      // ✅ লগইনে unread chat badge চালু করো
      if (!window._chatBadgeListenerStarted) {
        window._chatBadgeListenerStarted = true;
        initChatUnreadListener(user.uid);
      }
      // ✅ পাবলিক প্রোফাইল সিঙ্ক — কমিউনিটি ফিচারের জন্য (নাম/ছবি/রোল)
      ensurePublicProfile(user).catch(e => console.error('Public profile sync error:', e));
      // ✅ ফ্রেন্ড রিকোয়েস্ট ব্যাজ লিসেনার
      if (!window._friendReqListenerStarted) {
        window._friendReqListenerStarted = true;
        initFriendRequestBadgeListener(user.uid);
      }
      // ✅ নিজের মোট ফ্রেন্ড সংখ্যা — প্রোফাইল প্যানেলে রিয়েল-টাইম দেখানোর জন্য
      if (!window._myFriendCountListenerStarted) {
        window._myFriendCountListenerStarted = true;
        initMyFriendCountListener(user.uid);
      }
      // ✅ নিজের মোট ফলোয়ার সংখ্যা — তেজ ফিড হেডারে রিয়েল-টাইম দেখানোর জন্য
      if (!window._myFollowerCountListenerStarted) {
        window._myFollowerCountListenerStarted = true;
        initMyFollowerCountListener(user.uid);
      }
      // ✅ [FIX] অডিও/ভিডিও কল — ইনকামিং কল লিসেনার চালু করো (আগে এটা কোথাও কল করা হতো না,
      // ফলে কেউ কখনো ইনকামিং কল নোটিফিকেশন পেতো না)
      if (!window._incomingCallListenerStarted) {
        window._incomingCallListenerStarted = true;
        initIncomingCallListener(user.uid);
      }
      // ✅ NEW: অর্ডার স্ট্যাটাস আপডেট নোটিফিকেশন লিসেনার চালু করো
      if (!window._orderStatusListenerStarted) {
        window._orderStatusListenerStarted = true;
        initCustomerOrderStatusListener(user.uid);
      }
      // ✅ NEW: উইশলিস্ট ক্লাউড সিঙ্ক — লগইন করা মাত্র Firestore থেকে লোড + লোকাল (গেস্ট অবস্থায় যোগ করা) আইটেম মার্জ
      syncWishlistOnLogin(user.uid);
      // ✅ NEW: আগে থেকে notification permission দেওয়া থাকলে FCM token রিফ্রেশ/সেভ করো
      syncFcmToken();
    } else {
      currentUserRole = null;
      updateNavbarAfterLogout();
      updateGoogleVerifyUI(null);
    }
    // ✅ মোট কাস্টমার/সেলার রিয়েল-টাইম কাউন্ট — লগইন/লগআউট দুই অবস্থাতেই চালু থাকবে
    if (!window._communityCountersStarted) {
      window._communityCountersStarted = true;
      initCommunityCounters();
    }
  });
  } // ✅ [FIX] auth guard বন্ধ

  let _chatUnreadPrevCount = null; // ✅ NEW: আগের unread count মনে রেখে বৃদ্ধি পেলেই নোটিফাই করার জন্য
  // ✅ NEW: কাস্টমারের নিজের অর্ডারের স্ট্যাটাস বদলালে (কনফার্মড→প্রসেসিং→শিপড→ডেলিভারড) নোটিফিকেশন
  let _myOrderStatusCache = new Map();
  let _myOrderStatusFirstLoad = true;
  function initCustomerOrderStatusListener(uid) {
    _myOrderStatusFirstLoad = true;
    firestore.collection('orders').where('customerUid', '==', uid).limit(30)
      .onSnapshot(snap => {
        snap.docChanges().forEach(change => {
          const d = change.doc.data();
          const id = change.doc.id;
          const prevStatus = _myOrderStatusCache.get(id);
          if (!_myOrderStatusFirstLoad && change.type === 'modified' && prevStatus && prevStatus !== d.status
              && localStorage.getItem('notif_pref_orders') !== 'off') {
            sendPushNotification('📦 অর্ডার আপডেট!', `আপনার অর্ডার এখন: ${d.status}`);
          }
          _myOrderStatusCache.set(id, d.status);
        });
        _myOrderStatusFirstLoad = false;
      }, () => {});
  }

  function initChatUnreadListener(uid) {
    firestore.collection('direct_chats').doc(uid).onSnapshot(doc => {
      if (!doc.exists) return;
      // [FIX #6] অব্যবহৃত "unread" variable সরানো হয়েছে — নিচের unreadAdmin ব্যবহার করা হচ্ছে
      // কাস্টমার নিজে পড়লে unread = 0 তাই আলাদা field দরকার
      // এখানে admin-reply unread দেখাচ্ছি
      const badge1 = document.getElementById('nav-chat-badge');
      const badge2 = document.getElementById('chat-fab-unread');
      const unreadAdmin = doc.data()?.unreadCustomer || 0;
      [badge1, badge2].forEach(b => {
        if (!b) return;
        b.innerText = unreadAdmin;
        b.classList.toggle('hidden', unreadAdmin <= 0);
      });
      // ✅ NEW: নতুন মেসেজ এলে (unread count আগের চেয়ে বাড়লে) নোটিফিকেশন — প্রথম লোডে নোটিফাই করবে না
      if (_chatUnreadPrevCount !== null && unreadAdmin > _chatUnreadPrevCount
          && localStorage.getItem('notif_pref_messages') !== 'off') {
        sendPushNotification('💬 নতুন মেসেজ এসেছে', 'সাপোর্ট থেকে আপনার জন্য একটা নতুন রিপ্লাই এসেছে।');
      }
      _chatUnreadPrevCount = unreadAdmin;
    }, () => {});
  }

  async function loadUserRole(user) {
    try {
      const userRef = firebase.firestore().collection("users").doc(user.uid);
      const doc = await userRef.get();
      if (doc.exists) {
        currentUserRole = doc.data().role || 'customer';
        userLoyaltyPoints = doc.data().loyaltyPoints || 0;
        userReferralCount = doc.data().referralCount || 0;
        userReferralCode = doc.data().referralCode || null;
        userBalance = doc.data().balance || 0; // ✅ NEW (feature-44)

        // ✅ পুরোনো ইউজারের referralCode না থাকলে তৈরি করো
        if (!userReferralCode) {
          userReferralCode = generateReferralCode(user.uid);
          await userRef.set({ referralCode: userReferralCode }, { merge: true });
        }
      } else {
        // ✅ [FIX #2] Admin email যাচাই — শুধু ADMIN_EMAILS তালিকায় থাকলেই seller role
        // Client-side check — Firebase Security Rules-এও এটি enforce করুন
        const isAdmin = Array.isArray(ADMIN_EMAILS) && ADMIN_EMAILS.includes(user.email);
        currentUserRole = isAdmin ? 'seller' : 'customer';
        userLoyaltyPoints = 0;
        userReferralCount = 0;
        userReferralCode = generateReferralCode(user.uid);
        userBalance = 0; // ✅ NEW (feature-44)
        await userRef.set({
          uid: user.uid, name: user.displayName || '', email: user.email || '',
          photo: user.photoURL || '', role: currentUserRole,
          loyaltyPoints: 0, referralCode: userReferralCode, referralCount: 0,
          balance: 0,
          joinedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
      }
    } catch (e) {
      console.error("Role load error:", e);
      currentUserRole = 'customer';
    }
  }

  // ============================================================
  // ✅ রেফারেল কোড — UID থেকে জেনারেট
  // ============================================================
  function generateReferralCode(uid) {
    return 'BDB' + uid.substring(0, 6).toUpperCase();
  }

  // ============================================================
  // ✅ কমিউনিটি ফিচার — মোট কাস্টমার/সেলার রিয়েল-টাইম কাউন্ট,
  //    প্রোফাইল ব্রাউজার, ফ্রেন্ড রিকোয়েস্ট ও পিয়ার-টু-পিয়ার চ্যাট
  // ============================================================
  let _peopleBrowserType   = null;
  let _peopleBrowserUnsub  = null;
  let _peopleBrowserData   = [];
  let _peerChatUnsub       = null;
  let _peerChatOtherUid    = null;
  let _peerChatOtherName   = null;
  let _peerChatOtherPhoto  = null;
  let _peerChatId          = null;
  let _peerChatSeenScheduled = new Set(); // ✅ মেসেজ পড়ার পর অটো-ডিলিট ট্র্যাকিং (একই মেসেজ একাধিকবার শিডিউল না হওয়ার জন্য)
  let _peerChatAutoSaved   = new Set(); // ✅ একই মিডিয়া মেসেজ একাধিকবার ডিভাইসে সেভ না হওয়ার জন্য ট্র্যাকিং
  let _peerVoiceHeardMarked = new Set(); // ✅ ভয়েস মেসেজ শোনার পর অটো-ডিলিট টাইমার একবারই শিডিউল করার জন্য ট্র্যাকিং
  // ✅ NEW (feature-15): ফিউচার মেসেজ — তারিখ/সময় শিডিউলার স্টেট
  let _peerChatLastMsgs    = []; // পিরিয়ডিক রি-রেন্ডারের জন্য সর্বশেষ মেসেজ লিস্ট ক্যাশ
  let _peerScheduleActive  = false; // শিডিউল প্যানেল চালু আছে কিনা
  let _peerScheduleRefreshTimer = null; // শিডিউল সময় পার হলে অটো-রিভিল করার পিরিয়ডিক টাইমার
  let _peerScheduleInboxBumped  = new Set(); // একই ফিউচার মেসেজ একাধিকবার ইনবক্স bump না করার ট্র্যাকিং
  let _peerDeleteTimers    = new Map(); // ✅ [FIX #3] সক্রিয় অটো-ডিলিট setTimeout ID ট্র্যাক — চ্যাট বদলালে পুরনো টাইমার cancel করা যাবে
  let _friendReqUnsub      = null;

  // ============================================================
  // ✅ পিয়ার চ্যাট ভয়েস মেসেজ রেকর্ডিং (MediaRecorder API)
  // ============================================================
  let _voiceRecorder       = null;
  let _voiceStream         = null;
  let _voiceChunks         = [];
  let _voiceStartTime      = null;
  let _voiceStopSnapshotTime = 0;  // ✅ [FIX #2] race condition এড়াতে stop()-এর সময় duration snapshot
  let _voiceTimerInterval  = null;
  let _voiceMaxTimeout     = null;
  let _voiceCancelled      = false;

  // ============================================================
  // ✅ অডিও/ভিডিও কল (WebRTC) — শুধুমাত্র একসেপ্টেড ফ্রেন্ডদের মধ্যে
  // ============================================================
  const ICE_SERVERS = {
    iceServers: [
      // ── STUN (IP discovery) ──────────────────────────────────
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun.cloudflare.com:3478' },
      // ── TURN (relay — বাংলাদেশ মোবাইল NAT / symmetric NAT-এ STUN একা ব্যর্থ হয়) ────
      // ✅ [BUG6 FIX] Open Relay (free public TURN) — production-এ নিজের TURN server ব্যবহার করুন
      {
        urls: [
          'turn:openrelay.metered.ca:80',
          'turn:openrelay.metered.ca:443',
          'turn:openrelay.metered.ca:443?transport=tcp'
        ],
        username:   'openrelayproject',
        credential: 'openrelayproject'
      },
      // Cloudflare TURN (free tier)
      {
        urls: 'turn:turn.cloudflare.com:3478',
        username:   '1234567890',   // Cloudflare Calls free credentials (replace with real)
        credential: 'cloudflare'
      }
    ],
    iceCandidatePoolSize: 10, // ✅ আগে থেকেই কিছু candidate জোগাড় করে রাখে
    iceTransportPolicy: 'all' // STUN ব্যর্থ হলে TURN relay ব্যবহার করো
  };
  // ✅ আধুনিক অডিও প্রসেসিং — একো বাতিল, ব্যাকগ্রাউন্ড নয়েজ কমানো, ভলিউম অটো-ব্যালান্স
  function getCallAudioConstraints() {
    return { echoCancellation: true, noiseSuppression: true, autoGainControl: true };
  }
  let _pc                  = null; // RTCPeerConnection
  let _localStream         = null;
  let _remoteStream        = null;
  let _activeCallId        = null;
  let _activeCallType      = 'audio';
  let _isCallCaller        = false;
  let _callOtherUid        = null;
  let _callOtherName       = null;
  let _callOtherPhoto      = null;
  let _callDocUnsub        = null;
  let _callCandidatesUnsub = null;
  let _incomingCallUnsub   = null;
  let _ownCandidateIds     = []; // নিজে যে ক্যান্ডিডেট ডকগুলো লিখেছি, কল শেষে ক্লিনআপের জন্য
  let _callTimerInterval   = null;
  let _callStartedAt       = null;
  let _callAnswerTimeout   = null;
  let _ringtoneOsc         = null;
  let _ringtoneCtx         = null;
  // ✅ আধুনিক কল ফিচারের জন্য নতুন স্টেট
  let _currentFacingMode   = 'user';   // ভিডিও কলে ফ্রন্ট/ব্যাক ক্যামেরা ট্র্যাক করার জন্য
  let _wakeLock            = null;     // স্ক্রিন অন রাখার জন্য (Screen Wake Lock API)
  let _statsInterval       = null;     // নেটওয়ার্ক কোয়ালিটি মনিটরিং (getStats পোলিং)
  let _iceRestartAttempted = false;    // একবারের বেশি অটো রিকনেক্ট চেষ্টা না করার জন্য
  let _reconnectTimeout    = null;
  let _isMicMuted          = false;
  let _isSpeakerOn         = true;
  let _speakerSupported    = false;    // setSinkId ব্রাউজার সাপোর্ট করে কিনা

  // নিজের পাবলিক প্রোফাইল তৈরি/সিঙ্ক করো (নাম, ছবি, রোল) — কমিউনিটি লিস্টে দেখানোর জন্য
  async function ensurePublicProfile(user) {
    if (!user || !currentUserRole) return;
    // pending_seller অবস্থায় পাবলিক প্রোফাইলে দেখাবো না — এটি সাময়িক স্টেট
    if (currentUserRole !== 'customer' && currentUserRole !== 'seller') return;
    const ref = firestore.collection('public_profiles').doc(user.uid);
    try {
      const snap = await ref.get();
      if (!snap.exists) {
        // ✅ [FIX] create payload-এ rules-এর hasOnly-এ listed সব optional field দাও
        // (bio ও profilePrivacy না থাকলে কিছু যায় আসে না কিন্তু থাকলে Rules pass হবে)
        await ref.set({
          uid: user.uid,
          name: user.displayName || 'ইউজার',
          photo: user.photoURL || '',
          role: currentUserRole,
          bio: '',
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
      } else {
        const d = snap.data();
        if (d.role !== currentUserRole || d.name !== (user.displayName || 'ইউজার') || d.photo !== (user.photoURL || '')) {
          await ref.set({
            name: user.displayName || 'ইউজার',
            photo: user.photoURL || '',
            role: currentUserRole,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
          }, { merge: true });
        }
      }
    } catch (e) {
      console.error('ensurePublicProfile error:', e);
    }
  }

  // ✅ FIX (feature-22, performance audit): আগে এখানে public_profiles কালেকশনের
  // উপর দুটো permanent onSnapshot লিসেনার ছিল — শুধু একটা সংখ্যা দেখানোর জন্য পুরো
  // কালেকশন (সব কাস্টমার/সেলার ডকুমেন্ট) ডাউনলোড হতো, প্রতি ভিজিটে, আর লাইভ লিসেনার
  // হিসেবে থেকেই যেত। ইউজার বাড়ার সাথে সাথে এটা লিনিয়ারলি খরচ বাড়াতো। এখন Firestore-এর
  // সার্ভার-সাইড count() aggregation ব্যবহার করা হলো — ডকুমেন্ট না নামিয়ে শুধু সংখ্যা আনে।
  // ট্রেড-অফ: এখন আর একদম রিয়েল-টাইম না (লাইভ আপডেট হয় না), তাই প্রতি ৫ মিনিটে রিফ্রেশ করি।
  async function initCommunityCounters() {
    async function refreshCounts() {
      try {
        const [custSnap, sellSnap] = await Promise.all([
          firestore.collection('public_profiles').where('role', '==', 'customer').count().get(),
          firestore.collection('public_profiles').where('role', '==', 'seller').count().get()
        ]);
        animateRingCount('community-customer-count', custSnap.data().count);
        animateRingCount('community-seller-count', sellSnap.data().count);
      } catch (e) { console.warn('Community counter fetch failed:', e); }
    }
    refreshCounts();
    setInterval(refreshCounts, 5 * 60 * 1000); // ৫ মিনিট পর পর রিফ্রেশ
  }

  function animateRingCount(elId, newVal) {
    const el = document.getElementById(elId);
    if (!el) return;
    if (el.innerText !== String(newVal)) {
      el.innerText = newVal;
      el.classList.remove('ring-count-pop');
      void el.offsetWidth; // reflow ট্রিক — এনিমেশন রিস্টার্ট করার জন্য
      el.classList.add('ring-count-pop');
    }
  }

  // ============================================================
  // ✅ মানুষ ব্রাউজার মডাল — মোট কাস্টমার/সেলার লিস্ট, স্ক্রল করে দেখা যাবে
  // ============================================================
  function openPeopleBrowser(type) {
    if (!currentUser) { alert(t('loginFirstAlert')); return; }
    _peopleBrowserType = type;
    const modal = document.getElementById('people-browser-modal');
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    document.getElementById('people-browser-title').innerText = type === 'customer' ? t('communityCustomersTitle') : t('communitySellersTitle');
    document.getElementById('people-browser-sub').innerText = t('communityBrowserSub');
    document.getElementById('people-browser-icon').className = type === 'customer' ? 'fas fa-user-group text-white text-sm' : 'fas fa-shop text-white text-sm';
    document.getElementById('people-browser-header').style.background = type === 'customer'
      ? 'linear-gradient(135deg,#c2410c,#ea580c)'
      : 'linear-gradient(135deg,#5b21b6,#6d28d9)';
    document.getElementById('people-browser-search').value = '';
    document.getElementById('people-browser-search').classList.remove('hidden');
    document.getElementById('people-browser-list').innerHTML = `<div class="text-center py-8 text-slate-400 text-xs"><i class="fas fa-spinner fa-spin text-lg text-slate-300 mb-2 block"></i> ${t('loadingText')}</div>`;

    if (_peopleBrowserUnsub) { _peopleBrowserUnsub(); _peopleBrowserUnsub = null; }
    // ✅ [FIX] orderBy('createdAt') বাদ দেওয়া হলো — এর জন্য Firestore কম্পোজিট ইনডেক্স লাগতো।
    // এখানে শুধু role দিয়ে ফিল্টার করে, ক্লায়েন্ট সাইডে createdAt দিয়ে সর্ট করা হচ্ছে।
    _peopleBrowserUnsub = firestore.collection('public_profiles')
      .where('role', '==', type)
      .limit(300)
      .onSnapshot(snap => {
        _peopleBrowserData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        _peopleBrowserData.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        renderPeopleBrowserList(_peopleBrowserData);
      }, e => {
        document.getElementById('people-browser-list').innerHTML = `<div class="text-center py-8 text-red-400 text-xs">${t('couldNotLoadLabel')}: ${e.message}</div>`;
      });
  }

  function closePeopleBrowser() {
    document.getElementById('people-browser-modal').classList.add('hidden');
    document.body.style.overflow = 'auto';
    if (_peopleBrowserUnsub) { _peopleBrowserUnsub(); _peopleBrowserUnsub = null; }
  }

  // ============================================================
  // ✅ তেজ — সোশ্যাল ফিড ফিচার
  // ============================================================
  let _tejUnsub = null;
  let _tejCurrentFilter = 'all';
  // ✅ NEW: প্রোফাইল পিকচারে ক্লিক করলে শুধু সেই ইউজারের পোস্ট দেখানোর ফিল্টার
  let _tejAuthorFilter = null;
  let _tejCurrentPostType = 'post';
  let _tejMediaBase64 = null;
  let _tejMediaMime = null;
  let _tejMediaFile = null; // ✅ [FIX - বড় ফাইল আপলোড] raw File — Firestore-এ না রেখে Storage-এ আপলোড হবে
  let _tejViewPostId = null;
  let _tejCommentUnsub = null;
  let _tejLastDocs = [];
  let _tejRefreshTimer = null;
  const TEJ_COLLECTION = 'tej_posts';

  function openTejFeed() {
    document.getElementById('tej-feed-modal').classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    // feature-36 ফিক্স: tej-feed-btn (নিচের nav) থেকে সরাসরি খোলা হলেও
    // টগল স্টেট সিঙ্কে থাকা দরকার, নাহলে প্রোফাইলের টগল রো ভুল অবস্থা দেখায়
    if (typeof _liquidNavState !== 'undefined') {
      _liquidNavState = 'page';
      const _cb = document.getElementById('profile-page-nav-toggle');
      if (_cb) _cb.checked = true;
      const _sub = document.getElementById('profile-page-nav-sub');
      if (_sub) _sub.textContent = 'হোমে ফিরে যান';
    }
    loadTejFeed('all');
    // ✅ পেজ হেডারে প্রোফাইল পিক সিঙ্ক করো
    _syncTejHeaderAvatar();
    // ✅ NEW (feature-18): স্টোরি লোড + নোটিফ লিসেনার
    loadTejStories();
    _startTejNotifListener();
    // হ্যাশট্যাগ সার্চ ক্লিয়ার
    _tejHashtagFilter = null;
    const hs = document.getElementById('tej-hashtag-search');
    if (hs) hs.value = '';
    // ✅ NEW: প্রোফাইল-পোস্ট ফিল্টারও ক্লিয়ার করো
    _tejAuthorFilter = null;
    document.getElementById('tej-author-filter-bar')?.classList.add('hidden');
  }

  function closeTejFeed() {
    document.getElementById('tej-feed-modal').classList.add('hidden');
    document.body.style.overflow = 'auto';
    if (_tejUnsub) { _tejUnsub(); _tejUnsub = null; }
    if (_tejRefreshTimer) { clearInterval(_tejRefreshTimer); _tejRefreshTimer = null; }
    // ✅ NEW (feature-18)
    if (typeof _tejStoryUnsub === 'function') { _tejStoryUnsub(); _tejStoryUnsub = null; }
    // feature-36: liquid toggle reset
    if (typeof _liquidNavState !== 'undefined' && _liquidNavState === 'page') {
      _liquidNavState = 'home';
      const _cb = document.getElementById('profile-page-nav-toggle');
      if (_cb) _cb.checked = false;
      const _sub = document.getElementById('profile-page-nav-sub');
      if (_sub) _sub.textContent = 'সোশ্যাল ফিডে যান';
    }
  }

  // ✅ পেজ হেডারে প্রোফাইল ছবি সিঙ্ক (header-profile-avatar থেকে কপি করা হয়)
  function _syncTejHeaderAvatar() {
    const mainAvatar = document.getElementById('header-profile-avatar');
    const tejAvatar  = document.getElementById('tej-header-profile-avatar');
    const tejIcon    = document.getElementById('tej-header-profile-icon');
    if (!tejAvatar || !tejIcon) return;
    if (mainAvatar && !mainAvatar.classList.contains('hidden') && mainAvatar.src) {
      tejAvatar.src = mainAvatar.src;
      tejAvatar.classList.remove('hidden');
      tejIcon.classList.add('hidden');
    } else {
      tejAvatar.classList.add('hidden');
      tejIcon.classList.remove('hidden');
    }
  }

  // ============================================================
  // ✅ মেসেজ ইনবক্স — পেজ হেডারের মেসেজ বাটন
  // ============================================================
  let _tejMessageInboxData = []; // সকল মেসেজের ক্যাশ

  async function openTejMessageInbox() {
    if (!currentUser) { showCartToast('⚠️ মেসেজ দেখতে লগইন করুন'); return; }
    document.getElementById('tej-message-inbox-modal').classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    document.getElementById('tej-message-inbox-search').value = '';
    await _loadTejMessageInbox();
  }

  function closeTejMessageInbox() {
    document.getElementById('tej-message-inbox-modal').classList.add('hidden');
    document.body.style.overflow = 'auto';
  }

  async function _loadTejMessageInbox() {
    const listEl = document.getElementById('tej-message-inbox-list');
    listEl.innerHTML = `<div class='text-center py-10 text-slate-400'><i class='fas fa-spinner fa-spin text-xl text-slate-300 mb-2 block'></i><p class='text-xs'>মেসেজ লোড হচ্ছে...</p></div>`;
    try {
      // ✅ [FIX] where('participants',...) + orderBy('updatedAt') কম্বো Firestore composite index ছাড়া কাজ করে না।
      // তাই orderBy বাদ দিয়ে client-side sort করা হচ্ছে।
      const snapshot = await firestore.collection('peer_chats')
        .where('participants', 'array-contains', currentUser.uid)
        .limit(50)
        .get();

      if (snapshot.empty) {
        listEl.innerHTML = `<div class='text-center py-10 text-slate-400'><i class='fas fa-comment-slash text-2xl text-slate-300 mb-2 block'></i><p class='text-xs'>কোনো মেসেজ নেই। কারো সাথে মেসেজ শুরু করুন!</p></div>`;
        return;
      }

      // প্রতিটি মেসেজের অন্য পার্টিসিপ্যান্টের প্রোফাইল লোড করো
      const chats = [];
      for (const doc of snapshot.docs) {
        const data = doc.data();
        const participants = data.participants || [];
        const otherUid = participants.find(uid => uid !== currentUser.uid);
        if (!otherUid) continue;
        let otherProfile = { name: 'ইউজার', photo: '' };
        try {
          const pDoc = await firestore.collection('public_profiles').doc(otherUid).get();
          if (pDoc.exists) otherProfile = pDoc.data();
        } catch(e) {}
        chats.push({ chatId: doc.id, otherUid, otherProfile, lastMsg: data.lastMessage || '', updatedAt: data.updatedAt });
      }
      _tejMessageInboxData = chats;
      // ✅ [FIX] Client-side sort by updatedAt (newest first)
      _tejMessageInboxData.sort((a, b) => {
        const aMs = a.updatedAt?.toMillis ? a.updatedAt.toMillis() : 0;
        const bMs = b.updatedAt?.toMillis ? b.updatedAt.toMillis() : 0;
        return bMs - aMs;
      });
      _renderTejMessageInbox(_tejMessageInboxData);
    } catch(e) {
      listEl.innerHTML = `<div class='text-center py-10 text-red-400 text-xs'>লোড ব্যর্থ: ${escapeHtml(e.message)}</div>`;
    }
  }

  function _renderTejMessageInbox(chats) {
    const listEl = document.getElementById('tej-message-inbox-list');
    if (!chats.length) {
      listEl.innerHTML = `<div class='text-center py-10 text-slate-400'><i class='fas fa-search text-2xl text-slate-300 mb-2 block'></i><p class='text-xs'>কোনো ফলাফল পাওয়া যায়নি</p></div>`;
      return;
    }
    listEl.innerHTML = chats.map(c => {
      const name = escapeHtml(c.otherProfile.name || 'ইউজার');
      const photo = c.otherProfile.photo || '';
      const avatar = photo
        ? `<img loading="lazy" src='${escapeHtml(photo)}' class='w-11 h-11 rounded-full object-cover shrink-0 border border-slate-200' onerror="this.src='https://placehold.co/44x44/f1f5f9/64748b?text=?'">`
        : `<div class='w-11 h-11 rounded-full bg-slate-200 flex items-center justify-center shrink-0'><i class='fas fa-user text-slate-400 text-sm'></i></div>`;
      const lastMsg = escapeHtml((c.lastMsg || '').substring(0, 40));
      const safeName = name.replace(/'/g, "\\'");
      const safePhoto = escapeHtml(photo).replace(/'/g, "\\'");
      return `
        <button onclick="closeTejMessageInbox(); openPeerChatModal('${c.otherUid}', '${safeName}', '${safePhoto}')"
          class='w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 active:bg-slate-100 transition text-left'>
          ${avatar}
          <div class='flex-1 min-w-0'>
            <p class='font-black text-xs text-slate-800 truncate'>${name}</p>
            <p class='text-[10px] text-slate-400 truncate mt-0.5'>${lastMsg || 'মেসেজ শুরু করুন...'}</p>
          </div>
          <i class='fas fa-chevron-right text-slate-300 text-xs shrink-0'></i>
        </button>`;
    }).join('');
  }

  function filterTejMessageInbox(query) {
    if (!query.trim()) { _renderTejMessageInbox(_tejMessageInboxData); return; }
    const q = query.toLowerCase();
    const filtered = _tejMessageInboxData.filter(c => (c.otherProfile.name || '').toLowerCase().includes(q));
    _renderTejMessageInbox(filtered);
  }

  // ============================================================
  // ✅ NEW (feature-17): অ্যাপ স্টোর — Phase 2 ব্যাকএন্ড (Firebase Storage + SHA-256 hash + অ্যাডমিন রিভিউ)
  // ⚠️ স্বয়ংক্রিয় VirusTotal API কল এখানে ইচ্ছাকৃতভাবে নেই — ব্রাউজার থেকে API key লুকানো সম্ভব না
  // (Cloud Functions লাগবে, যেটার জন্য Blaze প্ল্যান + CLI ডিপ্লয়মেন্ট লাগে — আপনার Console-only
  // ওয়ার্কফ্লোর সাথে যায় না)। তার বদলে: প্রতিটা ফাইলের আসল SHA-256 hash বের করে রাখা হয়, এবং
  // অ্যাডমিন রিভিউ কিউতে এক-ক্লিকে virustotal.com-এ সেই hash চেক করার লিংক দেওয়া হয় — সম্পূর্ণ ফ্রি,
  // কোনো API key বা ব্যাকএন্ড ছাড়াই, এবং অ্যাপ পাবলিক হওয়ার আগে অ্যাডমিনের ম্যানুয়াল অ্যাপ্রুভাল লাগবেই।
  // ============================================================
  let _appStoreApps          = []; // সর্বশেষ লোড করা সব অ্যাপের ক্যাশ (পেজিনেশন ছাড়া, limit 100)
  let _appStoreOnlyMine       = false;
  // ✅ NEW (feature-25): ডাউনলোড হিস্ট্রি — এই সেশনে (বা Firestore থেকে লোড করা) ডাউনলোড করা app ID-গুলো
  let _appStoreDownloadedIds  = new Set();
  let _appStoreShowDownloads  = false;

  async function loadAppStoreApps() {
    const grid = document.getElementById('app-store-grid');
    if (grid) grid.innerHTML = `<div class="col-span-2 text-center py-10 text-slate-400"><i class="fas fa-spinner fa-spin text-xl text-slate-300 mb-2 block"></i><p class="text-xs">অ্যাপ লোড হচ্ছে...</p></div>`;
    try {
      // ✅ [FIX feature-17] আগে এখানে শুধু orderBy দিয়ে (কোনো where ছাড়া) সব অ্যাপ আনা হতো —
      // কিন্তু Firestore Rules অনুযায়ী pending অ্যাপ শুধু uploader/admin পড়তে পারে, আর Rules
      // কখনো কোয়েরি রিজাল্ট "ফিল্টার" করে না — কোনো একটা ডকুমেন্ট না পড়তে পারলে পুরো কোয়েরিই
      // permission-denied হয়ে যায়। তাই অন্য কারও pending অ্যাপ থাকা মাত্রই এই ফাংশন ভেঙে যেত।
      // সমাধান: status/uid দিয়ে আলাদা স্কোপড কোয়েরি — প্রতিটাই একটামাত্র equality where (orderBy নেই),
      // তাই কম্পোজিট ইনডেক্সও লাগে না, এবং Rules-এর সাথেও পুরোপুরি সামঞ্জস্যপূর্ণ।
      const merged = new Map();
      const verifiedSnap = await firestore.collection('apps').where('status', '==', 'verified').limit(100).get();
      verifiedSnap.docs.forEach(d => merged.set(d.id, { id: d.id, ...d.data() }));
      if (currentUser) {
        const mineSnap = await firestore.collection('apps').where('uid', '==', currentUser.uid).limit(100).get();
        mineSnap.docs.forEach(d => merged.set(d.id, { id: d.id, ...d.data() }));
      }
      if (currentUser && ADMIN_EMAILS.includes(currentUser.email)) {
        const pendingSnap = await firestore.collection('apps').where('status', '==', 'pending').limit(100).get();
        pendingSnap.docs.forEach(d => merged.set(d.id, { id: d.id, ...d.data() }));
      }
      _appStoreApps = Array.from(merged.values())
        .sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));

      // ✅ NEW (feature-25): ডাউনলোড হিস্ট্রি Firestore থেকে লোড করা
      if (currentUser) {
        try {
          const dlSnap = await firestore.collection('app_downloads')
            .where('uid', '==', currentUser.uid).limit(200).get();
          _appStoreDownloadedIds = new Set(dlSnap.docs.map(d => d.data().appId));
        } catch (_) { /* permission denied হলে নীরবে এড়িয়ে যাই */ }
      }
    } catch (e) {
      if (grid) grid.innerHTML = `<div class="col-span-2 text-center py-10 text-red-400 text-xs">লোড করা যায়নি: ${e.message}</div>`;
      return;
    }
    _renderVisibleAppStoreGrid();
  }

  function _visibleAppStoreApps() {
    return _appStoreApps.filter(a => {
      // ✅ NEW (feature-25): ডাউনলোড হিস্ট্রি ভিউ
      if (_appStoreShowDownloads) return _appStoreDownloadedIds.has(a.id);
      if (_appStoreOnlyMine) return currentUser && a.uid === currentUser.uid;
      return a.status === 'verified' || (currentUser && a.uid === currentUser.uid);
    });
  }

  function _renderVisibleAppStoreGrid() {
    renderAppStoreGrid(_visibleAppStoreApps());
  }

  function toggleAppStoreOnlyMine() {
    if (!currentUser) { showCartToast('⚠️ লগইন করুন'); return; }
    _appStoreOnlyMine = !_appStoreOnlyMine;
    if (_appStoreOnlyMine) _appStoreShowDownloads = false;
    const btn = document.getElementById('app-store-mine-btn');
    if (btn) {
      btn.classList.toggle('bg-orange-500', _appStoreOnlyMine);
      btn.classList.toggle('text-white', _appStoreOnlyMine);
      btn.classList.toggle('bg-slate-100', !_appStoreOnlyMine);
      btn.classList.toggle('text-slate-600', !_appStoreOnlyMine);
    }
    // ✅ downloads বাটনের active state রিসেট
    _syncAppStoreDownloadsBtnStyle();
    document.getElementById('app-store-search').value = '';
    _renderVisibleAppStoreGrid();
  }

  // ✅ NEW (feature-25): আমার ডাউনলোড টগল
  function toggleAppStoreShowDownloads() {
    if (!currentUser) { showCartToast('⚠️ লগইন করুন'); return; }
    _appStoreShowDownloads = !_appStoreShowDownloads;
    if (_appStoreShowDownloads) _appStoreOnlyMine = false;
    // mine বাটন রিসেট
    const mineBtn = document.getElementById('app-store-mine-btn');
    if (mineBtn) {
      mineBtn.classList.replace('bg-orange-500', 'bg-slate-100');
      mineBtn.classList.replace('text-white', 'text-slate-600');
    }
    _syncAppStoreDownloadsBtnStyle();
    document.getElementById('app-store-search').value = '';
    _renderVisibleAppStoreGrid();
  }

  function _syncAppStoreDownloadsBtnStyle() {
    const btn = document.getElementById('app-store-dl-btn');
    if (!btn) return;
    btn.classList.toggle('bg-blue-500', _appStoreShowDownloads);
    btn.classList.toggle('text-white', _appStoreShowDownloads);
    btn.classList.toggle('bg-slate-100', !_appStoreShowDownloads);
    btn.classList.toggle('text-slate-600', !_appStoreShowDownloads);
  }

  function openAppStore() {
    document.getElementById('app-store-modal').classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    const reviewBtn = document.getElementById('app-store-review-queue-btn');
    if (reviewBtn) reviewBtn.classList.toggle('hidden', !(currentUser && ADMIN_EMAILS.includes(currentUser.email)));
    loadAppStoreApps();
  }

  function closeAppStore() {
    document.getElementById('app-store-modal').classList.add('hidden');
    document.body.style.overflow = 'auto';
  }

  function _appStoreStatusBadge(status) {
    if (status === 'verified') return `<span class="text-[8px] font-black px-1.5 py-0.5 rounded-full bg-green-100 text-green-700"><i class="fas fa-check"></i> যাচাইকৃত</span>`;
    if (status === 'pending') return `<span class="text-[8px] font-black px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700"><i class="fas fa-clock"></i> রিভিউ চলছে</span>`;
    return '';
  }

  function renderAppStoreGrid(apps) {
    const grid = document.getElementById('app-store-grid');
    if (!grid) return;
    if (apps.length === 0) {
      grid.innerHTML = `<div class="col-span-2 text-center py-10 text-slate-400"><i class="fas fa-box-open text-2xl text-slate-300 mb-2 block"></i><p class="text-xs">কোনো অ্যাপ পাওয়া যায়নি</p></div>`;
      return;
    }
    grid.innerHTML = apps.map(a => {
      const avgRating = (a.ratingCount && a.ratingCount > 0) ? (a.ratingSum / a.ratingCount) : 0;
      const starsHtml = renderStarsHtml(avgRating, a.ratingCount || 0, { size: 'text-[8px]', showCount: true });
      const isDownloaded = _appStoreDownloadedIds.has(a.id);
      const dlBadge = isDownloaded
        ? `<span class="text-[7px] font-black px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700"><i class="fas fa-download"></i> ডাউনলোড হয়েছে</span>`
        : '';
      return `
      <div onclick='openAppDetail("${a.id}")' class='bg-white border border-slate-100 rounded-2xl p-3 flex flex-col items-center text-center gap-1.5 active:scale-95 transition cursor-pointer shadow-sm'>
        <div class='w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center text-2xl overflow-hidden'>
          ${a.iconBase64 ? `<img loading="lazy" src="${a.iconBase64}" class="w-full h-full object-cover">` : '📦'}
        </div>
        <p class='text-[11px] font-bold text-slate-800 line-clamp-1 w-full'>${escapeHtml(a.name || '')}</p>
        <p class='text-[9px] text-slate-400 line-clamp-1 w-full'>${escapeHtml(a.shortDesc || '')}</p>
        ${starsHtml}
        ${_appStoreStatusBadge(a.status)}
        ${dlBadge}
      </div>`;
    }).join('');
  }

  function filterAppStoreGrid(query) {
    const base = _visibleAppStoreApps();
    if (!query.trim()) { renderAppStoreGrid(base); return; }
    const q = query.toLowerCase();
    renderAppStoreGrid(base.filter(a => (a.name || '').toLowerCase().includes(q) || (a.category || '').toLowerCase().includes(q)));
  }

  function openAppDetail(appId) {
    const app = _appStoreApps.find(a => a.id === appId);
    if (!app) return;
    const isOwner = currentUser && app.uid === currentUser.uid;
    const canDownload = app.status === 'verified' || isOwner;
    const body = document.getElementById('app-detail-body');
    body.innerHTML = `
      <div class='flex items-center gap-3 mb-4'>
        <div class='w-20 h-20 rounded-3xl bg-slate-100 flex items-center justify-center text-4xl shrink-0 overflow-hidden'>
          ${app.iconBase64 ? `<img loading="lazy" src="${app.iconBase64}" class="w-full h-full object-cover">` : '📦'}
        </div>
        <div class='flex-1 min-w-0'>
          <h3 class='font-black text-base text-slate-800 line-clamp-1'>${escapeHtml(app.name || '')}</h3>
          <p class='text-[11px] text-slate-400 line-clamp-1'>${escapeHtml(app.uploaderName || '')}</p>
          <div class='mt-1'>${_appStoreStatusBadge(app.status)}</div>
          ${(app.ratingCount > 0) ? renderStarsHtml(app.ratingSum / app.ratingCount, app.ratingCount, { size: 'text-[10px]', showCount: true }) : `<p class='text-[9px] text-slate-400 mt-1'>এখনো রেটিং নেই</p>`}
        </div>
      </div>
      <div class='grid grid-cols-3 gap-2 mb-4 text-center'>
        <div class='bg-slate-50 rounded-xl py-2'><p class='text-[10px] text-slate-400'>সাইজ</p><p class='text-xs font-bold text-slate-700'>${escapeHtml(app.sizeLabel || '-')}</p></div>
        <div class='bg-slate-50 rounded-xl py-2'><p class='text-[10px] text-slate-400'>ভার্সন</p><p class='text-xs font-bold text-slate-700'>${escapeHtml(app.version || '-')}</p></div>
        <div class='bg-slate-50 rounded-xl py-2'><p class='text-[10px] text-slate-400'>ডাউনলোড</p><p class='text-xs font-bold text-slate-700'>${app.downloads || 0}+</p></div>
      </div>
      <p class='text-xs text-slate-600 leading-relaxed mb-4'>${escapeHtml(app.longDesc || app.shortDesc || '')}</p>
      <div class='bg-amber-50 rounded-xl p-3 flex items-start gap-2 mb-4'>
        <i class='fas fa-triangle-exclamation text-amber-500 text-xs mt-0.5'></i>
        <p class='text-[10px] text-amber-700 leading-relaxed'>অ্যাডমিন রিভিউ করলেও কোনো অ্যাপের ১০০% নিরাপত্তার নিশ্চয়তা দেওয়া সম্ভব না। অপরিচিত উৎস থেকে অ্যাপ ইন্সটল করার আগে সতর্ক থাকুন।</p>
      </div>
      ${!canDownload ? `<div class="bg-slate-100 rounded-xl p-3 text-center text-[11px] text-slate-500 mb-2">⏳ এই অ্যাপটি এখনো অ্যাডমিন রিভিউয়ের অপেক্ষায়, তাই পাবলিকভাবে ডাউনলোড করা যাবে না</div>` : ''}
      <button onclick='downloadApp("${app.id}")' ${canDownload ? '' : 'disabled'}
        class='w-full ${canDownload ? "bg-gradient-to-r from-orange-500 to-pink-500" : "bg-slate-300 cursor-not-allowed"} text-white font-black text-xs py-3.5 rounded-xl active:scale-95 transition'>
        <i class='fas fa-download mr-1'></i> ${isOwner && app.status === 'pending' ? 'টেস্ট ডাউনলোড (এখনো পাবলিক নয়)' : 'ডাউনলোড করুন'}
      </button>
      ${(canDownload && !isOwner) ? `
      <!-- ✅ NEW (feature-25): রেটিং/রিভিউ ফর্ম — শুধু verified অ্যাপে, নিজের আপলোডে নয় -->
      <div class='mt-4 border-t border-slate-100 pt-4' id='app-review-section-${app.id}'>
        <p class='text-[11px] font-black text-slate-700 mb-2'>⭐ এই অ্যাপকে রেটিং দিন</p>
        <div class='flex gap-2 mb-2' id='app-star-picker-${app.id}'>
          ${[1,2,3,4,5].map(s => `<button onclick='_appStarPick("${app.id}",${s})' data-star='${s}'
            class='text-xl text-slate-300 active:scale-90 transition' id='app-star-${app.id}-${s}'>★</button>`).join('')}
        </div>
        <textarea id='app-review-comment-${app.id}' placeholder='মন্তব্য লিখুন (ঐচ্ছিক, সর্বোচ্চ ৩০০ অক্ষর)'
          class='w-full text-xs border border-slate-200 rounded-xl px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-orange-400' rows='2' maxlength='300'></textarea>
        <button onclick='submitAppReview("${app.id}")'
          class='mt-2 w-full bg-slate-800 text-white text-xs font-black py-2.5 rounded-xl active:scale-95 transition'>
          রিভিউ জমা দিন
        </button>
      </div>` : ''}
      ${isOwner ? `<button onclick='deleteMyAppUpload("${app.id}")' class='w-full mt-2 text-red-500 text-[11px] font-bold py-2 rounded-xl border border-red-200 active:scale-95 transition'><i class="fas fa-trash mr-1"></i> আমার এই আপলোড ডিলিট করুন</button>` : ''}
    `;
    document.getElementById('app-detail-modal').classList.remove('hidden');
  }

  function closeAppDetail() {
    document.getElementById('app-detail-modal').classList.add('hidden');
  }

  // ✅ NEW (feature-25): স্টার পিকার হাইলাইট
  let _appCurrentStarRating = 0;
  function _appStarPick(appId, star) {
    _appCurrentStarRating = star;
    for (let s = 1; s <= 5; s++) {
      const el = document.getElementById(`app-star-${appId}-${s}`);
      if (el) el.style.color = s <= star ? '#f59e0b' : '#e2e8f0';
    }
  }

  // ✅ NEW (feature-25): রিভিউ সাবমিট — Firestore apps/{id}/reviews/{uid} + aggregate update
  async function submitAppReview(appId) {
    if (!currentUser) { showCartToast('⚠️ রিভিউ দিতে লগইন করুন'); return; }
    if (_appCurrentStarRating < 1 || _appCurrentStarRating > 5) {
      showCartToast('⚠️ আগে স্টার রেটিং বেছে নিন'); return;
    }
    const commentEl = document.getElementById(`app-review-comment-${appId}`);
    const comment = (commentEl ? commentEl.value : '').trim().slice(0, 300);
    try {
      const reviewRef = firestore.collection('apps').doc(appId).collection('reviews').doc(currentUser.uid);
      const existing = await reviewRef.get();
      if (existing.exists) { showCartToast('⚠️ আপনি আগেই রিভিউ দিয়েছেন'); return; }
      // ব্যাচ রাইট: রিভিউ ডকুমেন্ট + apps aggregate আপডেট
      const batch = firestore.batch();
      batch.set(reviewRef, {
        uid: currentUser.uid,
        appId, rating: _appCurrentStarRating, comment,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      batch.update(firestore.collection('apps').doc(appId), {
        ratingSum: firebase.firestore.FieldValue.increment(_appCurrentStarRating),
        ratingCount: firebase.firestore.FieldValue.increment(1)
      });
      await batch.commit();
      showCartToast('✅ রিভিউ জমা হয়েছে, ধন্যবাদ!');
      // local cache আপডেট
      const cached = _appStoreApps.find(a => a.id === appId);
      if (cached) {
        cached.ratingSum = (cached.ratingSum || 0) + _appCurrentStarRating;
        cached.ratingCount = (cached.ratingCount || 0) + 1;
      }
      _appCurrentStarRating = 0;
      // রিভিউ সেকশন লুকিয়ে ফেলা
      const sec = document.getElementById(`app-review-section-${appId}`);
      if (sec) sec.innerHTML = `<p class='text-[11px] text-green-600 font-bold text-center py-2'>✅ আপনার রিভিউ সেভ হয়েছে</p>`;
    } catch (e) {
      showCartToast('❌ রিভিউ জমা হয়নি: ' + e.message);
    }
  }

  function downloadApp(appId) {
    const app = _appStoreApps.find(a => a.id === appId);
    if (!app || !app.apkUrl) { showCartToast('⚠️ ফাইল পাওয়া যায়নি'); return; }
    const isOwner = currentUser && app.uid === currentUser.uid;
    if (app.status !== 'verified' && !isOwner) { showCartToast('⚠️ অ্যাপটি এখনো রিভিউয়ের অপেক্ষায়'); return; }
    window.open(app.apkUrl, '_blank');
    // ✅ নিজের টেস্ট ডাউনলোডে কাউন্টার বাড়বে না — শুধু verified অ্যাপের পাবলিক ডাউনলোডেই বাড়বে
    if (app.status === 'verified') {
      firestore.collection('apps').doc(appId).update({
        downloads: firebase.firestore.FieldValue.increment(1)
      }).catch(() => {});
      // ✅ NEW (feature-25): ডাউনলোড হিস্ট্রি Firestore-এ সেভ করা (idempotent: docId = uid_appId)
      if (currentUser) {
        _appStoreDownloadedIds.add(appId);
        const dlDocId = currentUser.uid + '_' + appId;
        firestore.collection('app_downloads').doc(dlDocId).set({
          uid: currentUser.uid,
          appId: appId,
          downloadedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true }).catch(() => {});
      }
    }
  }

  async function deleteMyAppUpload(appId) {
    if (!confirm('আপনার এই আপলোডটি স্থায়ীভাবে ডিলিট করতে চান?')) return;
    const app = _appStoreApps.find(a => a.id === appId);
    if (!app) return;
    try {
      if (app.apkPath) await storage.ref(app.apkPath).delete().catch(() => {});
      await firestore.collection('apps').doc(appId).delete();
      closeAppDetail();
      showCartToast('🗑️ ডিলিট করা হয়েছে');
      loadAppStoreApps();
    } catch (e) {
      showCartToast('❌ ব্যর্থ হয়েছে: ' + e.message);
    }
  }

  // ---- আপলোড ফর্ম ----
  let _appUploadIconDataUrl = null;
  let _appUploadApkFile     = null;
  let _appUploadFileHash    = null;

  function openAppUploadForm() {
    if (!currentUser) { showCartToast('⚠️ আপলোড করার জন্য লগইন করুন'); return; }
    document.getElementById('app-upload-modal').classList.remove('hidden');
  }

  function closeAppUploadForm() {
    document.getElementById('app-upload-modal').classList.add('hidden');
  }

  function handleAppIconPick(event) {
    const file = event.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { showCartToast('⚠️ একটি ছবি ফাইল বেছে নিন'); return; }
    const reader = new FileReader();
    reader.onload = e => {
      const dataUrl = e.target.result;
      // ✅ peer chat-এর মিডিয়া মেসেজের মতোই 900KB cap — Firestore ডকুমেন্ট সাইজ লিমিটের জন্য
      if (dataUrl.length > 900000) { showCartToast('⚠️ আইকন ছবিটি বড় — ছোট/কম রেজোলিউশনের ছবি দিন'); return; }
      _appUploadIconDataUrl = dataUrl;
      const img = document.getElementById('app-upload-icon-preview');
      const placeholder = document.getElementById('app-upload-icon-placeholder-icon');
      img.src = _appUploadIconDataUrl;
      img.classList.remove('hidden');
      if (placeholder) placeholder.classList.add('hidden');
    };
    reader.readAsDataURL(file);
  }

  // ✅ NEW (feature-17): ফাইলের SHA-256 hash — Web Crypto API (ব্রাউজার-নেটিভ, কোনো লাইব্রেরি লাগে না)
  async function _computeFileSha256(file) {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  async function handleApkFilePick(event) {
    const file = event.target.files[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.apk')) {
      showCartToast('⚠️ শুধুমাত্র .apk ফাইল আপলোড করা যাবে');
      event.target.value = '';
      return;
    }
    const sizeMB = file.size / (1024 * 1024);
    if (sizeMB > 150) {
      showCartToast('⚠️ ফাইলটি অনেক বড় (১৫০MB-এর বেশি) — আপলোড সম্ভব হবে না');
      event.target.value = '';
      return;
    }
    _appUploadApkFile = file;
    _appUploadFileHash = null;
    const filenameEl = document.getElementById('app-upload-apk-filename');
    filenameEl.innerText = `${file.name} (${sizeMB.toFixed(1)} MB) — হ্যাশ গণনা হচ্ছে...`;
    try {
      _appUploadFileHash = await _computeFileSha256(file);
      filenameEl.innerText = `${file.name} (${sizeMB.toFixed(1)} MB) ✓`;
    } catch (e) {
      filenameEl.innerText = `${file.name} (${sizeMB.toFixed(1)} MB)`;
    }
  }

  function _resetAppUploadForm() {
    document.getElementById('app-upload-name').value = '';
    document.getElementById('app-upload-short-desc').value = '';
    document.getElementById('app-upload-long-desc').value = '';
    document.getElementById('app-upload-version').value = '';
    document.getElementById('app-upload-apk-filename').innerText = 'APK ফাইল বেছে নিতে ট্যাপ করুন';
    document.getElementById('app-upload-icon-preview').classList.add('hidden');
    const placeholderIcon = document.getElementById('app-upload-icon-placeholder-icon');
    if (placeholderIcon) placeholderIcon.classList.remove('hidden');
    _appUploadIconDataUrl = null;
    _appUploadApkFile = null;
    _appUploadFileHash = null;
  }

  async function submitAppUpload() {
    const name = document.getElementById('app-upload-name').value.trim();
    const shortDesc = document.getElementById('app-upload-short-desc').value.trim();
    const longDesc = document.getElementById('app-upload-long-desc').value.trim();
    const category = document.getElementById('app-upload-category').value;
    const version = document.getElementById('app-upload-version').value.trim() || '1.0.0';

    if (!name) { showCartToast('⚠️ অ্যাপের নাম লিখুন'); return; }
    if (!shortDesc) { showCartToast('⚠️ সংক্ষিপ্ত বর্ণনা লিখুন'); return; }
    if (!_appUploadApkFile) { showCartToast('⚠️ একটি APK ফাইল বেছে নিন'); return; }
    if (!currentUser) { showCartToast('⚠️ আপলোড করার জন্য লগইন করুন'); return; }

    const submitBtn = document.getElementById('app-upload-submit-btn');
    const progressWrap = document.getElementById('app-upload-progress-wrap');
    const progressBar = document.getElementById('app-upload-progress-bar');
    const progressLabel = document.getElementById('app-upload-progress-label');
    submitBtn.disabled = true;
    submitBtn.classList.add('opacity-50');
    progressWrap.classList.remove('hidden');
    progressBar.style.width = '0%';
    progressLabel.innerText = 'ফাইল যাচাই হচ্ছে...';

    try {
      // ✅ hash আগেই (ফাইল পিক করার সময়) গণনা হয়ে থাকে — না থাকলে এখন গণনা করা হচ্ছে
      const fileHash = _appUploadFileHash || await _computeFileSha256(_appUploadApkFile);

      const appRef = firestore.collection('apps').doc();
      const safeName = _appUploadApkFile.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      // ✅ পাথে uid রাখা হলো — যাতে Storage Rules-এ owner নিজে ডিলিট করার অনুমতি যাচাই করা যায়
      const storagePath = `app_store/${currentUser.uid}/${appRef.id}/${safeName}`;
      const uploadTask = storage.ref(storagePath).put(_appUploadApkFile, { contentType: 'application/vnd.android.package-archive' });

      await new Promise((resolve, reject) => {
        uploadTask.on('state_changed', snap => {
          const pct = Math.round((snap.bytesTransferred / snap.totalBytes) * 100);
          progressBar.style.width = pct + '%';
          progressLabel.innerText = `আপলোড হচ্ছে... ${pct}%`;
        }, reject, resolve);
      });

      const apkUrl = await uploadTask.snapshot.ref.getDownloadURL();
      const sizeMB = _appUploadApkFile.size / (1024 * 1024);
      progressLabel.innerText = 'সংরক্ষণ করা হচ্ছে...';

      await appRef.set({
        uid: currentUser.uid,
        uploaderName: currentUser.displayName || 'অজানা',
        name, shortDesc, longDesc, category, version,
        sizeBytes: _appUploadApkFile.size,
        sizeLabel: sizeMB.toFixed(1) + ' MB',
        iconBase64: _appUploadIconDataUrl || null,
        apkUrl, apkPath: storagePath, fileHash,
        status: 'pending',
        downloads: 0,
        // ✅ NEW (feature-25): রেটিং ফিল্ড ০ দিয়ে ইনিশিয়ালাইজ (Rules-এও validate হয়)
        ratingSum: 0,
        ratingCount: 0,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });

      closeAppUploadForm();
      _resetAppUploadForm();
      showCartToast('✅ আপলোড সম্পন্ন! অ্যাডমিন রিভিউ শেষে অ্যাপটি পাবলিকভাবে দেখা যাবে');
      loadAppStoreApps();
    } catch (e) {
      showCartToast('❌ আপলোড ব্যর্থ হয়েছে: ' + e.message);
    } finally {
      submitBtn.disabled = false;
      submitBtn.classList.remove('opacity-50');
      progressWrap.classList.add('hidden');
    }
  }

  // ---- অ্যাডমিন রিভিউ কিউ ----
  function openAppReviewQueue() {
    if (!currentUser || !ADMIN_EMAILS.includes(currentUser.email)) { showCartToast('⚠️ অনুমতি নেই'); return; }
    document.getElementById('app-review-modal').classList.remove('hidden');
    loadAppReviewQueue();
  }

  function closeAppReviewQueue() {
    document.getElementById('app-review-modal').classList.add('hidden');
  }

  async function loadAppReviewQueue() {
    const list = document.getElementById('app-review-list');
    list.innerHTML = `<div class="text-center py-10 text-slate-400"><i class="fas fa-spinner fa-spin text-xl text-slate-300 mb-2 block"></i><p class="text-xs">লোড হচ্ছে...</p></div>`;
    try {
      // ✅ একটামাত্র equality where — orderBy নেই, তাই কম্পোজিট ইনডেক্স লাগবে না
      const snap = await firestore.collection('apps').where('status', '==', 'pending').get();
      const apps = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      if (apps.length === 0) {
        list.innerHTML = `<div class="text-center py-10 text-slate-400 text-xs">রিভিউয়ের জন্য কোনো অ্যাপ নেই 🎉</div>`;
        return;
      }
      list.innerHTML = apps.map(a => `
        <div class='bg-white border border-slate-100 rounded-2xl p-3 mb-3'>
          <div class='flex items-center gap-2 mb-2'>
            <div class='w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-xl overflow-hidden shrink-0'>
              ${a.iconBase64 ? `<img loading="lazy" src="${a.iconBase64}" class="w-full h-full object-cover">` : '📦'}
            </div>
            <div class='flex-1 min-w-0'>
              <p class='text-xs font-bold text-slate-800 line-clamp-1'>${escapeHtml(a.name || '')}</p>
              <p class='text-[10px] text-slate-400 line-clamp-1'>${escapeHtml(a.uploaderName || '')} · ${escapeHtml(a.sizeLabel || '')}</p>
            </div>
          </div>
          <p class='text-[10px] text-slate-500 font-mono break-all bg-slate-50 rounded-lg p-2 mb-2'>SHA-256: ${escapeHtml(a.fileHash || 'N/A')}</p>
          <div class='grid grid-cols-3 gap-1.5'>
            <a href='https://www.virustotal.com/gui/file/${encodeURIComponent(a.fileHash || '')}' target='_blank' rel='noopener'
              class='text-center bg-slate-100 text-slate-600 text-[10px] font-bold py-2 rounded-lg active:scale-95 transition'>
              <i class='fas fa-shield-virus'></i> VirusTotal
            </a>
            <button onclick='adminApproveApp("${a.id}")' class='bg-green-500 text-white text-[10px] font-bold py-2 rounded-lg active:scale-95 transition'>
              <i class='fas fa-check'></i> অ্যাপ্রুভ
            </button>
            <button onclick='adminRejectApp("${a.id}")' class='bg-red-500 text-white text-[10px] font-bold py-2 rounded-lg active:scale-95 transition'>
              <i class='fas fa-times'></i> রিজেক্ট
            </button>
          </div>
        </div>
      `).join('');
    } catch (e) {
      list.innerHTML = `<div class="text-center py-10 text-red-400 text-xs">লোড করা যায়নি: ${e.message}</div>`;
    }
  }

  async function adminApproveApp(appId) {
    try {
      await firestore.collection('apps').doc(appId).update({ status: 'verified' });
      showCartToast('✅ অ্যাপ্রুভ করা হয়েছে');
      loadAppReviewQueue();
      loadAppStoreApps();
    } catch (e) {
      showCartToast('❌ ব্যর্থ হয়েছে: ' + e.message);
    }
  }

  async function adminRejectApp(appId) {
    if (!confirm('এই অ্যাপটি স্থায়ীভাবে বাতিল/ডিলিট করতে চান?')) return;
    try {
      const app = _appStoreApps.find(a => a.id === appId);
      if (app && app.apkPath) await storage.ref(app.apkPath).delete().catch(() => {});
      await firestore.collection('apps').doc(appId).delete();
      showCartToast('🗑️ রিজেক্ট করে ডিলিট করা হয়েছে');
      loadAppReviewQueue();
      loadAppStoreApps();
    } catch (e) {
      showCartToast('❌ ব্যর্থ হয়েছে: ' + e.message);
    }
  }

  function filterTejFeed(type) {
    _tejCurrentFilter = type;
    document.querySelectorAll('.tej-filter-btn').forEach(b => {
      b.classList.remove('bg-orange-500', 'text-white');
      b.classList.add('bg-slate-100', 'text-slate-600');
    });
    const active = document.getElementById('tej-filter-' + type);
    if (active) {
      active.classList.add('bg-orange-500', 'text-white');
      active.classList.remove('bg-slate-100', 'text-slate-600');
    }
    loadTejFeed(type);
  }

  function loadTejFeed(type) {
    const list = document.getElementById('tej-feed-list');
    list.innerHTML = `<div class='text-center py-12 text-slate-400'><i class='fas fa-spinner fa-spin text-2xl text-slate-300 mb-3 block'></i><p class='text-xs'>লোড হচ্ছে...</p></div>`;
    if (_tejUnsub) { _tejUnsub(); _tejUnsub = null; }
    if (_tejRefreshTimer) { clearInterval(_tejRefreshTimer); _tejRefreshTimer = null; }
    // ✅ [FIX] where('mediaType') + orderBy('createdAt') কম্বো বাদ দেওয়া হলো — এর জন্য Firestore কম্পোজিট ইনডেক্স লাগতো (public_profiles-এর মতো একই সমস্যা)।
    // এখানে শুধু orderBy দিয়ে পোস্ট আনা হচ্ছে, ক্লায়েন্ট সাইডে mediaType দিয়ে ফিল্টার করা হচ্ছে।
    const q = firestore.collection(TEJ_COLLECTION).orderBy('createdAt', 'desc').limit(60);
    _tejUnsub = q.onSnapshot(snap => {
      _tejLastDocs = snap.docs;
      renderTejFeedList(type);
    }, () => {
      list.innerHTML = `<div class='text-center py-12 text-red-400 text-xs'>ফিড লোড করা যায়নি। আবার চেষ্টা করুন।</div>`;
    });
    // ✅ ফিউচার পোস্টের সময় হলে নতুন কোনো Firestore রাইট না হলেও যাতে অটো-পাবলিক হয়ে যায়, তাই পিরিয়ডিক রি-রেন্ডার
    _tejRefreshTimer = setInterval(() => renderTejFeedList(_tejCurrentFilter), 30000);
  }

  function renderTejFeedList(type) {
    const list = document.getElementById('tej-feed-list');
    const now = Date.now();
    let docs = _tejLastDocs.filter(d => {
      const data = d.data();
      if (data.postCategory === 'future') {
        const pubMs = data.publishAt && data.publishAt.toMillis ? data.publishAt.toMillis() : (data.publishAt ? new Date(data.publishAt).getTime() : null);
        const isPublished = pubMs !== null && pubMs <= now;
        // ✅ ফিউচার পোস্ট যতক্ষণ পাবলিশ টাইম না হয়, ততক্ষণ লেখক ছাড়া কেউ দেখবে না
        if (!isPublished && !(currentUser && data.uid === currentUser.uid)) return false;
      }
      return true;
    });
    if (type !== 'all') {
      const wantType = type === 'post' ? 'text' : type;
      docs = docs.filter(d => d.data().mediaType === wantType);
    }
    // ✅ NEW: নির্দিষ্ট ইউজারের পোস্ট ফিল্টার (অ্যাভাটার ক্লিক)
    if (_tejAuthorFilter) {
      docs = docs.filter(d => d.data().uid === _tejAuthorFilter);
    }
    // ✅ NEW (feature-18): হ্যাশট্যাগ ফিল্টার
    if (_tejHashtagFilter) {
      docs = docs.filter(d => {
        const text = (d.data().text || '').toLowerCase();
        return text.includes('#' + _tejHashtagFilter) || text.includes(_tejHashtagFilter);
      });
    }
    // ✅ ডোনেশন পোস্ট সবার আগে — বাকিগুলো createdAt অনুযায়ী আগের মতোই
    docs = docs.slice().sort((a, b) => {
      const aDon = a.data().postCategory === 'donation' ? 1 : 0;
      const bDon = b.data().postCategory === 'donation' ? 1 : 0;
      return bDon - aDon;
    });
    if (docs.length === 0) {
      const emptyMsg = _tejAuthorFilter
        ? `<div class='text-center py-12 text-slate-400'><i class='fas fa-user text-3xl text-slate-200 mb-3 block'></i><p class='text-xs font-bold'>এই ইউজারের কোনো পোস্ট নেই</p></div>`
        : (_tejHashtagFilter
        ? `<div class='text-center py-12 text-slate-400'><i class='fas fa-hashtag text-3xl text-slate-200 mb-3 block'></i><p class='text-xs font-bold'>#${_tejHashtagFilter} — কোনো পোস্ট নেই</p><p class='text-[10px] mt-1'>অন্য হ্যাশট্যাগ খুঁজে দেখুন</p></div>`
        : `<div class='text-center py-12 text-slate-400'><i class='fas fa-wind text-3xl text-slate-300 mb-3 block'></i><p class='text-xs font-bold'>এখনো কোনো পোস্ট নেই</p><p class='text-[10px] mt-1'>প্রথম পোস্টটি আপনিই করুন!</p></div>`);
      list.innerHTML = emptyMsg;
      return;
    }
    list.innerHTML = docs.map(doc => renderTejCard(doc.id, doc.data())).join('');
  }

  // ✅ NEW: প্রোফাইল পিকচারে ক্লিক করলে শুধু সেই ইউজারের পোস্ট দেখাও (Tej ফিড পোস্ট কার্ড থেকে কল হয়)
  function filterTejByAuthor(uid, name, photo) {
    _tejAuthorFilter = uid;
    // হ্যাশট্যাগ ফিল্টার সাথে কনফ্লিক্ট এড়াতে ক্লিয়ার করে দাও
    _tejHashtagFilter = null;
    const hs = document.getElementById('tej-hashtag-search');
    if (hs) hs.value = '';
    document.getElementById('tej-hashtag-clear')?.classList.add('hidden');

    const bar = document.getElementById('tej-author-filter-bar');
    if (bar) bar.classList.remove('hidden');
    const nameEl = document.getElementById('tej-author-filter-name');
    if (nameEl) nameEl.textContent = name || 'এই ইউজারের';
    const avatarEl = document.getElementById('tej-author-filter-avatar');
    if (avatarEl) avatarEl.src = photo || 'https://placehold.co/40x40/f1f5f9/64748b?text=?';

    renderTejFeedList(_tejCurrentFilter);
    document.getElementById('tej-feed-list')?.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function clearTejAuthorFilter() {
    _tejAuthorFilter = null;
    document.getElementById('tej-author-filter-bar')?.classList.add('hidden');
    renderTejFeedList(_tejCurrentFilter);
  }

  // ============================================================
  // ✅ NEW: শর্ট ভিডিও — পূর্ণ স্ক্রিন ভার্টিক্যাল স্ক্রল ভিডিও ফিড (Reels-style)
  // tej_posts কালেকশনের mediaType==='video' পোস্টগুলোই এখানে ব্যবহার হয় — নতুন কোনো
  // কালেকশন/Rules লাগে না, যা ইতিমধ্যে লোড হওয়া _tejLastDocs থেকেই ফিল্টার করা হয়।
  // ============================================================
  let _tejShortsObserver = null;

  function openTejShorts() {
    if (!currentUser) { alert(t('loginFirstAlert')); return; }
    const modal = document.getElementById('tej-shorts-modal');
    const scroll = document.getElementById('tej-shorts-scroll');
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    renderTejShortsList();
    scroll.scrollTop = 0;
  }

  function closeTejShorts() {
    const modal = document.getElementById('tej-shorts-modal');
    modal.classList.add('hidden');
    document.body.style.overflow = 'auto';
    // সব ভিডিও থামিয়ে দাও যাতে ব্যাকগ্রাউন্ডে বাজতে না থাকে
    document.querySelectorAll('#tej-shorts-scroll video').forEach(v => { v.pause(); });
    if (_tejShortsObserver) { _tejShortsObserver.disconnect(); _tejShortsObserver = null; }
  }

  function renderTejShortsList() {
    const scroll = document.getElementById('tej-shorts-scroll');
    const now = Date.now();
    let videos = _tejLastDocs.filter(d => {
      const data = d.data();
      if (data.mediaType !== 'video' || !data.mediaData) return false;
      if (data.postCategory === 'future') {
        const pubMs = data.publishAt && data.publishAt.toMillis ? data.publishAt.toMillis() : (data.publishAt ? new Date(data.publishAt).getTime() : null);
        const isPublished = pubMs !== null && pubMs <= now;
        if (!isPublished && !(currentUser && data.uid === currentUser.uid)) return false;
      }
      return true;
    });

    if (videos.length === 0) {
      scroll.innerHTML = `<div class='w-full h-full flex flex-col items-center justify-center text-center px-6'>
        <i class='fas fa-clapperboard text-4xl text-white/20 mb-3'></i>
        <p class='text-white/60 text-xs font-bold'>এখনো কোনো শর্ট ভিডিও নেই</p>
        <p class='text-white/30 text-[10px] mt-1'>Tej ফিডে ভিডিও পোস্ট করলে এখানে দেখা যাবে</p>
      </div>`;
      return;
    }

    scroll.innerHTML = videos.map(doc => renderTejShortCard(doc.id, doc.data())).join('');

    // ✅ IntersectionObserver দিয়ে স্ক্রিনে যেটা দেখা যাচ্ছে শুধু সেটাই অটো-প্লে হবে, বাকিগুলো পজ
    if (_tejShortsObserver) _tejShortsObserver.disconnect();
    _tejShortsObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        const video = entry.target.querySelector('video');
        if (!video) return;
        if (entry.isIntersecting && entry.intersectionRatio >= 0.6) {
          video.play().catch(() => {});
        } else {
          video.pause();
        }
      });
    }, { root: scroll, threshold: [0, 0.6, 1] });

    scroll.querySelectorAll('.tej-short-slide').forEach(slide => _tejShortsObserver.observe(slide));
  }

  function renderTejShortCard(id, d) {
    const isLiked = currentUser && (d.likedBy || []).includes(currentUser.uid);
    const likes = d.likes || 0;
    const comments = d.commentCount || 0;
    const avatar = d.userPhoto
      ? `<img loading="lazy" src='${d.userPhoto}' class='w-9 h-9 rounded-full object-cover border-2 border-white/40' onerror="this.src=''">`
      : `<div class='w-9 h-9 rounded-full bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center text-white font-black text-sm border-2 border-white/40'>${(d.userName||'?')[0]}</div>`;
    return `<div class='tej-short-slide w-full h-full snap-start relative flex items-end' style='scroll-snap-stop:always'>
      <video src='${d.mediaData}' class='absolute inset-0 w-full h-full object-cover bg-black' loop playsinline muted onclick="this.muted=!this.muted"></video>
      <div class='absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none h-1/2'></div>
      <div class='relative z-10 w-full p-4 pb-6 flex items-end justify-between gap-3'>
        <div class='flex-1 min-w-0'>
          <div class='flex items-center gap-2 mb-1.5 cursor-pointer' onclick="closeTejShorts(); openUserProfileDetail('${d.uid}');">
            ${avatar}
            <span class='text-white font-black text-xs truncate'>${escapeHtml(d.userName || 'অজানা')}</span>
          </div>
          ${d.text ? `<p class='text-white text-xs leading-relaxed line-clamp-2'>${escapeHtml(d.text)}</p>` : ''}
        </div>
        <div class='shrink-0 flex flex-col items-center gap-3.5'>
          <button onclick='toggleTejLike("${id}")' class='flex flex-col items-center gap-0.5 ${isLiked ? 'text-red-500' : 'text-white'}'>
            <i class='${isLiked ? 'fas' : 'far'} fa-heart text-xl drop-shadow'></i>
            <span class='text-[10px] font-bold drop-shadow'>${likes}</span>
          </button>
          <button onclick='closeTejShorts(); openTejView("${id}");' class='flex flex-col items-center gap-0.5 text-white'>
            <i class='far fa-comment text-xl drop-shadow'></i>
            <span class='text-[10px] font-bold drop-shadow'>${comments}</span>
          </button>
          <button onclick='shareTejPost("${id}", "${(d.text||'').replace(/"/g,"'").substring(0,40)}")' class='flex flex-col items-center gap-0.5 text-white'>
            <i class='fas fa-share text-lg drop-shadow'></i>
          </button>
        </div>
      </div>
    </div>`;
  }

  function renderTejCard(id, d) {
    const avatar = d.userPhoto ? `<img loading="lazy" src='${d.userPhoto}' class='w-9 h-9 rounded-full object-cover bg-slate-200' onerror="this.src=''">` : `<div class='w-9 h-9 rounded-full bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center text-white font-black text-sm'>${(d.userName||'?')[0]}</div>`;
    const timeStr = d.createdAt ? tejTimeAgo(d.createdAt.toDate ? d.createdAt.toDate() : new Date(d.createdAt)) : '';
    let mediaHtml = '';
    if (d.mediaType === 'image' && d.mediaData) {
      mediaHtml = `<div class='mt-2.5 -mx-1 cursor-pointer' onclick='openTejView("${id}")'><img src='${d.mediaData}' class='w-full rounded-xl object-cover max-h-64' loading='lazy'></div>`;
    } else if (d.mediaType === 'video' && d.mediaData) {
      mediaHtml = `<div class='mt-2.5 -mx-1'><video src='${d.mediaData}' class='w-full rounded-xl max-h-64' controls preload='metadata' playsinline></video></div>`;
    }
    const likes = d.likes || 0;
    const comments = d.commentCount || 0;
    const isLiked = currentUser && (d.likedBy || []).includes(currentUser.uid);

    // ✅ NEW (feature-18): পোস্ট টেক্সটে হ্যাশট্যাগ হাইলাইট করো + ক্লিকেবল
    // ✅ [BUG12 FIX] escapeHtml আগে না করায় পোস্ট ক্যাপশনে HTML/script ইনজেক্ট করে
    // তেজ ফিডের সব ভিউয়ারের ব্রাউজারে রান করানো যেত (stored XSS) — এখন আগে escape করে
    // তারপর হ্যাশট্যাগ হাইলাইট বসানো হচ্ছে।
    let displayText = '';
    if (d.text) {
      displayText = escapeHtml(d.text).replace(/(#[\u0980-\u09FF\w]+)/g, (match) =>
        `<button onclick="searchTejHashtagFromFeed('${match.slice(1).toLowerCase()}')" class='text-orange-500 font-bold hover:underline'>${match}</button>`
      );
    }

    // ✅ ডোনেশন পোস্ট রিবন / ফিউচার পোস্টের (শুধু লেখকের জন্য) শিডিউল ব্যাজ
    const isDonation = d.postCategory === 'donation';
    let pubMs = null;
    if (d.postCategory === 'future' && d.publishAt) {
      pubMs = d.publishAt.toMillis ? d.publishAt.toMillis() : new Date(d.publishAt).getTime();
    }
    const isPendingFuture = pubMs !== null && pubMs > Date.now();
    let topBadgeHtml = '';
    if (isDonation) {
      topBadgeHtml = `<div class='-mx-4 -mt-4 mb-2.5 px-4 py-1.5 bg-gradient-to-r from-rose-500 to-pink-500 text-white text-[10px] font-black rounded-t-2xl flex items-center gap-1.5'><i class='fas fa-hand-holding-heart'></i> ডোনেশন পোস্ট</div>`;
    } else if (isPendingFuture) {
      const dateLabel = new Date(pubMs).toLocaleString('bn-BD', { day:'numeric', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' });
      topBadgeHtml = `<div class='-mx-4 -mt-4 mb-2.5 px-4 py-1.5 bg-gradient-to-r from-amber-400 to-orange-400 text-white text-[10px] font-black rounded-t-2xl flex items-center gap-1.5'><i class='fas fa-clock'></i> ফিউচার পোস্ট • পাবলিক হবে: ${dateLabel}</div>`;
    }
    const cardBorderClass = isDonation ? 'border-rose-200' : (isPendingFuture ? 'border-amber-200' : 'border-slate-100');

    return `<div class='bg-white rounded-2xl shadow-sm border ${cardBorderClass} p-4 mb-0'>
      ${topBadgeHtml}
      <div class='flex items-center gap-2.5 mb-2'>
        <div class='flex items-center gap-2.5 flex-1 min-w-0 cursor-pointer' onclick="openUserProfileDetail('${d.uid}')">
          ${avatar}
          <div class='flex-1 min-w-0'>
            <p class='font-black text-xs text-slate-800 truncate'>${escapeHtml(d.userName) || 'অজানা'}</p>
            <p class='text-[10px] text-slate-400'>${timeStr}</p>
          </div>
        </div>
        ${currentUser && d.uid === currentUser.uid ? `<button onclick='deleteTejPost("${id}")' class='w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 transition'><i class='fas fa-trash text-[10px]'></i></button>` : ''}
      </div>
      ${displayText ? `<p class='text-sm text-slate-700 leading-relaxed mb-1'>${displayText}</p>` : ''}
      ${mediaHtml}
      <div class='flex items-center gap-3 mt-3 pt-3 border-t border-slate-50'>
        <button onclick='toggleTejLike("${id}")' class='flex items-center gap-1.5 text-[11px] font-bold ${isLiked ? 'text-red-500' : 'text-slate-400 hover:text-red-500'} transition'>
          <i class='${isLiked ? 'fas' : 'far'} fa-heart'></i> ${likes}
        </button>
        <button onclick='openTejView("${id}")' class='flex items-center gap-1.5 text-[11px] font-bold text-slate-400 hover:text-blue-500 transition'>
          <i class='far fa-comment'></i> ${comments}
        </button>
        <button onclick='shareTejPost("${id}", "${(d.text||'').replace(/"/g,"'").substring(0,40)}")' class='flex items-center gap-1.5 text-[11px] font-bold text-slate-400 hover:text-green-500 transition ml-auto'>
          <i class='fas fa-share text-[10px]'></i> শেয়ার
        </button>
      </div>
    </div>`;
  }

  function searchTejHashtagFromFeed(tag) {
    const inp = document.getElementById('tej-hashtag-search');
    if (inp) { inp.value = '#' + tag; }
    _tejHashtagFilter = tag;
    document.getElementById('tej-hashtag-clear')?.classList.remove('hidden');
    renderTejFeedList(_tejCurrentFilter);
    // উপরে স্ক্রোল
    document.getElementById('tej-feed-list')?.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function tejTimeAgo(date) {
    const diff = Math.floor((Date.now() - date.getTime()) / 1000);
    if (diff < 60) return 'এইমাত্র';
    if (diff < 3600) return Math.floor(diff/60) + ' মিনিট আগে';
    if (diff < 86400) return Math.floor(diff/3600) + ' ঘণ্টা আগে';
    return Math.floor(diff/86400) + ' দিন আগে';
  }

  // ============================================================
  // ✅ NEW (feature-18): STORY / STATUS SYSTEM — ২৪ঘণ্টা অটো ডিলিট
  // ============================================================
  const TEJ_STORIES_COLLECTION = 'tej_stories';
  let _tejStoryMediaBase64 = null;
  let _tejStoryMediaMime = null;
  let _tejStoryViewList = [];
  let _tejStoryViewIndex = 0;
  let _tejStoryProgressTimer = null;
  let _tejStoryUnsub = null;

  function openTejStoryCreate() {
    if (!currentUser) { showCartToast('⚠️ স্টোরি দিতে লগইন করুন'); return; }
    _tejStoryMediaBase64 = null;
    _tejStoryMediaMime = null;
    document.getElementById('tej-story-text').value = '';
    document.getElementById('tej-story-text-count').textContent = '0';
    document.getElementById('tej-story-preview-img').classList.add('hidden');
    document.getElementById('tej-story-preview-video').classList.add('hidden');
    document.getElementById('tej-story-media-preview').classList.add('hidden');
    document.getElementById('tej-story-upload-icon').classList.remove('hidden');
    document.getElementById('tej-story-upload-hint').textContent = 'ক্লিক করে ছবি/ভিডিও সিলেক্ট করুন';
    const btn = document.getElementById('tej-story-submit-btn');
    btn.disabled = false;
    btn.innerHTML = `<i class='fas fa-circle-play'></i> স্টোরি শেয়ার করুন`;
    document.getElementById('tej-story-create-modal').classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    // character counter
    const ta = document.getElementById('tej-story-text');
    ta.oninput = () => document.getElementById('tej-story-text-count').textContent = ta.value.length;
  }

  function closeTejStoryCreate() {
    document.getElementById('tej-story-create-modal').classList.add('hidden');
  }

  function handleTejStoryMedia(input) {
    const file = input.files[0];
    if (!file) return;
    const isVideo = file.type.startsWith('video');
    const maxMB = isVideo ? 15 : 5;
    if (file.size > maxMB * 1024 * 1024) { showCartToast(`⚠️ ফাইল ${maxMB}MB-এর বেশি হওয়া যাবে না`); return; }
    const reader = new FileReader();
    reader.onload = e => {
      _tejStoryMediaBase64 = e.target.result;
      _tejStoryMediaMime = file.type;
      document.getElementById('tej-story-upload-icon').classList.add('hidden');
      document.getElementById('tej-story-upload-hint').textContent = file.name;
      document.getElementById('tej-story-media-preview').classList.remove('hidden');
      if (isVideo) {
        document.getElementById('tej-story-preview-video').src = _tejStoryMediaBase64;
        document.getElementById('tej-story-preview-video').classList.remove('hidden');
      } else {
        document.getElementById('tej-story-preview-img').src = _tejStoryMediaBase64;
        document.getElementById('tej-story-preview-img').classList.remove('hidden');
      }
    };
    reader.readAsDataURL(file);
  }

  async function submitTejStory() {
    const text = document.getElementById('tej-story-text').value.trim();
    if (!text && !_tejStoryMediaBase64) { showCartToast('⚠️ ছবি বা টেক্সট যেকোনো একটি দিন'); return; }
    const btn = document.getElementById('tej-story-submit-btn');
    btn.disabled = true;
    btn.innerHTML = `<i class='fas fa-spinner fa-spin mr-2'></i> আপলোড হচ্ছে...`;
    try {
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
      let mediaType = 'text';
      if (_tejStoryMediaBase64) {
        mediaType = _tejStoryMediaMime && _tejStoryMediaMime.startsWith('video') ? 'video' : 'image';
      }
      await firestore.collection(TEJ_STORIES_COLLECTION).add({
        uid: currentUser.uid,
        userName: currentUser.displayName || 'অজানা',
        userPhoto: currentUser.photoURL || '',
        text: text || '',
        mediaType,
        mediaData: _tejStoryMediaBase64 || null,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        expiresAt: firebase.firestore.Timestamp.fromDate(expiresAt),
        viewedBy: []
      });
      showCartToast('✅ স্টোরি শেয়ার হয়েছে! ২৪ ঘণ্টা পর মুছে যাবে।');
      closeTejStoryCreate();
      loadTejStories();
    } catch(e) {
      showCartToast('❌ স্টোরি শেয়ার করা যায়নি');
      btn.disabled = false;
      btn.innerHTML = `<i class='fas fa-circle-play'></i> স্টোরি শেয়ার করুন`;
    }
  }

  function loadTejStories() {
    if (_tejStoryUnsub) { _tejStoryUnsub(); _tejStoryUnsub = null; }
    const cutoff = firebase.firestore.Timestamp.fromDate(new Date(Date.now() - 24 * 60 * 60 * 1000));
    const q = firestore.collection(TEJ_STORIES_COLLECTION)
      .where('createdAt', '>', cutoff)
      .orderBy('createdAt', 'desc')
      .limit(30);
    _tejStoryUnsub = q.onSnapshot(snap => {
      const stories = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      renderTejStoryRow(stories);
    }, () => {});
  }

  function renderTejStoryRow(stories) {
    const myStory = stories.find(s => currentUser && s.uid === currentUser.uid);
    const myThumb = document.getElementById('tej-my-story-thumb');
    const myImg = document.getElementById('tej-my-story-img');
    if (myStory && myStory.mediaType === 'image' && myStory.mediaData) {
      myImg.src = myStory.mediaData;
      myThumb.classList.remove('hidden');
    } else {
      myThumb.classList.add('hidden');
    }

    // অন্যদের স্টোরি — uid অনুযায়ী গ্রুপ করো
    const byUser = {};
    stories.forEach(s => {
      if (!byUser[s.uid]) byUser[s.uid] = [];
      byUser[s.uid].push(s);
    });
    const othersEl = document.getElementById('tej-others-stories');
    if (!othersEl) return;
    const otherUids = Object.keys(byUser).filter(uid => uid !== (currentUser?.uid));
    if (otherUids.length === 0) { othersEl.innerHTML = ''; return; }
    othersEl.innerHTML = otherUids.map(uid => {
      const userStories = byUser[uid];
      const first = userStories[0];
      const hasNew = !currentUser || !(first.viewedBy || []).includes(currentUser.uid);
      const ringColor = hasNew ? 'from-orange-400 to-pink-500' : 'from-slate-300 to-slate-400';
      const avatar = first.userPhoto
        ? `<img loading="lazy" src='${first.userPhoto}' class='w-full h-full object-cover'>`
        : `<div class='w-full h-full bg-gradient-to-br from-slate-400 to-slate-500 flex items-center justify-center text-white font-black text-xs'>${escapeHtml((first.userName||'?')[0])}</div>`;
      const bgMedia = (first.mediaType === 'image' && first.mediaData)
        ? `<img loading="lazy" src='${first.mediaData}' class='w-full h-full object-cover'>`
        : `<div class='w-full h-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center p-2'><p class='text-white text-[10px] font-bold text-center leading-snug line-clamp-5'>${escapeHtml(first.text||'')}</p></div>`;
      return `<div class='shrink-0 w-24 h-40 relative cursor-pointer' onclick='openTejStoryView(${JSON.stringify(userStories.map(s=>s.id))})'>
        <!-- অ্যাভাটার রিং — কার্ডের উপরের বর্ডার থেকে peek করছে (কার্ডের overflow-hidden-এর বাইরে) -->
        <div class='absolute -top-1.5 left-1.5 z-10 w-8 h-8 rounded-full p-[2px] bg-gradient-to-br ${ringColor} shadow'>
          <div class='w-full h-full rounded-full overflow-hidden border-2 border-white'>${avatar}</div>
        </div>
        <!-- কার্ড বডি — ছবি/টেক্সট ব্যাকগ্রাউন্ড + নিচে গ্র্যাডিয়েন্ট + নাম -->
        <div class='w-full h-full rounded-xl overflow-hidden shadow-sm relative'>
          ${bgMedia}
          <div class='absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-black/70 to-transparent'></div>
          <p class='absolute bottom-1.5 left-1.5 right-1.5 text-white text-[10px] font-bold truncate drop-shadow'>${escapeHtml(first.userName||'')}</p>
        </div>
      </div>`;
    }).join('');
  }

  function openTejStoryView(storyIds) {
    if (!Array.isArray(storyIds) || storyIds.length === 0) return;
    // storyIds হলো string array — Firestore থেকে fetch করব
    Promise.all(storyIds.map(id => firestore.collection(TEJ_STORIES_COLLECTION).doc(id).get()))
      .then(snaps => {
        _tejStoryViewList = snaps.filter(s => s.exists).map(s => ({ id: s.id, ...s.data() }));
        _tejStoryViewIndex = 0;
        if (_tejStoryViewList.length === 0) return;
        document.getElementById('tej-story-view-modal').classList.remove('hidden');
        document.body.style.overflow = 'hidden';
        _showTejStoryAt(0);
      });
  }

  function _showTejStoryAt(idx) {
    if (idx >= _tejStoryViewList.length) { closeTejStoryView(); return; }
    _tejStoryViewIndex = idx;
    if (_tejStoryProgressTimer) clearInterval(_tejStoryProgressTimer);
    const story = _tejStoryViewList[idx];
    // মার্ক as viewed
    if (currentUser && !(story.viewedBy || []).includes(currentUser.uid)) {
      firestore.collection(TEJ_STORIES_COLLECTION).doc(story.id).update({
        viewedBy: firebase.firestore.FieldValue.arrayUnion(currentUser.uid)
      }).catch(() => {});
    }
    // UI আপডেট
    document.getElementById('tej-story-view-name').textContent = story.userName || 'অজানা';
    const timeEl = document.getElementById('tej-story-view-time');
    timeEl.textContent = story.createdAt ? tejTimeAgo(story.createdAt.toDate ? story.createdAt.toDate() : new Date(story.createdAt)) : '';
    // avatar
    const avWrap = document.getElementById('tej-story-view-avatar-wrap');
    avWrap.innerHTML = story.userPhoto
      ? `<img loading="lazy" src='${story.userPhoto}' class='w-full h-full object-cover'>`
      : `<div class='w-full h-full bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center text-white font-black text-xs'>${(story.userName||'?')[0]}</div>`;
    // মিডিয়া
    const img = document.getElementById('tej-story-view-img');
    const vid = document.getElementById('tej-story-view-video');
    const textCard = document.getElementById('tej-story-view-text-card');
    img.classList.add('hidden'); vid.classList.add('hidden'); textCard.classList.add('hidden');
    if (story.mediaType === 'image' && story.mediaData) {
      img.src = story.mediaData; img.classList.remove('hidden');
    } else if (story.mediaType === 'video' && story.mediaData) {
      vid.src = story.mediaData; vid.classList.remove('hidden'); vid.play().catch(()=>{});
    } else {
      textCard.classList.remove('hidden');
      document.getElementById('tej-story-view-text').textContent = story.text || '';
    }
    // ক্যাপশন (ইমেজ/ভিডিওতে টেক্সট থাকলে)
    const capWrap = document.getElementById('tej-story-view-caption');
    const capText = document.getElementById('tej-story-view-caption-text');
    if (story.text && story.mediaType !== 'text') {
      capText.textContent = story.text;
      capWrap.classList.remove('hidden');
    } else {
      capWrap.classList.add('hidden');
    }
    // প্রগ্রেস বার — ৫ সেকেন্ড
    const bar = document.getElementById('tej-story-progress-bar');
    bar.style.transition = 'none'; bar.style.width = '0%';
    const duration = 5000;
    setTimeout(() => {
      bar.style.transition = `width ${duration}ms linear`;
      bar.style.width = '100%';
    }, 50);
    _tejStoryProgressTimer = setTimeout(() => advanceTejStory(), duration);
  }

  function advanceTejStory() {
    _showTejStoryAt(_tejStoryViewIndex + 1);
  }

  function closeTejStoryView() {
    if (_tejStoryProgressTimer) clearInterval(_tejStoryProgressTimer);
    document.getElementById('tej-story-view-modal').classList.add('hidden');
    const vid = document.getElementById('tej-story-view-video');
    vid.pause(); vid.src = '';
    _tejStoryViewList = [];
  }

  // ============================================================
  // ✅ NEW (feature-18): HASHTAG SYSTEM
  // ============================================================
  const _COMMON_HASHTAGS = ['#ভ্রমণ','#খাবার','#প্রকৃতি','#ব্যবসা','#প্রযুক্তি','#শিক্ষা','#খেলাধুলা','#বিনোদন','#সংস্কৃতি','#স্বাস্থ্য'];
  let _tejHashtagFilter = null;

  // পোস্ট টেক্সট থেকে হ্যাশট্যাগ বের করা
  function extractHashtags(text) {
    const matches = text.match(/#[\u0980-\u09FF\w]+/g) || [];
    return [...new Set(matches.map(h => h.toLowerCase()))].slice(0, 10);
  }

  // create পোস্টে টেক্সট টাইপ করলে হ্যাশট্যাগ চিপ দেখাও
  function onTejPostTextInput(ta) {
    const text = ta.value;
    const tags = extractHashtags(text);
    const chips = document.getElementById('tej-hashtag-chips');
    if (!chips) return;
    if (tags.length > 0) {
      chips.innerHTML = tags.map(tag =>
        `<span class='inline-flex items-center gap-1 text-[10px] font-bold bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full'><i class='fas fa-hashtag text-[8px]'></i>${tag.slice(1)}</span>`
      ).join('');
    } else {
      // সাজেস্টেড ট্যাগ দেখাও
      chips.innerHTML = `<span class='text-[10px] text-slate-400 mr-1'>জনপ্রিয়:</span>` +
        _COMMON_HASHTAGS.slice(0, 5).map(tag =>
          `<button type='button' onclick='insertTejHashtag("${tag}")' class='text-[10px] font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full hover:bg-orange-100 hover:text-orange-600 transition'>${tag}</button>`
        ).join('');
    }
  }

  function insertTejHashtag(tag) {
    const ta = document.getElementById('tej-post-text');
    if (!ta) return;
    const val = ta.value;
    ta.value = val + (val.endsWith(' ') || val === '' ? '' : ' ') + tag + ' ';
    ta.focus();
    onTejPostTextInput(ta);
  }

  // ফিড-এ হ্যাশট্যাগ সার্চ
  function handleTejHashtagSearch(val) {
    const clearBtn = document.getElementById('tej-hashtag-clear');
    if (val.trim()) {
      clearBtn.classList.remove('hidden');
      const query = val.trim().toLowerCase().replace(/^#/, '');
      _tejHashtagFilter = query;
      renderTejFeedList(_tejCurrentFilter); // ক্লায়েন্ট সাইড ফিল্টার
    } else {
      clearBtn.classList.add('hidden');
      _tejHashtagFilter = null;
      renderTejFeedList(_tejCurrentFilter);
    }
  }

  function clearTejHashtagSearch() {
    document.getElementById('tej-hashtag-search').value = '';
    document.getElementById('tej-hashtag-clear').classList.add('hidden');
    _tejHashtagFilter = null;
    renderTejFeedList(_tejCurrentFilter);
  }

  // ============================================================
  // ✅ NEW (feature-18): NOTIFICATION SYSTEM
  // ============================================================
  const TEJ_NOTIF_COLLECTION = 'tej_notifications';
  let _tejNotifUnsub = null;

  function _startTejNotifListener() {
    if (!currentUser) return;
    if (_tejNotifUnsub) return; // ইতিমধ্যে চলছে
    const q = firestore.collection(TEJ_NOTIF_COLLECTION)
      .where('toUid', '==', currentUser.uid)
      .where('isRead', '==', false)
      .limit(99);
    _tejNotifUnsub = q.onSnapshot(snap => {
      const count = snap.size;
      const badge = document.getElementById('tej-notif-badge');
      if (!badge) return;
      if (count > 0) {
        badge.textContent = count > 9 ? '9+' : count;
        badge.classList.remove('hidden');
      } else {
        badge.classList.add('hidden');
      }
    }, () => {});
  }

  async function _sendTejNotif(toUid, type, fromName, fromPhoto, postId, postText) {
    if (!currentUser || toUid === currentUser.uid) return; // নিজেকে নোটিফ পাঠাবো না
    try {
      await firestore.collection(TEJ_NOTIF_COLLECTION).add({
        toUid,
        fromUid: currentUser.uid,
        fromName: fromName || currentUser.displayName || 'কেউ',
        fromPhoto: fromPhoto || currentUser.photoURL || '',
        type, // 'like' | 'comment'
        postId,
        postText: (postText || '').substring(0, 60),
        isRead: false,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    } catch(e) {}
  }

  async function openTejNotifPanel() {
    if (!currentUser) { showCartToast('⚠️ নোটিফিকেশন দেখতে লগইন করুন'); return; }
    document.getElementById('tej-notif-panel').classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    const listEl = document.getElementById('tej-notif-list');
    listEl.innerHTML = `<div class='text-center py-12 text-slate-400'><i class='fas fa-spinner fa-spin text-2xl text-slate-300 mb-3 block'></i><p class='text-xs'>লোড হচ্ছে...</p></div>`;
    try {
      const snap = await firestore.collection(TEJ_NOTIF_COLLECTION)
        .where('toUid', '==', currentUser.uid)
        .orderBy('createdAt', 'desc')
        .limit(40)
        .get();
      if (snap.empty) {
        listEl.innerHTML = `<div class='text-center py-12 text-slate-400'><i class='fas fa-bell-slash text-3xl text-slate-200 mb-3 block'></i><p class='text-xs font-bold'>কোনো নোটিফিকেশন নেই</p></div>`;
        return;
      }
      listEl.innerHTML = snap.docs.map(d => {
        const n = d.data();
        const av = n.fromPhoto
          ? `<img loading="lazy" src='${n.fromPhoto}' class='w-10 h-10 rounded-full object-cover shrink-0'>`
          : `<div class='w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center text-white font-black text-sm shrink-0'>${(n.fromName||'?')[0]}</div>`;
        const icon = n.type === 'like' ? `<i class='fas fa-heart text-red-500 text-[9px]'></i>` : `<i class='fas fa-comment text-blue-500 text-[9px]'></i>`;
        const verb = n.type === 'like' ? 'লাইক দিয়েছে' : 'কমেন্ট করেছে';
        const timeStr = n.createdAt ? tejTimeAgo(n.createdAt.toDate ? n.createdAt.toDate() : new Date(n.createdAt)) : '';
        const bgClass = n.isRead ? 'bg-white' : 'bg-orange-50';
        return `<div class='${bgClass} border-b border-slate-50 px-4 py-3 flex items-start gap-3 cursor-pointer hover:bg-slate-50 transition' onclick='_openTejPostFromNotif("${d.id}","${n.postId}")'>
          <div class='relative shrink-0'>
            ${av}
            <span class='absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-white flex items-center justify-center'>${icon}</span>
          </div>
          <div class='flex-1 min-w-0'>
            <p class='text-xs text-slate-700 leading-relaxed'><span class='font-black'>${escapeHtml(n.fromName||'')}</span> আপনার পোস্টে ${verb}</p>
            ${n.postText ? `<p class='text-[10px] text-slate-400 mt-0.5 truncate'>"${escapeHtml(n.postText)}"</p>` : ''}
            <p class='text-[10px] text-slate-300 mt-1'>${timeStr}</p>
          </div>
          ${!n.isRead ? `<span class='w-2 h-2 rounded-full bg-orange-500 shrink-0 mt-1.5'></span>` : ''}
        </div>`;
      }).join('');
    } catch(e) {
      listEl.innerHTML = `<div class='text-center py-8 text-red-400 text-xs'>লোড করা যায়নি</div>`;
    }
  }

  async function _openTejPostFromNotif(notifId, postId) {
    // মার্ক as read
    firestore.collection(TEJ_NOTIF_COLLECTION).doc(notifId).update({ isRead: true }).catch(()=>{});
    closeTejNotifPanel();
    if (postId) openTejView(postId);
  }

  async function markAllTejNotifsRead() {
    if (!currentUser) return;
    const snap = await firestore.collection(TEJ_NOTIF_COLLECTION)
      .where('toUid', '==', currentUser.uid)
      .where('isRead', '==', false)
      .get();
    const batch = firestore.batch();
    snap.docs.forEach(d => batch.update(d.ref, { isRead: true }));
    await batch.commit().catch(()=>{});
    openTejNotifPanel(); // রিফ্রেশ
  }

  function closeTejNotifPanel() {
    document.getElementById('tej-notif-panel').classList.add('hidden');
  }

  function openTejCreatePost() {
    if (!currentUser) { showCartToast('⚠️ পোস্ট করতে আগে লগইন করুন'); return; }
    const modal = document.getElementById('tej-create-modal');
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    document.getElementById('tej-create-avatar').src = currentUser.photoURL || '';
    document.getElementById('tej-create-name').innerText = currentUser.displayName || 'আপনার নাম';
    document.getElementById('tej-post-text').value = '';
    document.getElementById('tej-future-date').value = '';
    document.getElementById('tej-future-time').value = '';
    _tejMediaBase64 = null;
    _tejMediaMime = null;
    _tejMediaFile = null;
    switchTejPostType('post');
  }

  function closeTejCreate() {
    document.getElementById('tej-create-modal').classList.add('hidden');
  }

  // ✅ NEW (feature-37): "লাইভ" বাটনের অপশন শিট — লাইভ স্ট্রিম / শর্ট ভিডিও তৈরি
  function openTejLiveOptions() {
    if (!currentUser) { showCartToast('⚠️ লাইভ বা ভিডিও পোস্ট করতে আগে লগইন করুন'); return; }
    document.getElementById('tej-live-options-sheet').classList.remove('hidden');
  }

  function closeTejLiveOptions() {
    document.getElementById('tej-live-options-sheet').classList.add('hidden');
  }

  // ✅ NEW (feature-37): শর্ট ভিডিও অপশন বাছাই করলে — পোস্ট ক্রিয়েট মডাল সরাসরি "ভিডিও" ট্যাবে খোলে
  function openTejShortVideoCreate() {
    openTejCreatePost();
    switchTejPostType('video');
  }

  function switchTejPostType(type) {
    _tejCurrentPostType = type;
    document.querySelectorAll('.tej-type-tab').forEach(t => {
      t.classList.remove('text-orange-500', 'border-orange-500');
      t.classList.add('text-slate-400', 'border-transparent');
    });
    const active = document.getElementById('tej-type-' + type);
    if (active) {
      active.classList.add('text-orange-500', 'border-orange-500');
      active.classList.remove('text-slate-400', 'border-transparent');
    }
    const mediaArea = document.getElementById('tej-media-upload-area');
    const hint = document.getElementById('tej-upload-hint');
    const mediaInput = document.getElementById('tej-media-input');
    const scheduleWrap = document.getElementById('tej-future-schedule-wrap');

    if (type === 'post') {
      mediaArea.classList.add('hidden');
    } else {
      mediaArea.classList.remove('hidden');
      if (type === 'image') {
        hint.innerText = 'ছবি সিলেক্ট করুন';
        mediaInput.accept = 'image/*';
      } else if (type === 'video') {
        hint.innerText = 'ভিডিও সিলেক্ট করুন';
        mediaInput.accept = 'video/*';
      } else { // future, donation — ছবি অথবা ভিডিও যেকোনো একটি ঐচ্ছিক
        hint.innerText = 'ছবি/ভিডিও যুক্ত করুন (ঐচ্ছিক)';
        mediaInput.accept = 'image/*,video/*';
      }
    }

    // ✅ ফিউচার পোস্ট — তারিখ/সময় শিডিউলার দেখানো + স্মার্ট ডিফল্ট (এখন থেকে ১ ঘণ্টা পরে)
    if (type === 'future') {
      scheduleWrap.classList.remove('hidden');
      const dateInput = document.getElementById('tej-future-date');
      const timeInput = document.getElementById('tej-future-time');
      if (!dateInput.value || !timeInput.value) {
        const def = new Date(Date.now() + 60 * 60 * 1000);
        const pad = n => String(n).padStart(2, '0');
        dateInput.value = def.getFullYear() + '-' + pad(def.getMonth() + 1) + '-' + pad(def.getDate());
        timeInput.value = pad(def.getHours()) + ':' + pad(def.getMinutes());
      }
    } else {
      scheduleWrap.classList.add('hidden');
    }

    document.getElementById('tej-image-preview-wrap').classList.add('hidden');
    document.getElementById('tej-video-preview-wrap').classList.add('hidden');
    if (_tejMediaBase64) { try { URL.revokeObjectURL(_tejMediaBase64); } catch (e) {} }
    _tejMediaBase64 = null;
    _tejMediaMime = null;
    _tejMediaFile = null;
  }

  function tejMediaSelected(input) {
    const file = input.files[0];
    if (!file) return;
    // ✅ [FIX - বড় ফাইল আপলোড] আগে base64 দিয়ে Firestore-এ (১MB লিমিট) সেভ হতো, তাই বড় ফাইল ব্যর্থ হতো।
    // এখন ফাইলটা Firebase Storage-এ আপলোড হবে, তাই লিমিট অনেক বড় রাখা যাচ্ছে।
    const maxMB = file.type.startsWith('video') ? 200 : 10;
    if (file.size > maxMB * 1024 * 1024) {
      showCartToast('⚠️ ফাইলটি ' + maxMB + 'MB এর বেশি'); input.value = ''; return;
    }
    _tejMediaFile = file;
    _tejMediaMime = file.type;
    _tejMediaBase64 = URL.createObjectURL(file); // শুধু প্রিভিউয়ের জন্য (মেমোরি-বান্ধব)
    if (file.type.startsWith('image')) {
      document.getElementById('tej-image-preview').src = _tejMediaBase64;
      document.getElementById('tej-image-preview-wrap').classList.remove('hidden');
      document.getElementById('tej-video-preview-wrap').classList.add('hidden');
      document.getElementById('tej-media-upload-area').classList.add('hidden');
    } else {
      document.getElementById('tej-video-preview').src = _tejMediaBase64;
      document.getElementById('tej-video-preview-wrap').classList.remove('hidden');
      document.getElementById('tej-image-preview-wrap').classList.add('hidden');
      document.getElementById('tej-media-upload-area').classList.add('hidden');
    }
  }

  function removeTejMedia() {
    if (_tejMediaBase64) { try { URL.revokeObjectURL(_tejMediaBase64); } catch (e) {} }
    _tejMediaBase64 = null; _tejMediaMime = null; _tejMediaFile = null;
    document.getElementById('tej-image-preview-wrap').classList.add('hidden');
    document.getElementById('tej-video-preview-wrap').classList.add('hidden');
    document.getElementById('tej-media-upload-area').classList.remove('hidden');
    document.getElementById('tej-media-input').value = '';
  }

  // ✅ NEW (feature-14): মাসে একবার ডোনেশন/ফিউচার পোস্ট লিমিট চেক — ৩০ দিন রোলিং উইন্ডো
  // (Firestore Rules-এর canCreateMonthlyPost() ফাংশনের সাথে সামঞ্জস্যপূর্ণ, যাতে ক্লায়েন্ট ও সার্ভার-সাইড লজিকে গরমিল না হয়)
  async function checkTejMonthlyLimit(category) {
    const field = category === 'donation' ? 'lastDonationPostAt' : 'lastFuturePostAt';
    const label = category === 'donation' ? 'ডোনেশন' : 'ফিউচার';
    try {
      const userSnap = await firestore.collection('users').doc(currentUser.uid).get();
      const lastTs = userSnap.exists ? userSnap.data()[field] : null;
      if (lastTs) {
        const lastMs = lastTs.toMillis ? lastTs.toMillis() : new Date(lastTs).getTime();
        const daysPassed = (Date.now() - lastMs) / 86400000;
        if (daysPassed < 30) {
          const daysLeft = Math.ceil(30 - daysPassed);
          showCartToast(`⚠️ মাসে একবার ${label} পোস্ট করা যায় — আর ${daysLeft} দিন পর আবার করতে পারবেন`);
          return false;
        }
      }
      return true;
    } catch (e) {
      showCartToast('❌ লিমিট চেক করা যায়নি, আবার চেষ্টা করুন');
      return false;
    }
  }

  async function submitTejPost() {
    if (!currentUser) { showCartToast('⚠️ লগইন করুন'); return; }
    const text = document.getElementById('tej-post-text').value.trim();
    if (!text && !_tejMediaFile) { showCartToast('⚠️ টেক্সট বা মিডিয়া যোগ করুন'); return; }

    // ✅ পোস্ট ক্যাটেগরি — normal / future (শিডিউলড) / donation (সবার আগে দেখাবে)
    let postCategory = 'normal';
    let publishAt = null;
    let scheduledDate = null;
    if (_tejCurrentPostType === 'future') {
      const dateVal = document.getElementById('tej-future-date').value;
      const timeVal = document.getElementById('tej-future-time').value;
      if (!dateVal || !timeVal) { showCartToast('⚠️ পোস্টটি কখন পাবলিক হবে তার তারিখ ও সময় সেট করুন'); return; }
      scheduledDate = new Date(dateVal + 'T' + timeVal);
      if (isNaN(scheduledDate.getTime()) || scheduledDate.getTime() <= Date.now()) {
        showCartToast('⚠️ ভবিষ্যতের একটি তারিখ ও সময় দিন'); return;
      }
      postCategory = 'future';
      publishAt = scheduledDate;
    } else if (_tejCurrentPostType === 'donation') {
      postCategory = 'donation';
    }

    // ✅ NEW (feature-14): মাসে একবার লিমিট — সাবমিট করার আগে চেক
    if (postCategory === 'donation' || postCategory === 'future') {
      const allowed = await checkTejMonthlyLimit(postCategory);
      if (!allowed) return;
    }

    const btn = document.getElementById('tej-submit-btn');
    btn.disabled = true;
    try {
      let mediaType = 'text';
      let mediaUrl = null;

      // ✅ [FIX - বড় ফাইল আপলোড] base64 আকারে Firestore-এ (১MB লিমিট) না রেখে
      // Firebase Storage-এ আপলোড করে শুধু ছোট্ট download URL Firestore-এ সেভ করা হচ্ছে
      if (_tejMediaFile) {
        mediaType = _tejMediaMime && _tejMediaMime.startsWith('video') ? 'video' : 'image';
        btn.innerHTML = `<i class='fas fa-spinner fa-spin mr-2'></i> আপলোড হচ্ছে... 0%`;
        const safeName = _tejMediaFile.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const storagePath = `tej_feed/${currentUser.uid}/${Date.now()}_${safeName}`;
        const uploadTask = storage.ref(storagePath).put(_tejMediaFile, { contentType: _tejMediaMime });
        await new Promise((resolve, reject) => {
          uploadTask.on('state_changed', snap => {
            const pct = Math.round((snap.bytesTransferred / snap.totalBytes) * 100);
            btn.innerHTML = `<i class='fas fa-spinner fa-spin mr-2'></i> আপলোড হচ্ছে... ${pct}%`;
          }, reject, resolve);
        });
        mediaUrl = await uploadTask.snapshot.ref.getDownloadURL();
      }
      btn.innerHTML = `<i class='fas fa-spinner fa-spin mr-2'></i> পোস্ট হচ্ছে...`;
      // ✅ NEW (feature-14): batch দিয়ে পোস্ট তৈরি + (ডোনেশন/ফিউচার হলে) ইউজার ডকে lastDonationPostAt/lastFuturePostAt
      // একসাথে সেট করা হয় — এতে মাসিক লিমিট ট্র্যাকিং সঠিকভাবে হয় এবং Firestore Rules-এর সাথে মিল থাকে
      const newTejPostRef = firestore.collection(TEJ_COLLECTION).doc();
      const tejBatch = firestore.batch();
      tejBatch.set(newTejPostRef, {
        uid: currentUser.uid,
        userName: currentUser.displayName || 'অজানা',
        userPhoto: currentUser.photoURL || '',
        text: text || '',
        mediaType,
        mediaData: mediaUrl,
        postCategory,
        publishAt,
        likes: 0,
        likedBy: [],
        commentCount: 0,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      if (postCategory === 'donation') {
        tejBatch.update(firestore.collection('users').doc(currentUser.uid), {
          lastDonationPostAt: firebase.firestore.FieldValue.serverTimestamp()
        });
      } else if (postCategory === 'future') {
        tejBatch.update(firestore.collection('users').doc(currentUser.uid), {
          lastFuturePostAt: firebase.firestore.FieldValue.serverTimestamp()
        });
      }
      await tejBatch.commit();
      if (postCategory === 'future') {
        const dateLabel = scheduledDate.toLocaleString('bn-BD', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
        showCartToast('✅ পোস্টটি শিডিউল করা হয়েছে! ' + dateLabel + ' এ পাবলিক হবে।');
      } else if (postCategory === 'donation') {
        showCartToast('✅ ডোনেশন পোস্ট হয়ে গেছে — সবার আগে দেখা যাবে!');
      } else {
        showCartToast('✅ পোস্ট সফলভাবে শেয়ার হয়েছে!');
      }
      closeTejCreate();
    } catch(e) {
      console.error('submitTejPost error:', e);
      showCartToast('❌ পোস্ট করা যায়নি: ' + (e.message || e.code || 'unknown error'));
    }
    btn.disabled = false;
    btn.innerHTML = `<i class='fas fa-paper-plane text-sm'></i> শেয়ার করুন`;
  }

  async function toggleTejLike(postId) {
    if (!currentUser) { showCartToast('⚠️ লাইক দিতে লগইন করুন'); return; }
    const ref = firestore.collection(TEJ_COLLECTION).doc(postId);
    const snap = await ref.get();
    if (!snap.exists) return;
    const d = snap.data();
    const likedBy = d.likedBy || [];
    const isLiked = likedBy.includes(currentUser.uid);
    await ref.update({
      likes: firebase.firestore.FieldValue.increment(isLiked ? -1 : 1),
      likedBy: isLiked
        ? firebase.firestore.FieldValue.arrayRemove(currentUser.uid)
        : firebase.firestore.FieldValue.arrayUnion(currentUser.uid)
    });
    // ✅ NEW (feature-18): like করলে পোস্ট ওনারকে নোটিফ পাঠাও (unlike-এ না)
    if (!isLiked && d.uid) {
      _sendTejNotif(d.uid, 'like', currentUser.displayName, currentUser.photoURL, postId, d.text);
    }
  }

  async function deleteTejPost(postId) {
    if (!currentUser) return;
    if (!confirm('এই পোস্টটি মুছে দেবেন?')) return;
    try {
      await firestore.collection(TEJ_COLLECTION).doc(postId).delete();
      showCartToast('🗑️ পোস্ট মুছে দেওয়া হয়েছে');
    } catch(e) { showCartToast('❌ মুছতে পারা যায়নি'); }
  }

  function shareTejPost(postId, textPreview) {
    const url = window.location.href.split('?')[0] + '?tej=' + postId;
    if (navigator.share) {
      navigator.share({ title: 'পেজ পোস্ট', text: textPreview, url });
    } else {
      navigator.clipboard.writeText(url).then(() => showCartToast('🔗 লিঙ্ক কপি হয়েছে!'));
    }
  }

  // ✅ NEW: কমেন্ট রিপ্লাই/থ্রেড — একটা লেভেল নেস্টিং (Facebook-স্টাইল সরল থ্রেড)
  let _tejReplyTarget = null;
  let _tejReplyTargetName = null;
  function tejReplyToComment(commentId, userName) {
    _tejReplyTarget = commentId;
    _tejReplyTargetName = userName;
    document.getElementById('tej-reply-target-name').innerText = userName;
    document.getElementById('tej-reply-indicator').classList.remove('hidden');
    const inp = document.getElementById('tej-comment-input');
    inp.focus();
  }
  function cancelTejReply() {
    _tejReplyTarget = null;
    _tejReplyTargetName = null;
    document.getElementById('tej-reply-indicator')?.classList.add('hidden');
  }

  async function openTejView(postId) {
    _tejViewPostId = postId;
    const modal = document.getElementById('tej-view-modal');
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    const body = document.getElementById('tej-view-body');
    body.innerHTML = `<div class='text-center py-8 text-slate-400'><i class='fas fa-spinner fa-spin'></i></div>`;
    if (currentUser) {
      document.getElementById('tej-comment-avatar').src = currentUser.photoURL || '';
    }
    const snap = await firestore.collection(TEJ_COLLECTION).doc(postId).get();
    if (!snap.exists) { body.innerHTML = '<p class="text-center text-xs text-slate-400 py-8">পোস্ট পাওয়া যায়নি</p>'; return; }
    const d = snap.data();
    body.innerHTML = renderTejCard(postId, d);
    // কমেন্ট সেকশন
    const commentSection = document.createElement('div');
    commentSection.className = 'mt-3';
    commentSection.innerHTML = `<p class='text-xs font-black text-slate-600 mb-2'>কমেন্ট</p><div id='tej-comments-list'><div class='text-center py-4 text-slate-300 text-xs'><i class='fas fa-spinner fa-spin'></i></div></div>`;
    body.appendChild(commentSection);
    if (_tejCommentUnsub) _tejCommentUnsub();
    _tejCommentUnsub = firestore.collection(TEJ_COLLECTION).doc(postId).collection('comments')
      .orderBy('createdAt', 'asc').limit(100)
      .onSnapshot(snap => {
        const cl = document.getElementById('tej-comments-list');
        if (!cl) return;
        if (snap.empty) { cl.innerHTML = `<p class='text-[11px] text-slate-400 text-center py-3'>এখনো কোনো কমেন্ট নেই</p>`; return; }

        // ✅ NEW: parentId অনুযায়ী টপ-লেভেল কমেন্ট ও রিপ্লাই আলাদা করে গ্রুপ করা হচ্ছে
        const all = snap.docs.map(c => ({ id: c.id, ...c.data() }));
        const topLevel = all.filter(c => !c.parentId);
        const repliesByParent = {};
        all.filter(c => c.parentId).forEach(c => {
          if (!repliesByParent[c.parentId]) repliesByParent[c.parentId] = [];
          repliesByParent[c.parentId].push(c);
        });

        const renderOne = (cd, isReply) => {
          const av = cd.userPhoto ? `<img loading="lazy" src='${cd.userPhoto}' class='w-7 h-7 rounded-full object-cover bg-slate-200 shrink-0'>` : `<div class='w-7 h-7 rounded-full bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center text-white font-black text-xs shrink-0'>${(cd.userName||'?')[0]}</div>`;
          return `<div class='flex gap-2 mb-2 ${isReply ? 'ml-8' : ''}'>
            <div class='cursor-pointer shrink-0' onclick="openUserProfileDetail('${cd.uid}')">${av}</div>
            <div class='flex-1'>
              <div class='bg-slate-50 rounded-2xl px-3 py-2'>
                <p class='text-[11px] font-bold text-slate-700 cursor-pointer' onclick="openUserProfileDetail('${cd.uid}')">${escapeHtml(cd.userName)||'অজানা'}</p>
                <p class='text-xs text-slate-600 mt-0.5'>${escapeHtml(cd.text)}</p>
              </div>
              <button onclick="tejReplyToComment('${isReply ? cd.parentId : cd.id}', '${escapeHtml(cd.userName || 'অজানা').replace(/'/g, "\\'")}')" class='text-[10px] text-slate-400 font-bold mt-0.5 ml-2'>উত্তর দিন</button>
            </div>
          </div>`;
        };

        cl.innerHTML = topLevel.map(cd => {
          const replies = (repliesByParent[cd.id] || []).map(r => renderOne(r, true)).join('');
          return renderOne(cd, false) + replies;
        }).join('');
      });
  }

  function closeTejView() {
    document.getElementById('tej-view-modal').classList.add('hidden');
    _tejViewPostId = null;
    cancelTejReply();
    if (_tejCommentUnsub) { _tejCommentUnsub(); _tejCommentUnsub = null; }
  }

  async function submitTejComment() {
    if (!currentUser) { showCartToast('⚠️ কমেন্ট করতে লগইন করুন'); return; }
    if (!_tejViewPostId) return;
    const inp = document.getElementById('tej-comment-input');
    const text = inp.value.trim();
    if (!text) return;
    inp.value = '';
    const parentId = _tejReplyTarget; // ✅ NEW: রিপ্লাই হলে টপ-লেভেল কমেন্টের id, নাহলে null
    cancelTejReply();
    try {
      const ref = firestore.collection(TEJ_COLLECTION).doc(_tejViewPostId);
      await ref.collection('comments').add({
        uid: currentUser.uid,
        userName: currentUser.displayName || 'অজানা',
        userPhoto: currentUser.photoURL || '',
        text,
        parentId: parentId || null,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      await ref.update({ commentCount: firebase.firestore.FieldValue.increment(1) });
      // ✅ NEW (feature-18): পোস্ট ওনারকে comment নোটিফ পাঠাও
      const postSnap = await ref.get();
      if (postSnap.exists && postSnap.data().uid) {
        _sendTejNotif(postSnap.data().uid, 'comment', currentUser.displayName, currentUser.photoURL, _tejViewPostId, postSnap.data().text);
      }
    } catch(e) { showCartToast('❌ কমেন্ট করা যায়নি'); }
  }


  function renderPeopleBrowserList(list) {
    const container = document.getElementById('people-browser-list');
    if (!container) return;
    const others = list.filter(p => p.uid !== currentUser?.uid);
    if (others.length === 0) {
      container.innerHTML = `<div class="text-center py-10 text-slate-400 text-xs font-medium"><i class="fas fa-user-slash text-2xl text-slate-300 mb-2 block"></i> ${t('noProfilesFoundLabel')}</div>`;
      return;
    }
    container.innerHTML = others.map(p => `
      <div class="people-card" onclick="openUserProfileDetail('${p.uid}')">
        <div class="relative shrink-0">
          <img loading="lazy" src="${p.photo || ('https://placehold.co/44x44/f1f5f9/64748b?text=' + (p.name?.[0] || '?'))}"
            class="w-11 h-11 rounded-full object-cover border border-slate-100"
            onerror="this.src='https://placehold.co/44x44/f1f5f9/64748b?text=?'"/>
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-xs font-bold text-slate-800 truncate">${escapeHtml(p.name || 'ইউজার')}</p>
          <p class="text-[10px] text-slate-400">${p.role === 'seller' ? '🛍️ ' + t('roleLabelSeller') : '🧑 ' + t('roleLabelCustomer')}</p>
        </div>
        <i class="fas fa-chevron-right text-slate-300 text-xs"></i>
      </div>
    `).join('');
  }

  function filterPeopleBrowserList(query) {
    const q = (query || '').trim().toLowerCase();
    if (!q) { renderPeopleBrowserList(_peopleBrowserData); return; }
    renderPeopleBrowserList(_peopleBrowserData.filter(p => (p.name || '').toLowerCase().includes(q)));
  }

  // ============================================================
  // ✅ প্রোফাইল ডিটেইল — লক/আনলক স্টেট সহ
  // ============================================================
  function friendReqId(fromUid, toUid) { return fromUid + '_' + toUid; }

  async function getFriendStatus(myUid, otherUid) {
    try {
      const [sentSnap, recvSnap] = await Promise.all([
        firestore.collection('friend_requests').doc(friendReqId(myUid, otherUid)).get(),
        firestore.collection('friend_requests').doc(friendReqId(otherUid, myUid)).get()
      ]);
      if (sentSnap.exists) {
        const s = sentSnap.data().status;
        if (s === 'accepted') return { state: 'accepted' };
        if (s === 'pending')  return { state: 'sent' };
      }
      if (recvSnap.exists) {
        const s = recvSnap.data().status;
        if (s === 'accepted') return { state: 'accepted' };
        if (s === 'pending')  return { state: 'received' };
      }
      return { state: 'none' };
    } catch (e) {
      console.error('getFriendStatus error:', e);
      return { state: 'none' };
    }
  }

  async function openUserProfileDetail(uid) {
    if (!currentUser) { alert(t('loginFirstAlert')); return; }
    const card = document.getElementById('user-profile-detail-card');
    const modal = document.getElementById('user-profile-detail-modal');
    card.innerHTML = `<div class="p-10 text-center text-slate-400 text-xs"><i class="fas fa-spinner fa-spin text-xl mb-2 block"></i> ${t('loadingText')}</div>`;
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';

    try {
      const profSnap = await firestore.collection('public_profiles').doc(uid).get();
      if (!profSnap.exists) {
        card.innerHTML = `<div class="p-10 text-center text-slate-400 text-xs">${t('noProfilesFoundLabel')}</div>`;
        return;
      }
      const p = profSnap.data();
      const isSelf = uid === currentUser.uid;
      let friendStatus, isFollowingState;
      if (isSelf) {
        friendStatus = { state: 'self' };
        isFollowingState = false;
      } else {
        [friendStatus, isFollowingState] = await Promise.all([
          getFriendStatus(currentUser.uid, uid),
          isFollowingUser(currentUser.uid, uid)
        ]);
      }
      // ✅ নতুন প্রাইভেসি লজিক:
      // লক হবে যদি: নিজে না হয় AND (ফ্রেন্ড একসেপ্টেড না) AND (আমি ফলো করি না) AND (সে আমাকে ফলো করে না) AND (profilePrivacy === 'private' বা অনির্ধারিত)
      let isTheyFollowingMe = false;
      if (!isSelf && p.uid) {
        try {
          const reverseDoc = await firestore.collection('followers').doc(followDocId(p.uid, currentUser.uid)).get();
          isTheyFollowingMe = reverseDoc.exists;
        } catch(e) {}
      }
      const profileIsPublic = p.profilePrivacy === 'public';
      const locked = !isSelf
        && !profileIsPublic
        && friendStatus.state !== 'accepted'
        && !isFollowingState
        && !isTheyFollowingMe;
      renderUserProfileDetail(p, friendStatus, locked, isSelf, isFollowingState);
      if (!locked) loadUserProfilePosts(uid);
    } catch (e) {
      card.innerHTML = `<div class="p-10 text-center text-red-400 text-xs">${t('couldNotLoadLabel')}: ${e.message}</div>`;
    }
  }

  // ✅ NEW: প্রোফাইল মডালেই সেই ইউজারের পোস্টগুলো গ্রিড আকারে দেখাও (প্রোফাইল ও পোস্ট একসাথে)
  async function loadUserProfilePosts(uid) {
    const grid = document.getElementById('user-profile-posts-grid');
    if (!grid) return;
    try {
      const snap = await firestore.collection('tej_posts')
        .where('uid', '==', uid)
        .orderBy('createdAt', 'desc')
        .limit(18)
        .get();
      if (snap.empty) {
        grid.innerHTML = `<div class="col-span-3 text-center py-6 text-slate-300 text-xs">এখনো কোনো পোস্ট নেই</div>`;
        return;
      }
      grid.innerHTML = snap.docs.map(doc => {
        const d = doc.data();
        const id = doc.id;
        if (d.mediaType === 'image' && d.mediaData) {
          return `<div class="aspect-square rounded-lg overflow-hidden cursor-pointer bg-slate-100" onclick="closeUserProfileDetail(); openTejView('${id}')">
            <img src="${d.mediaData}" loading="lazy" class="w-full h-full object-cover">
          </div>`;
        }
        if (d.mediaType === 'video' && d.mediaData) {
          return `<div class="aspect-square rounded-lg overflow-hidden cursor-pointer bg-slate-900 relative" onclick="closeUserProfileDetail(); openTejView('${id}')">
            <video src="${d.mediaData}" class="w-full h-full object-cover" muted preload="metadata"></video>
            <i class="fas fa-play absolute inset-0 m-auto text-white text-sm drop-shadow"></i>
          </div>`;
        }
        const snippet = (d.text || '').slice(0, 60);
        return `<div class="aspect-square rounded-lg overflow-hidden cursor-pointer bg-gradient-to-br from-orange-50 to-pink-50 border border-orange-100 p-2 flex items-center" onclick="closeUserProfileDetail(); openTejView('${id}')">
          <p class="text-[9px] font-bold text-slate-600 leading-snug line-clamp-5">${escapeHtml(snippet)}</p>
        </div>`;
      }).join('');
    } catch (e) {
      grid.innerHTML = `<div class="col-span-3 text-center py-6 text-red-300 text-xs">পোস্ট লোড করা যায়নি</div>`;
    }
  }

  // ✅ NEW (feature-63): Facebook-স্টাইল প্রোফাইল — কভার+অ্যাভাটার, সম্পর্কে, বন্ধুরা, লিংক, কমিউনিটি, পোস্ট
  function renderUserProfileDetail(p, friendStatus, locked, isSelf, isFollowingState) {
    const card = document.getElementById('user-profile-detail-card');
    const uid = p.uid;
    const safeName = escapeHtml(p.name || 'ইউজার');
    const avatarUrl = p.photo || ('https://placehold.co/90x90/f1f5f9/64748b?text=' + (p.name?.[0] || '?'));
    const coverUrl = p.coverPhoto || '';
    const roleLabel = p.role === 'seller' ? '🛍️ ' + t('roleLabelSeller') : '🧑 ' + t('roleLabelCustomer');

    let friendActionHtml = '';
    let followActionHtml = '';
    let messageBtnHtml = '';
    let bioLineHtml = '';

    if (locked) {
      bioLineHtml = '';
    } else if (p.bio) {
      bioLineHtml = `<p class="text-slate-500 text-xs mt-1.5 leading-relaxed">${escapeHtml(p.bio)}</p>`;
    } else if (isSelf) {
      bioLineHtml = `<p class="text-slate-300 text-xs mt-1.5 italic">${t('noBioLabel')}</p>`;
    }

    if (!isSelf) {
      followActionHtml = isFollowingState
        ? `<button onclick="toggleFollowUser('${uid}', false)" class="follow-pill fp-following"><i class="fas fa-user-check"></i> ${t('followingLabel')}</button>`
        : `<button onclick="toggleFollowUser('${uid}', true)" class="follow-pill fp-notfollowing"><i class="fas fa-user-plus"></i> ${t('followBtnLabel')}</button>`;

      if (friendStatus.state === 'accepted') {
        friendActionHtml = `<span class="friend-pill fp-accepted"><i class="fas fa-user-check"></i> ${t('friendsAlreadyLabel')}</span>`;
      } else if (friendStatus.state === 'sent') {
        friendActionHtml = `<button onclick="cancelFriendRequest('${uid}')" class="friend-pill fp-pending"><i class="fas fa-clock"></i> ${t('friendRequestPendingBtn')}</button>`;
      } else if (friendStatus.state === 'received') {
        friendActionHtml = `
          <div class="flex gap-2 justify-center mt-2">
            <button onclick="acceptFriendRequest('${uid}')" class="bg-emerald-500 text-white text-[10px] font-black px-3 py-1.5 rounded-lg active:scale-95"><i class="fas fa-check"></i> ${t('friendAcceptBtn')}</button>
            <button onclick="rejectFriendRequest('${uid}')" class="bg-red-100 text-red-700 text-[10px] font-black px-3 py-1.5 rounded-lg active:scale-95"><i class="fas fa-times"></i> ${t('friendRejectBtn')}</button>
          </div>`;
      } else {
        friendActionHtml = `<button onclick="sendFriendRequest('${uid}')" class="friend-pill fp-none"><i class="fas fa-user-plus"></i> ${t('sendFriendRequestBtn')}</button>`;
      }

      if (!locked) {
        messageBtnHtml = `
          <button onclick="openPeerChatModal('${uid}', '${safeName.replace(/'/g, "\\'")}', '${(p.photo || '').replace(/'/g, "\\'")}')"
            class="w-full mt-3 bg-slate-900 text-white font-black text-xs py-3 rounded-2xl active:scale-95 transition flex items-center justify-center gap-2">
            <i class="fas fa-comment-dots"></i> ${t('messageBtnLabel')}
          </button>`;
      }
      // ✅ অডিও/ভিডিও কল — শুধুমাত্র ফ্রেন্ড একসেপ্ট হলেই দেখাবে
      if (friendStatus.state === 'accepted') {
        const safeNameAttr  = safeName.replace(/'/g, "\\'");
        const safePhotoAttr = (p.photo || '').replace(/'/g, "\\'");
        messageBtnHtml += `
          <div class="flex gap-2 mt-2">
            <button onclick="startOutgoingCall('${uid}', '${safeNameAttr}', '${safePhotoAttr}', 'audio')"
              class="flex-1 bg-emerald-600 text-white font-black text-xs py-3 rounded-2xl active:scale-95 transition flex items-center justify-center gap-2">
              <i class="fas fa-phone"></i> ${t('audioCallBtnLabel')}
            </button>
            <button onclick="startOutgoingCall('${uid}', '${safeNameAttr}', '${safePhotoAttr}', 'video')"
              class="flex-1 bg-blue-600 text-white font-black text-xs py-3 rounded-2xl active:scale-95 transition flex items-center justify-center gap-2">
              <i class="fas fa-video"></i> ${t('videoCallBtnLabel')}
            </button>
          </div>`;
      }
    }

    // ✅ "সম্পর্কে" কার্ড
    const aboutRows = [];
    if (p.work) aboutRows.push(`<div class="flex items-center gap-3 py-2"><i class="fas fa-briefcase text-slate-400 w-4 text-center"></i><p class="text-xs text-slate-700 font-medium">${escapeHtml(p.work)}</p></div>`);
    if (p.hometown) aboutRows.push(`<div class="flex items-center gap-3 py-2"><i class="fas fa-house text-slate-400 w-4 text-center"></i><p class="text-xs text-slate-700">হোমটাউন <b>${escapeHtml(p.hometown)}</b></p></div>`);
    if (p.currentCity) aboutRows.push(`<div class="flex items-center gap-3 py-2"><i class="fas fa-location-dot text-slate-400 w-4 text-center"></i><p class="text-xs text-slate-700"><b>${escapeHtml(p.currentCity)}</b>-এ থাকেন</p></div>`);
    let aboutCardHtml = '';
    if (!locked && (aboutRows.length > 0 || isSelf)) {
      aboutCardHtml = `
        <div class="mt-4 pt-4 border-t border-slate-100">
          <h4 class="text-[11px] font-black text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <i class="fas fa-address-card text-[10px] text-orange-400"></i> সম্পর্কে
          </h4>
          <div class="divide-y divide-slate-50">${aboutRows.join('') || '<p class="text-[11px] text-slate-300 py-2">কোনো তথ্য যোগ করা হয়নি</p>'}</div>
          ${isSelf ? `<button onclick="openProfileAboutEditSheet()" class="text-[10px] font-bold text-orange-500 mt-1"><i class="fas fa-pen text-[9px]"></i> তথ্য এডিট করুন</button>` : ''}
        </div>`;
    }

    // ✅ "বন্ধুরা" কার্ড
    let friendsCardHtml = '';
    if (!locked) {
      friendsCardHtml = `
        <div class="mt-4 pt-4 border-t border-slate-100">
          <div class="flex items-center justify-between mb-2">
            <h4 class="text-[11px] font-black text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <i class="fas fa-user-group text-[10px] text-orange-400"></i> বন্ধুরা <span id="user-profile-friends-count" class="text-slate-400 normal-case font-bold">·</span>
            </h4>
            ${isSelf ? `<button onclick="closeUserProfileDetail(); openMyFriendsList();" class="text-[10px] font-bold text-orange-500">সব দেখুন</button>` : ''}
          </div>
          <div id="user-profile-friends-grid" class="grid grid-cols-3 gap-2">
            <div class="col-span-3 text-center py-4 text-slate-300 text-xs"><i class="fas fa-spinner fa-spin"></i></div>
          </div>
        </div>`;
    }

    // ✅ "লিংক" কার্ড
    const links = Array.isArray(p.links) ? p.links.filter(Boolean) : [];
    let linksCardHtml = '';
    if (!locked && (links.length > 0 || isSelf)) {
      linksCardHtml = `
        <div class="mt-4 pt-4 border-t border-slate-100">
          <h4 class="text-[11px] font-black text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <i class="fas fa-link text-[10px] text-orange-400"></i> লিংক
          </h4>
          ${links.length ? `<div class="flex flex-wrap gap-2">${links.map(l => `<a href="${escapeHtml(l)}" target="_blank" rel="noopener noreferrer" class="text-[10px] font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full truncate max-w-[220px] inline-block"><i class="fas fa-arrow-up-right-from-square text-[8px] mr-1"></i>${escapeHtml(l.replace(/^https?:\/\//, '').slice(0, 30))}</a>`).join('')}</div>` : `<p class="text-[11px] text-slate-300">কোনো লিংক যোগ করা হয়নি</p>`}
          ${isSelf ? `<button onclick="openProfileAboutEditSheet()" class="text-[10px] font-bold text-orange-500 mt-2"><i class="fas fa-pen text-[9px]"></i> লিংক এডিট করুন</button>` : ''}
        </div>`;
    }

    // ✅ "কমিউনিটি" — এখনো কোনো ব্যাকএন্ড ফিচার নেই, শুধু প্লেসহোল্ডার শেল
    let communitiesCardHtml = '';
    if (!locked) {
      communitiesCardHtml = `
        <div class="mt-4 pt-4 border-t border-slate-100">
          <h4 class="text-[11px] font-black text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <i class="fas fa-people-group text-[10px] text-orange-400"></i> কমিউনিটি
          </h4>
          <p class="text-[11px] text-slate-300"><i class="fas fa-hourglass-half mr-1"></i> শীঘ্রই আসছে</p>
        </div>`;
    }

    const lockedBlockHtml = locked ? `
      <div class="profile-locked-wrap mt-3">
        <div class="profile-locked-blur px-4 py-3">
          <p class="text-center text-slate-500 text-xs font-bold">████████</p>
          <p class="text-center text-slate-400 text-[10px] mt-1">████████████</p>
        </div>
        <div class="profile-lock-overlay">
          <i class="fas fa-lock"></i>
          <p class="text-white text-[11px] font-bold leading-snug text-center px-2">${t('profileLockedMsg')}</p>
        </div>
      </div>
      <p class="text-center text-slate-400 text-[10px] mt-3">${t('profileLockedHintMsg')}</p>` : '';

    card.innerHTML = `
      <div class="relative">
        <!-- ✅ কভার ফটো -->
        <div class="w-full h-32 relative overflow-hidden ${coverUrl ? '' : 'bg-gradient-to-br from-slate-900 via-slate-800 to-orange-900'}"
          ${coverUrl ? `style="background-image:url('${coverUrl}');background-size:cover;background-position:center"` : ''}>
          <button onclick="closeUserProfileDetail()" class="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/30 flex items-center justify-center text-white z-10">
            <i class="fas fa-times text-sm"></i>
          </button>
          ${isSelf ? `
          <button onclick="document.getElementById('profile-cover-uploader').click()" class="absolute bottom-2 right-2 w-8 h-8 rounded-full bg-black/40 flex items-center justify-center text-white z-10">
            <i class="fas fa-camera text-xs"></i>
          </button>` : ''}
        </div>
        <!-- ✅ অ্যাভাটার — কভারের উপর ওভারল্যাপ -->
        <div class="absolute -bottom-10 left-4">
          <div class="relative w-20 h-20">
            <img src="${avatarUrl}" loading="lazy" class="w-20 h-20 rounded-full object-cover border-4 border-white shadow-lg bg-slate-100 ${locked ? 'blur-md' : ''}"
              onerror="this.src='https://placehold.co/90x90/f1f5f9/64748b?text=?'"/>
            ${locked ? `<div class="absolute inset-0 flex items-center justify-center"><i class="fas fa-lock text-slate-700 text-lg drop-shadow-lg"></i></div>` : ''}
            ${isSelf ? `<button onclick="document.getElementById('profile-photo-uploader').click()" class="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-orange-500 text-white flex items-center justify-center text-[9px] border-2 border-white">
              <i class="fas fa-camera"></i>
            </button>` : ''}
          </div>
        </div>
      </div>
      <div class="pt-12 pb-5 px-5">
        <h3 class="text-slate-900 font-black text-base">${locked ? '🔒 ' + t('lockedProfileTitle') : safeName}</h3>
        <p class="text-orange-500 text-[10px] font-bold mt-0.5">${locked ? '— ' + roleLabel : roleLabel}</p>
        ${bioLineHtml}
        ${lockedBlockHtml}
        <div class="flex justify-center gap-2 mt-3">${friendActionHtml}${followActionHtml}</div>
        ${messageBtnHtml}
        ${aboutCardHtml}
        ${friendsCardHtml}
        ${linksCardHtml}
        ${communitiesCardHtml}
        ${locked ? '' : `
        <div class="mt-4 pt-4 border-t border-slate-100">
          <h4 class="text-[11px] font-black text-slate-500 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
            <i class="fas fa-grip text-[10px] text-orange-400"></i> পোস্টসমূহ
          </h4>
          <div id="user-profile-posts-grid" class="grid grid-cols-3 gap-1.5">
            <div class="col-span-3 text-center py-6 text-slate-300 text-xs"><i class="fas fa-spinner fa-spin"></i></div>
          </div>
        </div>`}
      </div>
    `;

    if (!locked) loadUserProfileFriendsGrid(uid);
  }

  function closeUserProfileDetail() {
    document.getElementById('user-profile-detail-modal').classList.add('hidden');
    document.body.style.overflow = 'auto';
  }

  // ============================================================
  // ✅ ফ্রেন্ড রিকোয়েস্ট — পাঠানো / বাতিল / একসেপ্ট / রিজেক্ট
  // ============================================================
  async function sendFriendRequest(toUid) {
    if (!currentUser) return;
    try {
      await firestore.collection('friend_requests').doc(friendReqId(currentUser.uid, toUid)).set({
        fromUid: currentUser.uid, toUid: toUid, status: 'pending',
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      openUserProfileDetail(toUid);
    } catch (e) {
      alert(t('friendActionFailedLabel') + ': ' + e.message);
    }
  }

  async function cancelFriendRequest(toUid) {
    if (!currentUser) return;
    try {
      await firestore.collection('friend_requests').doc(friendReqId(currentUser.uid, toUid)).delete();
      openUserProfileDetail(toUid);
    } catch (e) {
      alert(t('friendActionFailedLabel') + ': ' + e.message);
    }
  }

  async function acceptFriendRequest(fromUid) {
    if (!currentUser) return;
    try {
      await firestore.collection('friend_requests').doc(friendReqId(fromUid, currentUser.uid)).update({
        status: 'accepted', respondedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      openUserProfileDetail(fromUid);
    } catch (e) {
      alert(t('friendActionFailedLabel') + ': ' + e.message);
    }
  }

  async function rejectFriendRequest(fromUid) {
    if (!currentUser) return;
    try {
      await firestore.collection('friend_requests').doc(friendReqId(fromUid, currentUser.uid)).update({
        status: 'rejected', respondedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      openUserProfileDetail(fromUid);
    } catch (e) {
      alert(t('friendActionFailedLabel') + ': ' + e.message);
    }
  }

  // ✅ ইনকামিং পেন্ডিং ফ্রেন্ড রিকোয়েস্ট ব্যাজ (হেডার প্রোফাইল আইকনে)
  let _friendReqFirstLoad = true; // ✅ NEW: প্রথম স্ন্যাপশটে পুরনো পেন্ডিং রিকোয়েস্টের জন্য নোটিফাই করবে না
  function initFriendRequestBadgeListener(uid) {
    if (_friendReqUnsub) _friendReqUnsub();
    _friendReqFirstLoad = true;
    _friendReqUnsub = firestore.collection('friend_requests')
      .where('toUid', '==', uid).where('status', '==', 'pending')
      .onSnapshot(snap => {
        const badge = document.getElementById('friend-request-badge');
        if (badge) {
          badge.innerText = snap.size;
          badge.classList.toggle('hidden', snap.size === 0);
        }
        const tejBadge = document.getElementById('tej-friend-request-badge');
        if (tejBadge) {
          tejBadge.innerText = snap.size;
          tejBadge.classList.toggle('hidden', snap.size === 0);
        }
        // ✅ NEW: নতুন ফ্রেন্ড রিকোয়েস্ট এলে নোটিফিকেশন
        if (!_friendReqFirstLoad && localStorage.getItem('notif_pref_social') !== 'off') {
          snap.docChanges().forEach(change => {
            if (change.type === 'added') {
              const fromUid = change.doc.data().fromUid;
              firestore.collection('public_profiles').doc(fromUid).get().then(pd => {
                const fromName = (pd.exists && pd.data().name) || 'কেউ একজন';
                sendPushNotification('👤 নতুন ফ্রেন্ড রিকোয়েস্ট', `${fromName} আপনাকে ফ্রেন্ড রিকোয়েস্ট পাঠিয়েছেন।`);
              }).catch(() => {
                sendPushNotification('👤 নতুন ফ্রেন্ড রিকোয়েস্ট', 'কেউ একজন আপনাকে ফ্রেন্ড রিকোয়েস্ট পাঠিয়েছেন।');
              });
            }
          });
        }
        _friendReqFirstLoad = false;
      }, () => {});
  }

  // ============================================================
  // ✅ নিজের মোট ফ্রেন্ড সংখ্যা — প্রোফাইল প্যানেলে রিয়েল-টাইম দেখানোর জন্য
  // ============================================================
  let _myFriendCountUnsubA = null, _myFriendCountUnsubB = null;
  let _myFriendsSentIds = new Set(), _myFriendsRecvIds = new Set();

  function initMyFriendCountListener(uid) {
    if (_myFriendCountUnsubA) _myFriendCountUnsubA();
    if (_myFriendCountUnsubB) _myFriendCountUnsubB();
    _myFriendCountUnsubA = firestore.collection('friend_requests')
      .where('fromUid', '==', uid).where('status', '==', 'accepted')
      .onSnapshot(snap => {
        _myFriendsSentIds = new Set(snap.docs.map(d => d.data().toUid));
        updateMyFriendCountUI();
      }, () => {});
    _myFriendCountUnsubB = firestore.collection('friend_requests')
      .where('toUid', '==', uid).where('status', '==', 'accepted')
      .onSnapshot(snap => {
        _myFriendsRecvIds = new Set(snap.docs.map(d => d.data().fromUid));
        updateMyFriendCountUI();
      }, () => {});
  }

  function updateMyFriendCountUI() {
    const total = _myFriendsSentIds.size + _myFriendsRecvIds.size;
    const el = document.getElementById('profile-friend-count');
    if (el) {
      el.innerText = total;
      el.classList.remove('ring-count-pop');
      void el.offsetWidth;
      el.classList.add('ring-count-pop');
    }
  }

  // ✅ নিজের ফ্রেন্ডলিস্ট দেখা — প্রোফাইলের ফ্রেন্ড কার্ডে ট্যাপ করলে খুলবে
  async function openMyFriendsList() {
    if (!currentUser) { alert(t('loginFirstAlert')); return; }
    _peopleBrowserType = 'friends';
    const modal = document.getElementById('people-browser-modal');
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    document.getElementById('people-browser-title').innerText = t('myFriendsTitle');
    document.getElementById('people-browser-sub').innerText = t('myFriendsSub');
    document.getElementById('people-browser-icon').className = 'fas fa-user-group text-white text-sm';
    document.getElementById('people-browser-header').style.background = 'linear-gradient(135deg,#047857,#0d9488)';
    document.getElementById('people-browser-search').value = '';
    document.getElementById('people-browser-search').classList.remove('hidden');
    document.getElementById('people-browser-list').innerHTML = `<div class="text-center py-8 text-slate-400 text-xs"><i class="fas fa-spinner fa-spin text-lg text-slate-300 mb-2 block"></i> ${t('loadingText')}</div>`;

    if (_peopleBrowserUnsub) { _peopleBrowserUnsub(); _peopleBrowserUnsub = null; }
    const friendUids = [..._myFriendsSentIds, ..._myFriendsRecvIds];
    if (friendUids.length === 0) {
      _peopleBrowserData = [];
      document.getElementById('people-browser-list').innerHTML = `<div class="text-center py-10 text-slate-400 text-xs font-medium"><i class="fas fa-user-group text-2xl text-slate-300 mb-2 block"></i> ${t('noFriendsYetLabel')}</div>`;
      return;
    }
    try {
      const snaps = await Promise.all(friendUids.map(uid => firestore.collection('public_profiles').doc(uid).get()));
      _peopleBrowserData = snaps.filter(s => s.exists).map(s => ({ id: s.id, ...s.data() }));
      renderPeopleBrowserList(_peopleBrowserData);
    } catch (e) {
      document.getElementById('people-browser-list').innerHTML = `<div class="text-center py-8 text-red-400 text-xs">${t('couldNotLoadLabel')}: ${e.message}</div>`;
    }
  }

  // ✅ ইনকামিং পেন্ডিং ফ্রেন্ড রিকোয়েস্ট ইনবক্স — হেডারের ব্যাজে ট্যাপ করলে খুলবে
  function openFriendRequestsInbox() {
    if (!currentUser) { alert(t('loginFirstAlert')); return; }
    _peopleBrowserType = 'inbox';
    const modal = document.getElementById('people-browser-modal');
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    document.getElementById('people-browser-title').innerText = t('friendRequestsInboxTitle');
    document.getElementById('people-browser-sub').innerText = t('friendRequestsInboxSub');
    document.getElementById('people-browser-icon').className = 'fas fa-user-plus text-white text-sm';
    document.getElementById('people-browser-header').style.background = 'linear-gradient(135deg,#be123c,#e11d48)';
    const searchEl = document.getElementById('people-browser-search');
    searchEl.value = '';
    searchEl.classList.add('hidden');
    document.getElementById('people-browser-list').innerHTML = `<div class="text-center py-8 text-slate-400 text-xs"><i class="fas fa-spinner fa-spin text-lg text-slate-300 mb-2 block"></i> ${t('loadingText')}</div>`;

    if (_peopleBrowserUnsub) { _peopleBrowserUnsub(); _peopleBrowserUnsub = null; }
    _peopleBrowserUnsub = firestore.collection('friend_requests')
      .where('toUid', '==', currentUser.uid).where('status', '==', 'pending')
      .onSnapshot(async snap => {
        const fromUids = snap.docs.map(d => d.data().fromUid);
        if (fromUids.length === 0) {
          _peopleBrowserData = [];
          document.getElementById('people-browser-list').innerHTML = `<div class="text-center py-10 text-slate-400 text-xs font-medium"><i class="fas fa-user-check text-2xl text-slate-300 mb-2 block"></i> ${t('noPendingRequestsLabel')}</div>`;
          return;
        }
        try {
          const snaps = await Promise.all(fromUids.map(uid => firestore.collection('public_profiles').doc(uid).get()));
          _peopleBrowserData = snaps.filter(s => s.exists).map(s => ({ id: s.id, ...s.data() }));
          renderPeopleBrowserList(_peopleBrowserData);
        } catch (e) {
          document.getElementById('people-browser-list').innerHTML = `<div class="text-center py-8 text-red-400 text-xs">${t('couldNotLoadLabel')}: ${e.message}</div>`;
        }
      }, () => {});
  }

  // ============================================================
  // ✅ ফলোয়ার সিস্টেম — একমুখী (friend-এর মতো একসেপ্ট লাগে না)
  // ============================================================
  function followDocId(followerUid, followingUid) { return followerUid + '_' + followingUid; }

  async function isFollowingUser(myUid, otherUid) {
    try {
      const doc = await firestore.collection('followers').doc(followDocId(myUid, otherUid)).get();
      return doc.exists;
    } catch (e) {
      console.error('isFollowingUser error:', e);
      return false;
    }
  }

  async function toggleFollowUser(targetUid, shouldFollow) {
    if (!currentUser) { alert(t('loginFirstAlert')); return; }
    try {
      const ref = firestore.collection('followers').doc(followDocId(currentUser.uid, targetUid));
      if (shouldFollow) {
        await ref.set({
          followerUid: currentUser.uid,
          followingUid: targetUid,
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
      } else {
        await ref.delete();
      }
      await openUserProfileDetail(targetUid);
    } catch (e) {
      alert(t('friendActionFailedLabel') + ': ' + e.message);
    }
  }

  let _myFollowerCountUnsub = null;
  let _myFollowerIds = new Set();

  function initMyFollowerCountListener(uid) {
    if (_myFollowerCountUnsub) _myFollowerCountUnsub();
    _myFollowerCountUnsub = firestore.collection('followers')
      .where('followingUid', '==', uid)
      .onSnapshot(snap => {
        _myFollowerIds = new Set(snap.docs.map(d => d.data().followerUid));
        updateMyFollowerCountUI();
      }, () => {});
  }

  function updateMyFollowerCountUI() {
    const el = document.getElementById('tej-follower-count');
    if (el) el.innerText = _myFollowerIds.size;
  }

  // ✅ নিজের ফলোয়ার লিস্ট দেখা — তেজ ফিড হেডারের ফলোয়ার বাটনে ট্যাপ করলে খুলবে
  async function openMyFollowersList() {
    if (!currentUser) { alert(t('loginFirstAlert')); return; }
    _peopleBrowserType = 'followers';
    const modal = document.getElementById('people-browser-modal');
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    document.getElementById('people-browser-title').innerText = t('myFollowersTitle');
    document.getElementById('people-browser-sub').innerText = t('myFollowersSub');
    document.getElementById('people-browser-icon').className = 'fas fa-users text-white text-sm';
    document.getElementById('people-browser-header').style.background = 'linear-gradient(135deg,#6d28d9,#9333ea)';
    document.getElementById('people-browser-search').value = '';
    document.getElementById('people-browser-search').classList.remove('hidden');
    document.getElementById('people-browser-list').innerHTML = `<div class="text-center py-8 text-slate-400 text-xs"><i class="fas fa-spinner fa-spin text-lg text-slate-300 mb-2 block"></i> ${t('loadingText')}</div>`;

    if (_peopleBrowserUnsub) { _peopleBrowserUnsub(); _peopleBrowserUnsub = null; }
    const followerUids = [..._myFollowerIds];
    if (followerUids.length === 0) {
      _peopleBrowserData = [];
      document.getElementById('people-browser-list').innerHTML = `<div class="text-center py-10 text-slate-400 text-xs font-medium"><i class="fas fa-users text-2xl text-slate-300 mb-2 block"></i> ${t('noFollowersYetLabel')}</div>`;
      return;
    }
    try {
      const snaps = await Promise.all(followerUids.map(uid => firestore.collection('public_profiles').doc(uid).get()));
      _peopleBrowserData = snaps.filter(s => s.exists).map(s => ({ id: s.id, ...s.data() }));
      renderPeopleBrowserList(_peopleBrowserData);
    } catch (e) {
      document.getElementById('people-browser-list').innerHTML = `<div class="text-center py-8 text-red-400 text-xs">${t('couldNotLoadLabel')}: ${e.message}</div>`;
    }
  }

  // ============================================================
  // ✅ পিয়ার-টু-পিয়ার চ্যাট (কাস্টমার↔কাস্টমার / কাস্টমার↔সেলার)
  // ============================================================
  function getPeerChatId(uidA, uidB) {
    return [uidA, uidB].sort().join('_');
  }

  function openPeerChatModal(otherUid, otherName, otherPhoto) {
    if (!currentUser) return;
    closeUserProfileDetail();
    _peerChatOtherUid = otherUid;
    _peerChatOtherName = otherName || t('roleLabelCustomer');
    _peerChatOtherPhoto = otherPhoto || '';
    _peerChatId = getPeerChatId(currentUser.uid, otherUid);
    _peerChatSeenScheduled.clear(); // ✅ নতুন চ্যাট খুললে আগের ট্র্যাকিং রিসেট
    _peerChatAutoSaved.clear();
    // ✅ NEW (feature-15): নতুন চ্যাট খুললে ফিউচার মেসেজ শিডিউল প্যানেল/ট্র্যাকিং রিসেট
    _peerScheduleInboxBumped.clear();
    _peerChatLastMsgs = [];
    if (_peerScheduleActive) togglePeerScheduleWrap();
    // ✅ [FIX #3] নতুন চ্যাট খোলার আগে আগের চ্যাটের সব pending delete timer বাতিল করো —
    // না করলে আগের চ্যাটের message-এর জন্য শিডিউল করা timer নতুন চ্যাটেও চলতে থাকত
    _peerDeleteTimers.forEach(tid => clearTimeout(tid));
    _peerDeleteTimers.clear();
    document.getElementById('peer-chat-title').innerText = _peerChatOtherName;
    document.getElementById('peer-chat-sub').innerText = t('peerChatSubLabel');
    document.getElementById('peer-chat-avatar').src = otherPhoto || ('https://placehold.co/40x40/f1f5f9/64748b?text=' + (otherName?.[0] || '?'));
    document.getElementById('peer-chat-messages').innerHTML = `<div class="text-center text-slate-400 text-xs py-6"><i class="fas fa-spinner fa-spin"></i></div>`;
    document.getElementById('peer-chat-modal').classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    // ✅ কল বাটন শুধু ফ্রেন্ড হলেই দেখাবে
    document.getElementById('peer-chat-audio-call-btn').classList.add('hidden');
    document.getElementById('peer-chat-video-call-btn').classList.add('hidden');
    getFriendStatus(currentUser.uid, otherUid).then(fs => {
      if (fs.state === 'accepted') {
        document.getElementById('peer-chat-audio-call-btn').classList.remove('hidden');
        document.getElementById('peer-chat-video-call-btn').classList.remove('hidden');
      }
    });

    if (_peerChatUnsub) { _peerChatUnsub(); _peerChatUnsub = null; }
    _peerChatUnsub = firestore.collection('peer_chats').doc(_peerChatId).collection('messages')
      .orderBy('createdAt', 'asc').limit(200)
      .onSnapshot(snap => {
        renderPeerChatMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      }, e => {
        document.getElementById('peer-chat-messages').innerHTML = `<div class="text-center text-red-400 text-xs py-6">${t('couldNotLoadLabel')}: ${e.message}</div>`;
      });

    // ✅ NEW (feature-15): ফিউচার মেসেজের শিডিউল সময় পার হলে নতুন কোনো Firestore ইভেন্ট না হলেও
    // অটো-রিভিল করার জন্য পিরিয়ডিক রি-রেন্ডার (ঠিক যেমন তেজ ফিড-এর ফিউচার পোস্টের ক্ষেত্রে করা হয়েছে)
    if (_peerScheduleRefreshTimer) clearInterval(_peerScheduleRefreshTimer);
    _peerScheduleRefreshTimer = setInterval(() => {
      if (_peerChatLastMsgs.length) renderPeerChatMessages(_peerChatLastMsgs);
    }, 30000);
  }

  function closePeerChatModal() {
    document.getElementById('peer-chat-modal').classList.add('hidden');
    document.body.style.overflow = 'auto';
    if (_peerChatUnsub) { _peerChatUnsub(); _peerChatUnsub = null; }
    // ✅ NEW (feature-15): ফিউচার মেসেজ অটো-রিভিল টাইমার বন্ধ করো — না হলে চ্যাট বন্ধ করার পরও ব্যাকগ্রাউন্ডে চলতে থাকত
    if (_peerScheduleRefreshTimer) { clearInterval(_peerScheduleRefreshTimer); _peerScheduleRefreshTimer = null; }
    if (_voiceRecorder && _voiceRecorder.state === 'recording') cancelPeerChatVoiceRecording();
    _peerChatOtherUid = null; _peerChatId = null;
  }

  // ✅ NEW (feature-15): ফিউচার মেসেজ — scheduledAt এখনো ভবিষ্যতে থাকলে true
  function _peerMsgIsPending(m) {
    return !!(m.scheduledAt && m.scheduledAt.toMillis && m.scheduledAt.toMillis() > Date.now());
  }

  function renderPeerChatMessages(msgs) {
    const container = document.getElementById('peer-chat-messages');
    if (!container) return;
    _peerChatLastMsgs = msgs; // ✅ NEW (feature-15): পিরিয়ডিক রি-রেন্ডার টাইমারের জন্য ক্যাশ করে রাখো

    // ✅ NEW (feature-15): ফিউচার মেসেজ — যার scheduledAt এখনো আসেনি, তা recipient-এর কাছে
    // সম্পূর্ণ অদৃশ্য থাকবে; sender নিজের পাঠানো শিডিউলড মেসেজ "শিডিউলড" ব্যাজ সহ দেখতে পারবে
    const visibleMsgs = msgs.filter(m => {
      const mine = m.senderUid === currentUser?.uid;
      return mine || !_peerMsgIsPending(m);
    });

    if (visibleMsgs.length === 0) {
      container.innerHTML = `<div class="text-center text-slate-400 text-xs py-6">${t('peerChatEmptyLabel')}</div>`;
      return;
    }
    container.innerHTML = visibleMsgs.map(m => {
      const mine = m.senderUid === currentUser?.uid;
      if (mine && _peerMsgIsPending(m)) {
        const dateLabel = m.scheduledAt.toDate().toLocaleString('bn-BD', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
        return `<div class="flex justify-end" id="peer-msg-${m.id}">
          <div class="chat-bubble-customer relative opacity-70" style="transition:opacity 0.4s,transform 0.4s">
            <div class="flex items-center gap-1.5 text-[10px] opacity-80 mb-1"><i class="fas fa-clock"></i> শিডিউলড — ${escapeHtml(dateLabel)}</div>
            ${buildPeerChatBubbleContent(m, mine)}
          </div>
        </div>`;
      }
      return `<div class="flex ${mine ? 'justify-end' : 'justify-start'}" id="peer-msg-${m.id}">
        <div class="${mine ? 'chat-bubble-customer' : 'chat-bubble-seller'} relative" style="transition:opacity 0.4s,transform 0.4s">${buildPeerChatBubbleContent(m, mine)}</div>
      </div>`;
    }).join('');
    container.scrollTop = container.scrollHeight;

    // ✅ মেসেজ পড়ার সাথে সাথে অটো-ডিলিট — শুধু আমি যেগুলো পাঠাইনি (অর্থাৎ আমি পড়ছি/রিসিভ করছি) সেগুলোই
    // কিছুক্ষণ (দেখার সময়) পর Firestore থেকে স্থায়ীভাবে মুছে যাবে — দুজনের চ্যাট থেকেই অদৃশ্য হয়ে যাবে
    const chatIdAtSchedule = _peerChatId;
    msgs.forEach(m => {
      // ✅ NEW (feature-15): শিডিউল সময় না হওয়া পর্যন্ত seen/heard/delete — কোনো লজিকই চালু হবে না
      if (_peerMsgIsPending(m)) return;
      const mine = m.senderUid === currentUser?.uid;
      if (mine) {
        // ✅ ফলব্যাক: রিসিভার মেসেজটা দেখে/শুনে ফেলার পরও (heardAt/seenAt সেট হয়ে গেছে) যদি রিসিভার
        // আর চ্যাটে ফিরে না আসে (অ্যাপ বন্ধ করে দেয়), sender-এর ক্লায়েন্ট খোলা থাকলে সেটাই বাকি
        // সময়ের পর cleanup করে দেবে — Firestore rules-এ sender-কেও এই শর্তে ডিলিট করার অনুমতি আছে
        if (_peerChatSeenScheduled.has(m.id)) return;
        const heardOrSeenAt = m.type === 'voice' ? m.heardAt : ((m.type === 'text' || m.type === 'image') ? m.seenAt : null);
        if (heardOrSeenAt) {
          _peerChatSeenScheduled.add(m.id);
          const remainingMs = (2 * 60 * 1000) - (Date.now() - heardOrSeenAt.toMillis());
          setTimeout(() => {
            firestore.collection('peer_chats').doc(chatIdAtSchedule)
              .collection('messages').doc(m.id).delete().catch(() => {});
          }, Math.max(remainingMs, 0));
        }
        return;
      }
      // ✅ NEW (feature-15): ফিউচার মেসেজ এইমাত্র "ডেলিভার" হলো (শিডিউল সময় পার হয়ে গেছে) — চ্যাট
      // ইনবক্সের lastMessage/updatedAt একবার আপডেট করে দাও, যাতে ইনবক্স লিস্টে ঠিকভাবে দেখায়
      if (m.scheduledAt && !_peerScheduleInboxBumped.has(m.id)) {
        _peerScheduleInboxBumped.add(m.id);
        firestore.collection('peer_chats').doc(chatIdAtSchedule).set({
          participants: [currentUser.uid, _peerChatOtherUid],
          lastMessage: m.type === 'image' ? t('photoLabel') : (m.type === 'voice' ? t('voiceMessageLabel') : (m.text || '')),
          lastSenderUid: m.senderUid,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true }).catch(() => {});
      }
      // ✅ ছবি/ভয়েস মেসেজ রিসিভ হলে ডিভাইসে অটো-সেভ করো (মেসেজ ডিলিট হওয়ার আগেই)
      if ((m.type === 'image' || m.type === 'voice') && m.mediaData && !_peerChatAutoSaved.has(m.id)) {
        _peerChatAutoSaved.add(m.id);
        autoSaveMediaToDevice(m.mediaData, m.type);
      }
      if (_peerChatSeenScheduled.has(m.id)) return;
      _peerChatSeenScheduled.add(m.id);
      // ✅ ভয়েস মেসেজ: চ্যাট খোলা/দেখার সাথে সাথে ডিলিট হবে না — কাস্টমার আসলে প্লে করে শোনার ২ মিনিট
      // পর ডিলিট হবে (প্লে করার লজিক togglePeerVoicePlayback / markPeerVoiceHeard-এ)। এখানে শুধু
      // আগে থেকে heardAt সেট থাকলে (অন্য সেশনে শোনা হয়েছিল) বাকি সময়ের জন্য টাইমার রিজিউম করা হলো।
      if (m.type === 'voice') {
        if (m.heardAt && !_peerVoiceHeardMarked.has(m.id)) {
          _peerVoiceHeardMarked.add(m.id);
          const elapsedMs = Date.now() - m.heardAt.toMillis();
          const remainingMs = (2 * 60 * 1000) - elapsedMs;
          if (remainingMs <= 0) {
            firestore.collection('peer_chats').doc(chatIdAtSchedule)
              .collection('messages').doc(m.id).delete().catch(() => {});
          } else {
            setTimeout(() => {
              firestore.collection('peer_chats').doc(chatIdAtSchedule)
                .collection('messages').doc(m.id).delete().catch(() => {});
            }, remainingMs);
          }
        }
        return;
      }
      // ✅ টেক্সট/ছবি মেসেজ: চ্যাটে দেখা মাত্রই (একবারই) seenAt সেট হবে Firestore-এ, তারপর ঠিক
      // ২ মিনিট পর ফেইড-আউট করে ডিলিট হয়ে যাবে। অ্যাপ বন্ধ হয়ে গেলেও seenAt থেকে যায়, তাই পরের
      // বার চ্যাট খোলার সময় বাকি সময়ের হিসাব করে টাইমার আবার রিজিউম হয় (নিচের scheduleFadeAndDelete)।
      if (m.seenAt) {
        const elapsedMs = Date.now() - m.seenAt.toMillis();
        const remainingMs = (2 * 60 * 1000) - elapsedMs;
        scheduleFadeAndDelete(m.id, chatIdAtSchedule, Math.max(remainingMs, 0));
      } else {
        markPeerMessageSeen(chatIdAtSchedule, m.id);
        scheduleFadeAndDelete(m.id, chatIdAtSchedule, 2 * 60 * 1000);
      }
    });
  }

  // ✅ ফেইড-আউট অ্যানিমেশন দেখিয়ে নির্দিষ্ট সময় পর মেসেজটা Firestore থেকে স্থায়ীভাবে ডিলিট করো
  function scheduleFadeAndDelete(msgId, chatId, delayMs) {
    // ✅ [FIX #3] একই msgId-এর পুরনো টাইমার থাকলে আগে বাতিল করো (re-render race condition এড়াতে)
    if (_peerDeleteTimers.has(msgId)) clearTimeout(_peerDeleteTimers.get(msgId));
    const tid = setTimeout(() => {
      _peerDeleteTimers.delete(msgId);
      const bubbleWrap = document.getElementById('peer-msg-' + msgId);
      if (bubbleWrap) {
        bubbleWrap.style.opacity = '0';
        bubbleWrap.style.transform = 'scale(0.92)';
      }
      setTimeout(() => {
        firestore.collection('peer_chats').doc(chatId)
          .collection('messages').doc(msgId).delete().catch(() => {});
      }, 400);
    }, delayMs);
    _peerDeleteTimers.set(msgId, tid); // ✅ [FIX #3] Timer ID রেখে দাও যাতে চ্যাট বন্ধে cancel করা যায়
  }

  // ✅ টেক্সট/ছবি মেসেজ চ্যাটে দেখা মাত্রই seenAt টাইমস্ট্যাম্প সেট করো (একবারই — সিকিউরিটি রুলে
  // seenAt == null চেক করা আছে)
  function markPeerMessageSeen(chatId, msgId) {
    firestore.collection('peer_chats').doc(chatId).collection('messages').doc(msgId)
      .update({ seenAt: firebase.firestore.FieldValue.serverTimestamp() }).catch(() => {});
  }

  // ✅ চ্যাট বাবলের ভেতরের কনটেন্ট তৈরি করো (টেক্সট/ছবি/ভয়েস — টাইপ অনুযায়ী)
  function buildPeerChatBubbleContent(m, mine) {
    if (m.type === 'image' && m.mediaData) {
      return `<img src="${m.mediaData}" loading="lazy" class="rounded-xl max-w-[200px] max-h-[260px] object-cover cursor-pointer" onclick="window.open('${m.mediaData}', '_blank')"/>
        <button onclick="event.stopPropagation(); sharePeerMediaToDevice('${m.id}')" class="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/40 text-white flex items-center justify-center">
          <i class="fas fa-download text-[10px]"></i>
        </button>`;
    }
    if (m.type === 'voice' && m.mediaData) {
      return `<div class="flex items-center gap-2 min-w-[140px]">
          <button onclick="togglePeerVoicePlayback('${m.id}', ${mine})" class="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0" id="peer-voice-btn-${m.id}">
            <i class="fas fa-play text-xs"></i>
          </button>
          <i class="fas fa-wave-square text-xs opacity-60"></i>
          <span class="text-[10px] opacity-80 ml-auto" id="peer-voice-dur-${m.id}">${formatVoiceDuration(m.durationSec || 0)}</span>
          <audio id="peer-voice-${m.id}" src="${m.mediaData}" class="hidden" onended="resetPeerVoiceBtn('${m.id}')"></audio>
        </div>`;
    }
    return escapeHtml(m.text || '');
  }

  function formatVoiceDuration(secs) {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
  }

  function togglePeerVoicePlayback(msgId, mine) {
    const audioEl = document.getElementById('peer-voice-' + msgId);
    const btn = document.getElementById('peer-voice-btn-' + msgId);
    if (!audioEl) return;
    document.querySelectorAll('audio').forEach(a => { if (a.id !== 'peer-voice-' + msgId) a.pause(); });
    if (audioEl.paused) {
      audioEl.play();
      if (btn) btn.innerHTML = '<i class="fas fa-pause text-xs"></i>';
      // ✅ যিনি ভয়েস মেসেজটি পাঠান নি (অর্থাৎ কাস্টমার/রিসিভার) তিনি প্রথমবার প্লে করলেই
      // "শোনা হয়েছে" মার্ক হবে — তারপর ঠিক ২ মিনিট পর মেসেজটা স্থায়ীভাবে ডিলিট হয়ে যাবে
      if (!mine && _peerChatId) {
        markPeerVoiceHeard(_peerChatId, msgId);
      }
    } else {
      audioEl.pause();
      if (btn) btn.innerHTML = '<i class="fas fa-play text-xs"></i>';
    }
  }
  function resetPeerVoiceBtn(msgId) {
    const btn = document.getElementById('peer-voice-btn-' + msgId);
    if (btn) btn.innerHTML = '<i class="fas fa-play text-xs"></i>';
  }

  // ✅ ভয়েস মেসেজ প্রথমবার শোনা হলে Firestore-এ heardAt টাইমস্ট্যাম্প সেট করো (একবারই — সিকিউরিটি
  // রুলে heardAt == null চেক করা আছে), তারপর ঠিক ২ মিনিট পর মেসেজটা ডিলিট করে দাও। অ্যাপ বন্ধ হয়ে
  // গেলেও heardAt-টা Firestore-এ থেকে যায়, তাই renderPeerChatMessages পরের বার চ্যাট খোলার সময়
  // বাকি সময়ের জন্য টাইমার আবার বসিয়ে দেয় (বা সময় পার হয়ে গেলে সাথে সাথে ডিলিট করে)।
  function markPeerVoiceHeard(chatId, msgId) {
    if (_peerVoiceHeardMarked.has(msgId)) return; // একই সেশনে দ্বিতীয়বার মার্ক/টাইমার বসানো এড়াতে
    _peerVoiceHeardMarked.add(msgId);
    const ref = firestore.collection('peer_chats').doc(chatId).collection('messages').doc(msgId);
    ref.update({ heardAt: firebase.firestore.FieldValue.serverTimestamp() }).catch(() => {});
    setTimeout(() => {
      ref.delete().catch(() => {});
    }, 2 * 60 * 1000);
  }

  // ✅ ছবি/ভয়েস মেসেজ রিসিভ হওয়ার সাথে সাথেই ডিভাইসে অটো-সেভ — এই অ্যাপ থেকেই, কোনো ওয়েবসাইট
  // সরাসরি ফোনের গ্যালারি অ্যাপে সাইলেন্টলি ফাইল লিখতে পারে না (ব্রাউজার/OS সিকিউরিটির কারণে — এটা
  // সব ওয়েবসাইটের জন্যই সত্য, এই অ্যাপের সীমাবদ্ধতা নয়)। এখানে যা হবে: ব্রাউজার অটোমেটিক ডিভাইসের
  // Downloads ফোল্ডারে ফাইলটা সেভ করে দেবে — কোনো ট্যাপ লাগবে না। কম্পিউটারে এটা ১০০% "automatic"।
  // মোবাইলে Android-এ অনেক Gallery অ্যাপ Downloads ফোল্ডার স্ক্যান করে বলে ছবি প্রায়ই গ্যালারিতেও
  // দেখা যায়; iPhone-এ Safari আরও কড়া, তাই বাবলে একটা ম্যানুয়াল "Save" বাটনও রাখা হলো বিকল্প হিসেবে।
  function autoSaveMediaToDevice(mediaData, type) {
    try {
      // ✅ [FIX #5] voice format browser-ভেদে ভিন্ন হতে পারে (webm/mp4/ogg) —
      // data URL-এর MIME type থেকে সঠিক extension বের করো
      let ext, prefix;
      if (type === 'voice') {
        prefix = 'voice_message';
        const mime = mediaData.split(';')[0].replace('data:', '');
        ext = mime.includes('mp4') || mime.includes('m4a') ? 'm4a'
            : mime.includes('ogg') ? 'ogg'
            : 'webm'; // default
      } else {
        prefix = 'photo';
        ext = 'jpg';
      }
      const a = document.createElement('a');
      a.href = mediaData;
      a.download = `bdbigbazzar_${prefix}_${Date.now()}.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (e) { console.error('Auto-save to device failed:', e); }
  }

  // ✅ ম্যানুয়াল "Save"/শেয়ার বাটন — মোবাইলে নেটিভ শেয়ার শিট থেকে সরাসরি গ্যালারিতে সেভ করার সুযোগ দেয়
  async function sharePeerMediaToDevice(msgId) {
    const imgEl = document.querySelector(`#peer-msg-${msgId} img`);
    const mediaData = imgEl ? imgEl.src : null;
    if (!mediaData) return;
    try {
      const res = await fetch(mediaData);
      const blob = await res.blob();
      const file = new File([blob], `bdbigbazzar_photo_${Date.now()}.jpg`, { type: blob.type || 'image/jpeg' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file] });
        return;
      }
    } catch (e) { /* ব্যবহারকারী শেয়ার বাতিল করলে বা আনসাপোর্টেড হলে নিচের ফলব্যাকে যাবে */ }
    autoSaveMediaToDevice(mediaData, 'image');
  }

  // ============================================================
  // ✅ ছবি পাঠানো — সিলেক্ট করলে রিসাইজ+কম্প্রেস করে base64 আকারে পাঠানো হয়
  // (Firestore ডকুমেন্ট ১MB লিমিটের মধ্যে রাখার জন্য)
  // ============================================================
  function triggerPeerChatImagePicker() {
    if (!_peerChatId) return;
    document.getElementById('peer-chat-image-input').click();
  }

  async function handlePeerChatImageSelected(input) {
    const file = input.files[0];
    input.value = '';
    if (!file || !_peerChatId) return;
    if (!file.type.startsWith('image/')) { alert(t('onlyImageAllowedLabel')); return; }
    try {
      const compressed = await compressImageToBase64(file, 1000, 0.65);
      if (compressed.length > 900000) {
        alert(t('imageTooLargeLabel'));
        return;
      }
      await sendPeerChatMediaMessage('image', compressed);
    } catch (e) {
      alert(t('mediaSendFailedLabel') + ': ' + e.message);
    }
  }

  function compressImageToBase64(file, maxDim, quality) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          let { width, height } = img;
          if (width > maxDim || height > maxDim) {
            if (width > height) { height = Math.round(height * maxDim / width); width = maxDim; }
            else { width = Math.round(width * maxDim / height); height = maxDim; }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width; canvas.height = height;
          canvas.getContext('2d').drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.onerror = () => reject(new Error('Image load failed'));
        img.src = e.target.result;
      };
      reader.onerror = () => reject(new Error('File read failed'));
      reader.readAsDataURL(file);
    });
  }

  // ============================================================
  // ✅ NEW (feature-63): প্রোফাইল ফটো ও কভার ফটো আপলোড (Facebook-স্টাইল প্রোফাইল)
  // ============================================================
  async function processProfilePhotoUpload(input) {
    if (!currentUser || !input.files || !input.files[0]) return;
    try {
      const base64 = await compressImageToBase64(input.files[0], 500, 0.75);
      await firestore.collection('public_profiles').doc(currentUser.uid).set({
        photo: base64,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
      showCartToast('প্রোফাইল ছবি আপডেট হয়েছে ✅', 'success');
      openUserProfileDetail(currentUser.uid);
    } catch (e) {
      showCartToast('ছবি আপলোড ব্যর্থ: ' + e.message, 'error');
    }
    input.value = '';
  }

  async function processCoverPhotoUpload(input) {
    if (!currentUser || !input.files || !input.files[0]) return;
    try {
      const base64 = await compressImageToBase64(input.files[0], 1000, 0.7);
      await firestore.collection('public_profiles').doc(currentUser.uid).set({
        coverPhoto: base64,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
      showCartToast('কভার ফটো আপডেট হয়েছে ✅', 'success');
      openUserProfileDetail(currentUser.uid);
    } catch (e) {
      showCartToast('কভার ফটো আপলোড ব্যর্থ: ' + e.message, 'error');
    }
    input.value = '';
  }

  // ============================================================
  // ✅ NEW (feature-63): "সম্পর্কে" তথ্য (Work/Hometown/City/Links) এডিট
  // ============================================================
  function openProfileAboutEditSheet() {
    if (!currentUser) { alert(t('loginFirstAlert')); return; }
    firestore.collection('public_profiles').doc(currentUser.uid).get().then(doc => {
      const d = doc.exists ? doc.data() : {};
      document.getElementById('about-edit-work').value = d.work || '';
      document.getElementById('about-edit-hometown').value = d.hometown || '';
      document.getElementById('about-edit-city').value = d.currentCity || '';
      const links = d.links || [];
      document.getElementById('about-edit-link1').value = links[0] || '';
      document.getElementById('about-edit-link2').value = links[1] || '';
      document.getElementById('about-edit-link3').value = links[2] || '';
      openBottomSheet('profile-about-edit-sheet');
    }).catch(() => openBottomSheet('profile-about-edit-sheet'));
  }

  async function saveProfileAboutInfo() {
    if (!currentUser) return;
    const work = document.getElementById('about-edit-work').value.trim().slice(0, 60);
    const hometown = document.getElementById('about-edit-hometown').value.trim().slice(0, 60);
    const currentCity = document.getElementById('about-edit-city').value.trim().slice(0, 60);
    const links = [
      document.getElementById('about-edit-link1').value.trim(),
      document.getElementById('about-edit-link2').value.trim(),
      document.getElementById('about-edit-link3').value.trim()
    ].filter(Boolean).slice(0, 3);
    try {
      await firestore.collection('public_profiles').doc(currentUser.uid).set({
        work, hometown, currentCity, links,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
      closeBottomSheet('profile-about-edit-sheet');
      showCartToast('প্রোফাইল তথ্য সেভ হয়েছে ✅', 'success');
      openUserProfileDetail(currentUser.uid);
    } catch (e) {
      showCartToast('সেভ ব্যর্থ: ' + e.message, 'error');
    }
  }

  // ============================================================
  // ✅ NEW (feature-63): যেকোনো ইউজারের accepted বন্ধু তালিকা (গ্রিড প্রিভিউয়ের জন্য)
  // ============================================================
  async function getUserFriendUids(uid) {
    try {
      const [a, b] = await Promise.all([
        firestore.collection('friend_requests').where('fromUid', '==', uid).where('status', '==', 'accepted').get(),
        firestore.collection('friend_requests').where('toUid', '==', uid).where('status', '==', 'accepted').get()
      ]);
      return [...a.docs.map(d => d.data().toUid), ...b.docs.map(d => d.data().fromUid)];
    } catch (e) {
      return [];
    }
  }

  async function loadUserProfileFriendsGrid(uid) {
    const grid = document.getElementById('user-profile-friends-grid');
    const countEl = document.getElementById('user-profile-friends-count');
    if (!grid) return;
    try {
      const friendUids = await getUserFriendUids(uid);
      if (countEl) countEl.innerText = friendUids.length;
      if (friendUids.length === 0) {
        grid.innerHTML = `<div class="col-span-3 text-center py-4 text-slate-300 text-[11px]">এখনো কোনো বন্ধু নেই</div>`;
        return;
      }
      const preview = friendUids.slice(0, 9);
      const snaps = await Promise.all(preview.map(fid => firestore.collection('public_profiles').doc(fid).get()));
      grid.innerHTML = snaps.filter(s => s.exists).map(s => {
        const d = s.data();
        const av = d.photo || ('https://placehold.co/80x80/f1f5f9/64748b?text=' + (d.name?.[0] || '?'));
        return `<div class="cursor-pointer" onclick="openUserProfileDetail('${s.id}')">
          <img src="${av}" loading="lazy" class="w-full aspect-square rounded-xl object-cover bg-slate-100" onerror="this.src='https://placehold.co/80x80/f1f5f9/64748b?text=?'">
          <p class="text-[9px] font-bold text-slate-600 mt-1 truncate text-center">${escapeHtml(d.name || '')}</p>
        </div>`;
      }).join('');
    } catch (e) {
      grid.innerHTML = `<div class="col-span-3 text-center py-4 text-red-300 text-[11px]">লোড ব্যর্থ</div>`;
    }
  }

  // ============================================================
  // ✅ ভয়েস মেসেজ রেকর্ডিং — MediaRecorder API (সর্বোচ্চ ৬০ সেকেন্ড)
  // ============================================================
  async function togglePeerChatVoiceRecording() {
    if (!_peerChatId) return;
    if (_voiceRecorder && _voiceRecorder.state === 'recording') {
      stopPeerChatVoiceRecording();
      return;
    }
    try {
      _voiceStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (e) {
      alert(t('micPermissionDeniedLabel'));
      return;
    }
    _voiceChunks = [];
    _voiceCancelled = false;
    const mimeType = (window.MediaRecorder && MediaRecorder.isTypeSupported('audio/webm;codecs=opus'))
      ? 'audio/webm;codecs=opus' : 'audio/webm';
    try {
      _voiceRecorder = new MediaRecorder(_voiceStream, { mimeType, audioBitsPerSecond: 24000 });
    } catch (e) {
      _voiceRecorder = new MediaRecorder(_voiceStream);
    }
    _voiceRecorder.ondataavailable = (e) => { if (e.data && e.data.size > 0) _voiceChunks.push(e.data); };
    _voiceRecorder.onstop = handlePeerChatVoiceRecordingStopped;
    _voiceRecorder.start();
    _voiceStartTime = Date.now();
    document.getElementById('peer-chat-input-row').classList.add('hidden');
    document.getElementById('peer-chat-voice-recording-bar').classList.remove('hidden');
    document.getElementById('peer-chat-voice-recording-bar').classList.add('flex');
    updatePeerChatVoiceTimer();
    _voiceTimerInterval = setInterval(updatePeerChatVoiceTimer, 200);
    _voiceMaxTimeout = setTimeout(() => {
      if (_voiceRecorder && _voiceRecorder.state === 'recording') stopPeerChatVoiceRecording();
    }, 60000);
  }

  function updatePeerChatVoiceTimer() {
    if (!_voiceStartTime) return;
    const secs = Math.floor((Date.now() - _voiceStartTime) / 1000);
    const el = document.getElementById('peer-chat-voice-timer');
    if (el) el.innerText = formatVoiceDuration(secs);
  }

  function stopPeerChatVoiceRecording() {
    // ✅ [FIX #2] recorder.stop() অ্যাসিঙ্ক্রোনাস — onstop callback পরে ফায়ার হয়।
    // তাই এখানেই startTime snapshot তুলে রাখো এবং _voiceStartTime null করো,
    // handlePeerChatVoiceRecordingStopped snapshot থেকে duration হিসাব করবে।
    _voiceStopSnapshotTime = _voiceStartTime ? Math.round((Date.now() - _voiceStartTime) / 1000) : 0;
    _voiceStartTime = null;
    if (_voiceRecorder && _voiceRecorder.state === 'recording') _voiceRecorder.stop();
    clearInterval(_voiceTimerInterval); _voiceTimerInterval = null;
    clearTimeout(_voiceMaxTimeout); _voiceMaxTimeout = null;
    if (_voiceStream) { _voiceStream.getTracks().forEach(t => t.stop()); _voiceStream = null; }
    document.getElementById('peer-chat-input-row').classList.remove('hidden');
    document.getElementById('peer-chat-voice-recording-bar').classList.add('hidden');
    document.getElementById('peer-chat-voice-recording-bar').classList.remove('flex');
  }

  function cancelPeerChatVoiceRecording() {
    _voiceCancelled = true;
    stopPeerChatVoiceRecording();
  }

  async function handlePeerChatVoiceRecordingStopped() {
    // ✅ [FIX #2] stopPeerChatVoiceRecording()-এ নেওয়া snapshot ব্যবহার করো —
    // এখানে _voiceStartTime ইতোমধ্যে null, তাই আগের মতো হিসাব করলে duration 0 হয়ে যেত
    const durationSec = _voiceStopSnapshotTime;
    _voiceStopSnapshotTime = 0;
    if (_voiceCancelled) { _voiceCancelled = false; _voiceChunks = []; return; }
    if (durationSec < 1 || _voiceChunks.length === 0) { _voiceChunks = []; return; }
    try {
      const blob = new Blob(_voiceChunks, { type: 'audio/webm' });
      _voiceChunks = [];
      if (blob.size > 650000) { // ✅ [FIX #4] base64 এনকোডিংয়ে ~37% সাইজ বাড়ে: 650000×1.37≈890500 — Firestore 900000 limit-এর ভেতরে নিরাপদ margin রেখে
        alert(t('voiceTooLongLabel'));
        return;
      }
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('Voice read failed'));
        reader.readAsDataURL(blob);
      });
      await sendPeerChatMediaMessage('voice', base64, durationSec);
    } catch (e) {
      alert(t('mediaSendFailedLabel') + ': ' + e.message);
    }
  }

  async function sendPeerChatMediaMessage(type, mediaData, durationSec) {
    if (!currentUser || !_peerChatId) return;
    try {
      const chatRef = firestore.collection('peer_chats').doc(_peerChatId);
      await chatRef.set({
        participants: [currentUser.uid, _peerChatOtherUid],
        lastMessage: type === 'image' ? t('photoLabel') : t('voiceMessageLabel'),
        lastSenderUid: currentUser.uid,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
      const payload = {
        senderUid: currentUser.uid, type, mediaData,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      };
      if (type === 'voice') payload.durationSec = durationSec || 0;
      await chatRef.collection('messages').add(payload);
    } catch (e) {
      alert(t('mediaSendFailedLabel') + ': ' + e.message);
    }
  }

  // ✅ NEW (feature-15): ফিউচার মেসেজ — তারিখ/সময় শিডিউলার প্যানেল টগল
  function togglePeerScheduleWrap() {
    _peerScheduleActive = !_peerScheduleActive;
    const wrap = document.getElementById('peer-chat-schedule-wrap');
    const btn  = document.getElementById('peer-chat-schedule-btn');
    if (!wrap || !btn) return;
    if (_peerScheduleActive) {
      wrap.classList.remove('hidden');
      wrap.classList.add('flex');
      btn.classList.add('bg-amber-100', 'text-amber-600');
      btn.classList.remove('bg-slate-100', 'text-slate-500');
      // ✅ স্মার্ট ডিফল্ট — এখন থেকে ১ ঘণ্টা পরে
      const dateInput = document.getElementById('peer-chat-future-date');
      const timeInput = document.getElementById('peer-chat-future-time');
      if (!dateInput.value || !timeInput.value) {
        const def = new Date(Date.now() + 60 * 60 * 1000);
        const pad = n => String(n).padStart(2, '0');
        dateInput.value = def.getFullYear() + '-' + pad(def.getMonth() + 1) + '-' + pad(def.getDate());
        timeInput.value = pad(def.getHours()) + ':' + pad(def.getMinutes());
      }
    } else {
      wrap.classList.add('hidden');
      wrap.classList.remove('flex');
      btn.classList.remove('bg-amber-100', 'text-amber-600');
      btn.classList.add('bg-slate-100', 'text-slate-500');
    }
  }

  async function sendPeerChatMessage() {
    const input = document.getElementById('peer-chat-input');
    const text = input.value.trim();
    if (!text || !currentUser || !_peerChatId) return;

    // ✅ NEW (feature-15): ফিউচার মেসেজ — শিডিউল প্যানেল চালু থাকলে তারিখ/সময় ভ্যালিডেট করো
    let scheduledAt = null;
    if (_peerScheduleActive) {
      const dateVal = document.getElementById('peer-chat-future-date').value;
      const timeVal = document.getElementById('peer-chat-future-time').value;
      if (!dateVal || !timeVal) { showCartToast('⚠️ মেসেজটি কখন পাঠানো হবে তার তারিখ ও সময় সেট করুন'); return; }
      const sch = new Date(dateVal + 'T' + timeVal);
      if (isNaN(sch.getTime()) || sch.getTime() <= Date.now()) {
        showCartToast('⚠️ ভবিষ্যতের একটি তারিখ ও সময় দিন'); return;
      }
      scheduledAt = sch;
    }

    input.value = '';
    try {
      const chatRef = firestore.collection('peer_chats').doc(_peerChatId);
      const payload = {
        senderUid: currentUser.uid, type: 'text', text: text,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      };
      if (scheduledAt) payload.scheduledAt = scheduledAt;
      if (scheduledAt) {
        // ✅ NEW (feature-15): ফিউচার মেসেজ হলে এখনই lastMessage/updatedAt বদলানো হবে না —
        // না হলে রিসিভার ইনবক্স প্রিভিউতে সময়ের আগেই বুঝে ফেলবেন। শুধু participants নিশ্চিত করো।
        await chatRef.set({ participants: [currentUser.uid, _peerChatOtherUid] }, { merge: true });
      } else {
        await chatRef.set({
          participants: [currentUser.uid, _peerChatOtherUid],
          lastMessage: text,
          lastSenderUid: currentUser.uid,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
      }
      await chatRef.collection('messages').add(payload);
      if (scheduledAt) {
        document.getElementById('peer-chat-future-date').value = '';
        document.getElementById('peer-chat-future-time').value = '';
        togglePeerScheduleWrap();
        showCartToast('✅ মেসেজ শিডিউল করা হয়েছে!');
      }
    } catch (e) {
      alert(t('peerChatSendFailedLabel') + ': ' + e.message);
      input.value = text;
    }
  }

  function startOutgoingCallFromChat(type) {
    if (!_peerChatOtherUid) return;
    startOutgoingCall(_peerChatOtherUid, _peerChatOtherName, _peerChatOtherPhoto, type);
  }

  // ============================================================
  // ✅ অডিও/ভিডিও কল সিস্টেম (WebRTC + Firestore সিগন্যালিং)
  // — শুধুমাত্র "একসেপ্টেড ফ্রেন্ড"-দের মধ্যে কল করা যাবে (areFriends সিকিউরিটি রুলে চেক হয়)
  // ⚠️ নোট: এখানে শুধু পাবলিক STUN সার্ভার ব্যবহার করা হয়েছে (বিনামূল্যে)। কিছু মোবাইল
  // নেটওয়ার্ক/ওয়াইফাই-তে (strict NAT) TURN সার্ভার ছাড়া কানেকশন ফেইল হতে পারে — এটা সব
  // ফ্রি WebRTC সলিউশনের সাধারণ সীমাবদ্धতা, কোডের বাগ নয়।
  // ============================================================

  function initIncomingCallListener(uid) {
    if (_incomingCallUnsub) _incomingCallUnsub();
    _incomingCallUnsub = firestore.collection('calls')
      .where('calleeUid', '==', uid).where('status', '==', 'ringing')
      .onSnapshot(snap => {
        snap.docChanges().forEach(change => {
          if (change.type !== 'added') return;
          const data = change.doc.data();
          const ageMs = data.createdAt && data.createdAt.toMillis ? (Date.now() - data.createdAt.toMillis()) : 0;
          if (ageMs > 60000) return; // ✅ পুরোনো/স্টেল রিংিং কল উপেক্ষা করো
          if (_activeCallId) {
            // ব্যস্ত — অটো-রিজেক্ট
            firestore.collection('calls').doc(change.doc.id).update({ status: 'rejected' }).catch(() => {});
            return;
          }
          showIncomingCall(change.doc.id, data);
        });
      }, () => {});
  }

  function showIncomingCall(callId, data) {
    _activeCallId   = callId;
    _isCallCaller   = false;
    _activeCallType = data.type || 'audio';
    _callOtherUid   = data.callerUid;
    _callOtherName  = data.callerName || t('roleLabelCustomer');
    _callOtherPhoto = data.callerPhoto || '';
    renderCallModal('incoming');
    playRingtone();
    if (navigator.vibrate) navigator.vibrate([500, 300, 500, 300, 500]);
    // ✅ [BUG4 FIX] ট্যাব background-এ থাকলে Push Notification দাও —
    // না হলে ব্যবহারকারী কল আসার কথা জানতেই পারেন না
    const callTypeLabel = _activeCallType === 'video' ? '🎥 ভিডিও কল' : '📞 অডিও কল';
    sendPushNotification(
      callTypeLabel + ' আসছে!',
      (_callOtherName || 'কেউ') + ' আপনাকে কল করছেন। রিসিভ করুন।',
      _callOtherPhoto || undefined,
      undefined,
      window.location.href
    );
    // ৩৫ সেকেন্ডে রিসিভ না করলে মিসড কল হিসেবে অটো-রিজেক্ট
    _callAnswerTimeout = setTimeout(() => {
      if (_activeCallId === callId && !_callStartedAt) {
        const missedFromName = _callOtherName;
        firestore.collection('calls').doc(callId).update({ status: 'missed' }).catch(() => {});
        stopRingtone();
        if (navigator.vibrate) navigator.vibrate(0);
        cleanupCallState();
        hideCallModal();
        alert(t('missedCallFromLabel') + ': ' + missedFromName);
      }
    }, 35000);
  }

  async function startOutgoingCall(otherUid, otherName, otherPhoto, type) {
    if (!currentUser) { alert(t('loginFirstAlert')); return; }
    if (_activeCallId) { alert(t('alreadyInCallLabel')); return; }
    try {
      _localStream = await navigator.mediaDevices.getUserMedia({
        audio: getCallAudioConstraints(),
        video: type === 'video' ? { facingMode: _currentFacingMode } : false
      });
    } catch (e) {
      alert(type === 'video' ? t('cameraPermissionDeniedLabel') : t('micPermissionDeniedLabel'));
      return;
    }
    const callRef = firestore.collection('calls').doc();
    _activeCallId   = callRef.id;
    _isCallCaller   = true;
    _activeCallType = type;
    _callOtherUid   = otherUid;
    _callOtherName  = otherName || t('roleLabelCustomer');
    _callOtherPhoto = otherPhoto || '';
    _ownCandidateIds = [];
    _isMicMuted = false; _iceRestartAttempted = false;
    closeUserProfileDetail();
    renderCallModal('outgoing');

    _pc = new RTCPeerConnection(ICE_SERVERS);
    attachConnectionMonitoring(_pc, callRef);
    _localStream.getTracks().forEach(track => _pc.addTrack(track, _localStream));
    _remoteStream = new MediaStream();
    _pc.ontrack = (e) => {
      e.streams[0].getTracks().forEach(tr => _remoteStream.addTrack(tr));
      updateCallVideoElements();
    };
    _pc.onicecandidate = (e) => {
      if (e.candidate) {
        callRef.collection('callerCandidates').add(e.candidate.toJSON())
          .then(ref => _ownCandidateIds.push(ref)).catch(() => {});
      }
    };

    try {
      const offer = await _pc.createOffer();
      await _pc.setLocalDescription(offer);
      await callRef.set({
        callerUid: currentUser.uid,
        callerName: currentUser.displayName || t('roleLabelCustomer'),
        callerPhoto: currentUser.photoURL || '',
        calleeUid: otherUid,
        calleeName: _callOtherName,
        calleePhoto: _callOtherPhoto,
        type, status: 'ringing',
        callerMuted: false, calleeMuted: false,
        offer: { type: offer.type, sdp: offer.sdp },
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    } catch (e) {
      alert(t('callFailedLabel') + ': ' + e.message);
      cleanupCallState(); hideCallModal();
      return;
    }

    _callDocUnsub = callRef.onSnapshot(async snap => {
      const data = snap.data();
      if (!data) { endCall(true); return; }
      if (data.status === 'accepted' && data.answer && _pc && !_pc.currentRemoteDescription) {
        try {
          await _pc.setRemoteDescription(new RTCSessionDescription(data.answer));
          _callStartedAt = Date.now();
          stopRingtone();
          startCallTimer();
          renderCallModal('connected');
          setupConnectedCallExtras();
        } catch (e) { /* ignore */ }
      } else if (data.status === 'rejected') {
        stopRingtone();
        alert(t('callRejectedLabel'));
        endCall(true);
      } else if (data.status === 'ended' || data.status === 'missed') {
        stopRingtone();
        endCall(true);
      }
      // ✅ অন্য পক্ষ (কলি) মিউট করলে ব্যাজ দেখাও
      if (_callStartedAt) updateRemoteMutedBadge(!!data.calleeMuted);
    });

    _callCandidatesUnsub = callRef.collection('calleeCandidates').onSnapshot(snap => {
      snap.docChanges().forEach(change => {
        if (change.type === 'added' && _pc) {
          _pc.addIceCandidate(new RTCIceCandidate(change.doc.data())).catch(() => {});
        }
      });
    });

    _callAnswerTimeout = setTimeout(() => {
      if (_activeCallId === callRef.id && !_callStartedAt) {
        callRef.update({ status: 'missed' }).catch(() => {});
        alert(t('callNoAnswerLabel'));
        endCall(true);
      }
    }, 45000);
  }

  async function acceptIncomingCall() {
    if (!_activeCallId) return;
    stopRingtone();
    if (navigator.vibrate) navigator.vibrate(0);
    clearTimeout(_callAnswerTimeout);
    const callRef = firestore.collection('calls').doc(_activeCallId);
    try {
      const snap = await callRef.get();
      const data = snap.data();
      if (!data) { cleanupCallState(); hideCallModal(); return; }
      _localStream = await navigator.mediaDevices.getUserMedia({
        audio: getCallAudioConstraints(),
        video: _activeCallType === 'video' ? { facingMode: _currentFacingMode } : false
      });
      _ownCandidateIds = [];
      _isMicMuted = false; _iceRestartAttempted = false;
      _pc = new RTCPeerConnection(ICE_SERVERS);
      attachConnectionMonitoring(_pc, callRef);
      _localStream.getTracks().forEach(track => _pc.addTrack(track, _localStream));
      _remoteStream = new MediaStream();
      _pc.ontrack = (e) => {
        e.streams[0].getTracks().forEach(tr => _remoteStream.addTrack(tr));
        updateCallVideoElements();
      };
      _pc.onicecandidate = (e) => {
        if (e.candidate) {
          callRef.collection('calleeCandidates').add(e.candidate.toJSON())
            .then(ref => _ownCandidateIds.push(ref)).catch(() => {});
        }
      };
      await _pc.setRemoteDescription(new RTCSessionDescription(data.offer));
      const answer = await _pc.createAnswer();
      await _pc.setLocalDescription(answer);
      await callRef.update({ answer: { type: answer.type, sdp: answer.sdp }, status: 'accepted', calleeMuted: false });

      _callCandidatesUnsub = callRef.collection('callerCandidates').onSnapshot(snap2 => {
        snap2.docChanges().forEach(change => {
          if (change.type === 'added' && _pc) {
            _pc.addIceCandidate(new RTCIceCandidate(change.doc.data())).catch(() => {});
          }
        });
      });
      _callDocUnsub = callRef.onSnapshot(snap2 => {
        const d = snap2.data();
        if (!d || d.status === 'ended') { endCall(true); return; }
        // ✅ অন্য পক্ষ (কলার) মিউট করলে ব্যাজ দেখাও
        updateRemoteMutedBadge(!!d.callerMuted);
      });

      _callStartedAt = Date.now();
      startCallTimer();
      renderCallModal('connected');
      setupConnectedCallExtras();
      // ✅ [BUG8 FIX] renderCallModal-এর পরে DOM তৈরি হয় — তারপর stream bind করো
      // video কল: renderCallModal নিজেই bind করে। audio কল: এখানে করতে হবে।
      if (_activeCallType !== 'video') {
        const remoteAudio = document.getElementById('call-remote-audio');
        if (remoteAudio && _remoteStream) {
          remoteAudio.srcObject = _remoteStream;
          remoteAudio.play().catch(() => {});
        }
      }
    } catch (e) {
      // ✅ [BUG7 FIX] Permission error আর অন্য error আলাদাভাবে handle করো
      const isPermissionError = e.name === 'NotAllowedError' || e.name === 'PermissionDeniedError';
      const isDeviceError     = e.name === 'NotFoundError' || e.name === 'DevicesNotFoundError'
                              || e.name === 'NotReadableError' || e.name === 'OverconstrainedError';
      if (isPermissionError) {
        alert(_activeCallType === 'video' ? t('cameraPermissionDeniedLabel') : t('micPermissionDeniedLabel'));
      } else if (isDeviceError) {
        alert('ক্যামেরা/মাইক্রোফোন পাওয়া যাচ্ছে না। ডিভাইস চেক করুন।');
      } else {
        alert(t('callFailedLabel') + ': ' + (e.message || e.name || 'Unknown error'));
      }
      firestore.collection('calls').doc(_activeCallId).update({ status: 'rejected' }).catch(() => {});
      cleanupCallState();
      hideCallModal();
    }
  }

  function rejectIncomingCall() {
    stopRingtone();
    if (navigator.vibrate) navigator.vibrate(0);
    clearTimeout(_callAnswerTimeout);
    if (_activeCallId) {
      firestore.collection('calls').doc(_activeCallId).update({ status: 'rejected' }).catch(() => {});
    }
    cleanupCallState();
    hideCallModal();
  }

  function endCall(skipRemoteUpdate) {
    stopRingtone();
    if (navigator.vibrate) navigator.vibrate(0);
    clearTimeout(_callAnswerTimeout);
    if (!skipRemoteUpdate && _activeCallId) {
      firestore.collection('calls').doc(_activeCallId).update({
        status: 'ended', endedAt: firebase.firestore.FieldValue.serverTimestamp()
      }).catch(() => {});
    }
    // ✅ নিজের লেখা ICE ক্যান্ডিডেট ডকগুলো ক্লিনআপ (বেস্ট-এফোর্ট)
    const callIdToClean = _activeCallId;
    const ownRefs = _ownCandidateIds.slice();
    setTimeout(() => {
      ownRefs.forEach(ref => ref.delete().catch(() => {}));
      if (callIdToClean) {
        firestore.collection('calls').doc(callIdToClean).delete().catch(() => {});
      }
    }, 2000);
    cleanupCallState();
    hideCallModal();
  }

  function cleanupCallState() {
    if (_callDocUnsub) { _callDocUnsub(); _callDocUnsub = null; }
    if (_callCandidatesUnsub) { _callCandidatesUnsub(); _callCandidatesUnsub = null; }
    if (_callTimerInterval) { clearInterval(_callTimerInterval); _callTimerInterval = null; }
    if (_pc) { try { _pc.close(); } catch (e) {} _pc = null; }
    if (_localStream) { _localStream.getTracks().forEach(t => t.stop()); _localStream = null; }
    _remoteStream = null;
    _activeCallId = null; _isCallCaller = false; _callOtherUid = null;
    _callOtherName = null; _callOtherPhoto = null; _callStartedAt = null;
    _ownCandidateIds = [];
    // ✅ আধুনিক ফিচারের স্টেট রিসেট
    stopNetworkQualityMonitoring();
    releaseCallWakeLock();
    if (_reconnectTimeout) { clearTimeout(_reconnectTimeout); _reconnectTimeout = null; }
    _iceRestartAttempted = false;
    _isMicMuted = false;
    _currentFacingMode = 'user';
  }

  function hideCallModal() {
    const modal = document.getElementById('call-modal');
    if (modal) modal.classList.add('hidden');
    document.body.style.overflow = document.getElementById('peer-chat-modal')?.classList.contains('hidden') === false ? 'hidden' : 'auto';
  }

  // ✅ কল মডালের পুরো UI ডায়নামিকভাবে রেন্ডার করো (ইনকামিং/আউটগোয়িং/কানেক্টেড)
  function renderCallModal(state) {
    const modal = document.getElementById('call-modal');
    const content = document.getElementById('call-modal-content');
    if (!modal || !content) return;
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    const avatarUrl = _callOtherPhoto || ('https://placehold.co/120x120/1e293b/94a3b8?text=' + (_callOtherName?.[0] || '?'));
    const safeName = escapeHtml(_callOtherName || 'ইউজার');
    const isVideo = _activeCallType === 'video';

    if (state === 'connected' && isVideo) {
      content.innerHTML = `
        <video id="call-remote-video" autoplay playsinline class="absolute inset-0 w-full h-full object-cover bg-black"></video>
        <video id="call-local-video" autoplay playsinline muted class="absolute bottom-28 right-4 w-24 h-36 rounded-2xl object-cover border-2 border-white/30 shadow-xl bg-slate-800 z-10"></video>
        <div class="absolute top-0 left-0 right-0 p-4 pt-6 bg-gradient-to-b from-black/60 to-transparent z-10">
          <div class="flex items-center justify-between">
            <div>
              <h3 class="text-white font-black text-sm">${safeName}</h3>
              <p class="text-white/70 text-xs" id="call-timer-text">00:00</p>
            </div>
            <div class="flex items-center gap-1.5">
              <span id="call-remote-muted-badge" class="hidden bg-black/40 text-white text-[10px] w-6 h-6 rounded-full flex items-center justify-center"><i class="fas fa-microphone-slash"></i></span>
              <span id="call-network-quality" class="bg-black/30 w-6 h-6 rounded-full flex items-center justify-center"><i class="fas fa-signal text-[10px] text-emerald-400" id="call-network-icon"></i></span>
            </div>
          </div>
          <p id="call-reconnecting-banner" class="hidden text-amber-300 text-[10px] font-bold mt-1"><i class="fas fa-rotate fa-spin"></i> <span id="call-reconnecting-text">${t('reconnectingLabel')}</span></p>
        </div>
        <div class="absolute bottom-6 left-0 right-0 flex items-center justify-center gap-3 z-10">
          <button onclick="toggleCallMute()" id="call-mute-btn" class="w-12 h-12 rounded-full bg-white/15 flex items-center justify-center text-white shrink-0"><i class="fas fa-microphone text-sm"></i></button>
          <button onclick="switchCallCamera()" id="call-switch-camera-btn" class="hidden w-12 h-12 rounded-full bg-white/15 flex items-center justify-center text-white shrink-0"><i class="fas fa-camera-rotate text-sm"></i></button>
          <button onclick="endCall()" class="w-16 h-16 rounded-full bg-red-600 flex items-center justify-center text-white shadow-xl shrink-0"><i class="fas fa-phone-slash text-lg"></i></button>
          <button onclick="toggleCallCamera()" id="call-camera-btn" class="w-12 h-12 rounded-full bg-white/15 flex items-center justify-center text-white shrink-0"><i class="fas fa-video text-sm"></i></button>
          <button onclick="enterCallPiP()" id="call-pip-btn" class="hidden w-12 h-12 rounded-full bg-white/15 flex items-center justify-center text-white shrink-0"><i class="fas fa-clone text-sm"></i></button>
        </div>`;
      const remoteVid = document.getElementById('call-remote-video');
      const localVid  = document.getElementById('call-local-video');
      if (remoteVid) remoteVid.srcObject = _remoteStream;
      if (localVid)  localVid.srcObject  = _localStream;
    } else {
      const statusText = state === 'incoming'
        ? (isVideo ? t('incomingVideoCallLabel') : t('incomingAudioCallLabel'))
        : state === 'outgoing' ? t('callingLabel') : t('callConnectedLabel');
      let controlsHtml = '';
      if (state === 'incoming') {
        controlsHtml = `
          <div class="pb-12 flex items-center justify-center gap-12">
            <button onclick="rejectIncomingCall()" class="flex flex-col items-center gap-2">
              <span class="w-16 h-16 rounded-full bg-red-600 flex items-center justify-center text-white shadow-xl"><i class="fas fa-phone-slash text-xl"></i></span>
              <span class="text-white/60 text-[10px]">${t('declineCallLabel')}</span>
            </button>
            <button onclick="acceptIncomingCall()" class="flex flex-col items-center gap-2">
              <span class="w-16 h-16 rounded-full bg-emerald-500 flex items-center justify-center text-white shadow-xl call-accept-pulse"><i class="fas fa-phone text-xl"></i></span>
              <span class="text-white/60 text-[10px]">${t('acceptCallLabel')}</span>
            </button>
          </div>`;
      } else if (state === 'outgoing') {
        controlsHtml = `
          <div class="pb-12 flex items-center justify-center">
            <button onclick="endCall()" class="flex flex-col items-center gap-2">
              <span class="w-16 h-16 rounded-full bg-red-600 flex items-center justify-center text-white shadow-xl"><i class="fas fa-phone-slash text-xl"></i></span>
              <span class="text-white/60 text-[10px]">${t('cancelCallLabel')}</span>
            </button>
          </div>`;
      } else {
        controlsHtml = `
          <div class="pb-12 flex items-center justify-center gap-6">
            <button onclick="toggleCallMute()" id="call-mute-btn" class="w-14 h-14 rounded-full bg-white/15 flex items-center justify-center text-white"><i class="fas fa-microphone"></i></button>
            <button onclick="endCall()" class="w-16 h-16 rounded-full bg-red-600 flex items-center justify-center text-white shadow-xl"><i class="fas fa-phone-slash text-xl"></i></button>
            <button onclick="toggleCallSpeaker()" id="call-speaker-btn" class="w-14 h-14 rounded-full bg-white/15 flex items-center justify-center text-white"><i class="fas fa-volume-high"></i></button>
          </div>`;
      }
      content.innerHTML = `
        <div class="flex-1 flex flex-col items-center justify-center text-white p-6">
          <div class="relative">
            <img src="${avatarUrl}" loading="lazy" class="w-32 h-32 rounded-full object-cover border-4 border-white/10 ${state !== 'connected' ? 'call-avatar-pulse' : ''}"
              onerror="this.src='https://placehold.co/120x120/1e293b/94a3b8?text=?'"/>
            <span id="call-remote-muted-badge" class="hidden absolute -bottom-1 -right-1 bg-slate-700 text-white text-[10px] w-7 h-7 rounded-full flex items-center justify-center border-2 border-slate-950"><i class="fas fa-microphone-slash"></i></span>
          </div>
          <h2 class="text-xl font-black mt-5">${safeName}</h2>
          <p class="text-white/60 text-sm mt-1">${isVideo ? '🎥 ' : '📞 '}<span id="call-status-text">${statusText}</span></p>
          <p class="text-white/40 text-xs mt-1.5" id="call-timer-text" style="${state === 'connected' ? '' : 'display:none'}">00:00</p>
          ${state === 'connected' ? `
          <div class="flex items-center gap-2 mt-2">
            <span id="call-network-quality" class="flex items-center gap-1 bg-white/10 px-2.5 py-1 rounded-full"><i class="fas fa-signal text-[10px] text-emerald-400" id="call-network-icon"></i></span>
          </div>
          <p id="call-reconnecting-banner" class="hidden text-amber-300 text-[11px] font-bold mt-2"><i class="fas fa-rotate fa-spin"></i> <span id="call-reconnecting-text">${t('reconnectingLabel')}</span></p>
          ` : ''}
        </div>
        ${controlsHtml}
        ${(state === 'connected' && !isVideo) ? `
          <!-- ✅ [BUG1 FIX] Audio call: remote stream অবশ্যই একটা <audio> element-এ bind করতে হবে —
               না হলে ভয়েস শোনা যায় না। hidden video-তে srcObject সেট হলেও autoplay block হয়। -->
          <audio id="call-remote-audio" autoplay playsinline style="display:none"></audio>
        ` : ''}
      `;
      if (state === 'connected') {
        if (isVideo) {
          const remoteVid = document.getElementById('call-remote-video');
          const localVid  = document.getElementById('call-local-video');
          if (remoteVid) remoteVid.srcObject = _remoteStream;
          if (localVid)  localVid.srcObject  = _localStream;
        } else {
          // ✅ [BUG1 FIX] Audio call — remote stream <audio> element-এ bind করো
          const remoteAudio = document.getElementById('call-remote-audio');
          if (remoteAudio && _remoteStream) remoteAudio.srcObject = _remoteStream;
        }
      }
    }
  }

  // ✅ ভিডিও/অডিও এলিমেন্ট আবার বাইন্ড করো (remote track দেরিতে আসলে)
  function updateCallVideoElements() {
    if (_activeCallType === 'video') {
      const remoteVid = document.getElementById('call-remote-video');
      const localVid  = document.getElementById('call-local-video');
      if (remoteVid && _remoteStream && remoteVid.srcObject !== _remoteStream) remoteVid.srcObject = _remoteStream;
      if (localVid && _localStream && localVid.srcObject !== _localStream) localVid.srcObject = _localStream;
    } else {
      // ✅ [BUG2 FIX] Audio call — remote audio element re-bind (track দেরিতে এলে)
      const remoteAudio = document.getElementById('call-remote-audio');
      if (remoteAudio && _remoteStream && remoteAudio.srcObject !== _remoteStream) {
        remoteAudio.srcObject = _remoteStream;
        remoteAudio.play().catch(() => {});
      }
    }
  }

  function startCallTimer() {
    if (_callTimerInterval) clearInterval(_callTimerInterval);
    // ✅ [BUG10 FIX] call-timer-text id ডুপ্লিকেট (compact bar + full call screen) —
    // getElementById শুধু প্রথমটা ধরত, তাই একটা UI-তে টাইমার আপডেট হতো না। querySelectorAll দিয়ে দুটোই আপডেট হচ্ছে এখন।
    const update = () => {
      if (!_callStartedAt) return;
      const secs = Math.floor((Date.now() - _callStartedAt) / 1000);
      const mm = String(Math.floor(secs / 60)).padStart(2, '0');
      const ss = String(secs % 60).padStart(2, '0');
      document.querySelectorAll('#call-timer-text').forEach(el => {
        el.innerText = `${mm}:${ss}`;
        el.style.display = '';
      });
    };
    update();
    _callTimerInterval = setInterval(update, 1000);
  }

  function toggleCallMute() {
    if (!_localStream) return;
    const audioTrack = _localStream.getAudioTracks()[0];
    if (!audioTrack) return;
    audioTrack.enabled = !audioTrack.enabled;
    _isMicMuted = !audioTrack.enabled;
    document.querySelectorAll('#call-mute-btn').forEach(btn => {
      btn.classList.toggle('bg-red-500', !audioTrack.enabled);
      btn.classList.toggle('bg-white/15', audioTrack.enabled);
      btn.innerHTML = audioTrack.enabled ? '<i class="fas fa-microphone"></i>' : '<i class="fas fa-microphone-slash"></i>';
    });
    // ✅ মিউট স্ট্যাটাস Firestore-এ লিখে অন্য পক্ষকে জানানো হচ্ছে (তারা একটা ছোট ব্যাজ দেখবে)
    if (_activeCallId) {
      const field = _isCallCaller ? { callerMuted: _isMicMuted } : { calleeMuted: _isMicMuted };
      firestore.collection('calls').doc(_activeCallId).update(field).catch(() => {});
    }
  }

  function toggleCallCamera() {
    if (!_localStream) return;
    const videoTrack = _localStream.getVideoTracks()[0];
    if (!videoTrack) return;
    videoTrack.enabled = !videoTrack.enabled;
    const btn = document.getElementById('call-camera-btn');
    if (btn) {
      btn.classList.toggle('bg-red-500', !videoTrack.enabled);
      btn.classList.toggle('bg-white/15', videoTrack.enabled);
      btn.innerHTML = videoTrack.enabled ? '<i class="fas fa-video text-sm"></i>' : '<i class="fas fa-video-slash text-sm"></i>';
    }
  }

  // ✅ স্পিকার টগল — যেসব ব্রাউজার setSinkId() সাপোর্ট করে (মূলত ডেস্কটপ Chrome/Edge) সেখানে
  // আসলেই অডিও আউটপুট ডিভাইস বদলে দেয়। মোবাইল ব্রাউজারে (Android Chrome আংশিক, iOS Safari একদমই না)
  // earpiece↔loudspeaker সুইচ করার মতো API ওয়েবে এক্সপোজ করা নেই — এটা OS-লেভেল টেলিফোনি ফিচার,
  // তাই সেখানে এটা ভিজুয়াল টগল হিসেবে থেকে যাবে (এটা এই কোডের সীমাবদ্ধতা নয়, ওয়েব প্ল্যাটফর্মের)।
  async function toggleCallSpeaker() {
    const btn = document.getElementById('call-speaker-btn');
    if (!btn) return;
    _isSpeakerOn = !_isSpeakerOn;
    btn.classList.toggle('bg-emerald-600', _isSpeakerOn);
    btn.classList.toggle('bg-white/15', !_isSpeakerOn);
    // ✅ [BUG9 FIX] audio call-এ <audio> element আছে, video call-এ <video> — সঠিকটা নাও
    const remoteMediaEl = _activeCallType === 'video'
      ? document.getElementById('call-remote-video')
      : document.getElementById('call-remote-audio');
    if (remoteMediaEl && typeof remoteMediaEl.setSinkId === 'function') {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const outputs = devices.filter(d => d.kind === 'audiooutput');
        const target = _isSpeakerOn
          ? outputs.find(d => /speaker/i.test(d.label)) || outputs[0]
          : outputs.find(d => /earpiece|default/i.test(d.label)) || outputs[0];
        if (target) await remoteMediaEl.setSinkId(target.deviceId);
      } catch (e) { /* সাপোর্ট না থাকলে নিরবে ভিজুয়াল টগল হিসেবেই থেকে যাবে */ }
    }
  }

  // ============================================================
  // ✅ আধুনিক কল ফিচার — কানেকশন মনিটরিং, অটো-রিকনেক্ট, ক্যামেরা সুইচ,
  //    নেটওয়ার্ক কোয়ালিটি, পিকচার-ইন-পিকচার, স্ক্রিন ওয়েক লক
  // ============================================================

  // ✅ কল কানেক্ট হওয়ার পর এক্সট্রা মডার্ন ফিচার চালু করো (একবারই কল করা হয়)
  async function setupConnectedCallExtras() {
    requestCallWakeLock();
    startNetworkQualityMonitoring();
    if (_activeCallType === 'video') {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const cameraCount = devices.filter(d => d.kind === 'videoinput').length;
        const switchBtn = document.getElementById('call-switch-camera-btn');
        if (switchBtn && cameraCount > 1) switchBtn.classList.remove('hidden');
      } catch (e) { /* enumerateDevices ব্যর্থ হলে বাটন হাইড থাকবে */ }
      const pipBtn = document.getElementById('call-pip-btn');
      if (pipBtn && document.pictureInPictureEnabled) pipBtn.classList.remove('hidden');
    }
  }

  // ✅ ICE কানেকশন স্টেট মনিটর করো — সংযোগ বিচ্ছিন্ন হলে "রিকনেক্ট হচ্ছে" দেখাও,
  // পুরোপুরি ফেইল হলে একবার ICE রিস্টার্ট চেষ্টা করো (caller-side renegotiation)
  function attachConnectionMonitoring(pc, callRef) {
    pc.oniceconnectionstatechange = () => {
      const state = pc.iceConnectionState;
      if (state === 'disconnected') {
        showReconnectingBanner();
        if (_reconnectTimeout) clearTimeout(_reconnectTimeout);
        _reconnectTimeout = setTimeout(() => {
          if (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'failed') {
            attemptIceRestart(pc, callRef);
          }
        }, 8000);
      } else if (state === 'failed') {
        attemptIceRestart(pc, callRef);
      } else if (state === 'connected' || state === 'completed') {
        hideReconnectingBanner();
        if (_reconnectTimeout) { clearTimeout(_reconnectTimeout); _reconnectTimeout = null; }
        _iceRestartAttempted = false;
      }
    };
  }

  async function attemptIceRestart(pc, callRef) {
    if (_iceRestartAttempted || !_isCallCaller) {
      // ✅ Callee সাইডে renegotiation শুরু করা যায় না (offer caller-ই পাঠায়);
      // কিছুক্ষণ অপেক্ষার পরও সংযোগ না ফিরলে কলটি শেষ করে দেওয়া হচ্ছে
      if (!_isCallCaller) {
        setTimeout(() => { if (pc.iceConnectionState !== 'connected' && pc.iceConnectionState !== 'completed') endCall(false); }, 6000);
      }
      return;
    }
    _iceRestartAttempted = true;
    try {
      const offer = await pc.createOffer({ iceRestart: true });
      await pc.setLocalDescription(offer);
      await callRef.update({ offer: { type: offer.type, sdp: offer.sdp }, status: 'accepted' });
    } catch (e) { /* রিস্টার্ট ব্যর্থ হলে কল স্বাভাবিকভাবেই বিচ্ছিন্ন হয়ে যাবে */ }
  }

  function showReconnectingBanner() {
    document.querySelectorAll('#call-reconnecting-banner').forEach(el => el.classList.remove('hidden'));
  }
  function hideReconnectingBanner() {
    document.querySelectorAll('#call-reconnecting-banner').forEach(el => el.classList.add('hidden'));
  }

  // ✅ অন্য পক্ষ মিউট থাকলে ছোট ব্যাজ দেখাও
  function updateRemoteMutedBadge(isMuted) {
    document.querySelectorAll('#call-remote-muted-badge').forEach(el => el.classList.toggle('hidden', !isMuted));
  }

  // ✅ নেটওয়ার্ক কোয়ালিটি — getStats() থেকে RTT/প্যাকেট লস দেখে ভালো/মাঝারি/দুর্বল নির্ধারণ
  function startNetworkQualityMonitoring() {
    stopNetworkQualityMonitoring();
    _statsInterval = setInterval(async () => {
      if (!_pc) return;
      try {
        const stats = await _pc.getStats();
        let rtt = null, packetsLost = 0, packetsReceived = 0;
        stats.forEach(report => {
          if (report.type === 'candidate-pair' && report.state === 'succeeded' && report.currentRoundTripTime != null) {
            rtt = report.currentRoundTripTime;
          }
          if (report.type === 'inbound-rtp') {
            packetsLost += report.packetsLost || 0;
            packetsReceived += report.packetsReceived || 0;
          }
        });
        const lossRatio = packetsReceived > 0 ? packetsLost / (packetsReceived + packetsLost) : 0;
        let level = 'good';
        if ((rtt != null && rtt > 0.4) || lossRatio > 0.08) level = 'poor';
        else if ((rtt != null && rtt > 0.2) || lossRatio > 0.03) level = 'medium';
        updateNetworkQualityUI(level);
      } catch (e) { /* getStats ব্যর্থ হলে ইন্ডিকেটর আপডেট স্কিপ করো */ }
    }, 3000);
  }
  function stopNetworkQualityMonitoring() {
    if (_statsInterval) { clearInterval(_statsInterval); _statsInterval = null; }
  }
  function updateNetworkQualityUI(level) {
    const colorMap = { good: 'text-emerald-400', medium: 'text-amber-400', poor: 'text-red-400' };
    const titleMap = { good: t('networkGoodLabel'), medium: t('networkMediumLabel'), poor: t('networkPoorLabel') };
    document.querySelectorAll('#call-network-icon').forEach(el => {
      el.classList.remove('text-emerald-400', 'text-amber-400', 'text-red-400');
      el.classList.add(colorMap[level] || 'text-emerald-400');
      el.title = titleMap[level] || '';
    });
  }

  // ✅ ভিডিও কলে ফ্রন্ট/ব্যাক ক্যামেরা সুইচ — renegotiation না করে replaceTrack দিয়ে স্মুথলি বদলায়
  async function switchCallCamera() {
    if (!_localStream || !_pc || _activeCallType !== 'video') return;
    _currentFacingMode = _currentFacingMode === 'user' ? 'environment' : 'user';
    try {
      const newStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: _currentFacingMode }, audio: false });
      const newTrack = newStream.getVideoTracks()[0];
      const sender = _pc.getSenders().find(s => s.track && s.track.kind === 'video');
      if (sender) await sender.replaceTrack(newTrack);
      const oldTrack = _localStream.getVideoTracks()[0];
      if (oldTrack) { _localStream.removeTrack(oldTrack); oldTrack.stop(); }
      _localStream.addTrack(newTrack);
      const localVid = document.getElementById('call-local-video');
      if (localVid) localVid.srcObject = _localStream;
    } catch (e) {
      _currentFacingMode = _currentFacingMode === 'user' ? 'environment' : 'user'; // রিভার্ট
      alert(t('cameraSwitchFailedLabel'));
    }
  }

  // ✅ পিকচার-ইন-পিকচার — অন্য পেজে/অ্যাপে কাজ করার সময়ও ভিডিও কল ভাসমান উইন্ডোতে দেখা যাবে
  async function enterCallPiP() {
    const remoteVid = document.getElementById('call-remote-video');
    if (!remoteVid || !document.pictureInPictureEnabled) {
      alert(t('pipNotSupportedLabel'));
      return;
    }
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else {
        await remoteVid.requestPictureInPicture();
      }
    } catch (e) { alert(t('pipNotSupportedLabel')); }
  }

  // ✅ স্ক্রিন ওয়েক লক — কল চলাকালীন ফোনের স্ক্রিন অটো-লক হবে না
  async function requestCallWakeLock() {
    try {
      if ('wakeLock' in navigator) {
        _wakeLock = await navigator.wakeLock.request('screen');
      }
    } catch (e) { /* সাপোর্ট না থাকলে বা অনুমতি না পেলে নিরবে স্কিপ করো */ }
  }
  function releaseCallWakeLock() {
    if (_wakeLock) { _wakeLock.release().catch(() => {}); _wakeLock = null; }
  }
  // ✅ ট্যাব আবার ভিজিবল হলে ওয়েক লক পুনরায় নেওয়ার চেষ্টা (ব্রাউজার ব্যাকগ্রাউন্ডে গেলে এটা অটো রিলিজ হয়ে যায়)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && _activeCallId && _callStartedAt && !_wakeLock) {
      requestCallWakeLock();
    }
  });

  // ✅ ইনকামিং কলের জন্য সিম্পল রিংটোন (Web Audio Oscillator — কোনো এক্সটার্নাল ফাইল লাগবে না)
  // ✅ রিংটোন — Audio element + Vibration + Web Audio triple fallback
  let _ringtoneAudio = null;

  function _buildBeepWav(type) {
    // Offline WAV generator — no network needed
    // Returns a base64 data URI of a short PCM WAV beep
    const sampleRate = 22050;
    const duration   = type === 'incoming' ? 0.9 : 1.2;  // seconds
    const numSamples = Math.floor(sampleRate * duration);
    const buf        = new Int16Array(numSamples);

    if (type === 'incoming') {
      // ding-ding: 880Hz (0–0.18s) then 1100Hz (0.22–0.40s)
      for (let i = 0; i < numSamples; i++) {
        const t = i / sampleRate;
        let v = 0;
        if (t < 0.18)              v = Math.sin(2 * Math.PI * 880  * t);
        else if (t >= 0.22 && t < 0.40) v = Math.sin(2 * Math.PI * 1100 * t);
        // envelope
        const env = t < 0.04 ? t / 0.04 : (t < 0.36 ? 1 : Math.max(0, (0.40 - t) / 0.04));
        buf[i] = Math.round(v * env * 28000);
      }
    } else {
      // ringback: 440Hz on 0.8s / off 0.4s
      for (let i = 0; i < numSamples; i++) {
        const t = i / sampleRate;
        const cycle = t % 1.2;
        let v = 0;
        if (cycle < 0.8) {
          v = Math.sin(2 * Math.PI * 440 * t);
          const env = cycle < 0.05 ? cycle / 0.05 : (cycle > 0.75 ? (0.8 - cycle) / 0.05 : 1);
          v *= env;
        }
        buf[i] = Math.round(v * 20000);
      }
    }

    // Pack WAV
    const dataLen   = buf.byteLength;
    const wavBuf    = new ArrayBuffer(44 + dataLen);
    const view      = new DataView(wavBuf);
    const write     = (off, str) => { for (let i = 0; i < str.length; i++) view.setUint8(off + i, str.charCodeAt(i)); };
    write(0,  'RIFF'); view.setUint32(4,  36 + dataLen, true);
    write(8,  'WAVE'); write(12, 'fmt ');
    view.setUint32(16, 16, true);  view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);   view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true); view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);  write(36, 'data');
    view.setUint32(40, dataLen, true);
    new Int16Array(wavBuf, 44).set(buf);

    // base64
    let binary = '';
    const bytes = new Uint8Array(wavBuf);
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    return 'data:audio/wav;base64,' + btoa(binary);
  }

  function playRingtone(type = 'incoming') {
    try {
      stopRingtone();

      // ── 1. Vibration (Android) ──────────────────────────────
      if (navigator.vibrate) {
        if (type === 'incoming') {
          navigator.vibrate([400, 200, 400, 200, 400, 600, 400, 200, 400, 200, 400, 1200]);
          _ringtoneOsc = setInterval(() => {
            navigator.vibrate([400, 200, 400, 200, 400, 600, 400, 200, 400, 200, 400, 1200]);
          }, 4000);
        } else {
          navigator.vibrate([200, 800]);
          _ringtoneOsc = setInterval(() => navigator.vibrate([200, 800]), 3000);
        }
      }

      // ── 2. Audio element (WAV data URI) ─────────────────────
      try {
        const wavUri = _buildBeepWav(type);
        _ringtoneAudio = new Audio(wavUri);
        _ringtoneAudio.loop = true;
        _ringtoneAudio.volume = 1.0;
        const playPromise = _ringtoneAudio.play();
        if (playPromise) {
          playPromise.catch(() => {
            // ✅ [BUG5 FIX] Autoplay block হলে document-এ একটি user interaction অপেক্ষা করো
            // তারপর play করো — কলের সময় ব্যবহারকারী সাধারণত screen touch করেন
            const unlockAudio = () => {
              document.removeEventListener('touchstart', unlockAudio, true);
              document.removeEventListener('click',      unlockAudio, true);
              if (_ringtoneAudio) _ringtoneAudio.play().catch(() => _webAudioFallback(type));
              else _webAudioFallback(type);
            };
            document.addEventListener('touchstart', unlockAudio, { once: true, capture: true });
            document.addEventListener('click',      unlockAudio, { once: true, capture: true });
            // ৩ সেকেন্ডেও gesture না পেলে Web Audio API fallback
            setTimeout(() => {
              document.removeEventListener('touchstart', unlockAudio, true);
              document.removeEventListener('click',      unlockAudio, true);
              if (_ringtoneAudio && _ringtoneAudio.paused) _webAudioFallback(type);
            }, 3000);
          });
        }
      } catch (e) {
        _webAudioFallback(type);
      }

    } catch (e) { /* শেষ fallback — নিরব */ }
  }

  function _webAudioFallback(type) {
    // ── 3. Web Audio API synthetic beep ─────────────────────
    try {
      _ringtoneCtx = new (window.AudioContext || window.webkitAudioContext)();
      const ctx = _ringtoneCtx;
      const beep = () => {
        if (!ctx || ctx.state === 'closed') return;
        const resume = () => {
          const freqs = type === 'incoming' ? [880, 1100] : [440];
          freqs.forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            const t = ctx.currentTime + i * 0.2;
            osc.type = 'sine'; osc.frequency.value = freq;
            gain.gain.setValueAtTime(0.0001, t);
            gain.gain.exponentialRampToValueAtTime(0.35, t + 0.05);
            gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
            osc.connect(gain); gain.connect(ctx.destination);
            osc.start(t); osc.stop(t + 0.2);
          });
        };
        if (ctx.state === 'suspended') ctx.resume().then(resume).catch(() => {});
        else resume();
      };
      beep();
      if (!_ringtoneOsc) _ringtoneOsc = setInterval(beep, type === 'incoming' ? 1400 : 3000);
    } catch (e) {}
  }

  function stopRingtone() {
    if (_ringtoneOsc) { clearInterval(_ringtoneOsc); _ringtoneOsc = null; }
    if (_ringtoneAudio) {
      try { _ringtoneAudio.pause(); _ringtoneAudio.src = ''; } catch (e) {}
      _ringtoneAudio = null;
    }
    if (_ringtoneCtx) { try { _ringtoneCtx.close(); } catch (e) {} _ringtoneCtx = null; }
    if (navigator.vibrate) navigator.vibrate(0);
  }


  function captureReferralFromUrl() {
    try {
      const params = new URLSearchParams(window.location.search);
      const ref = params.get('ref');
      if (ref) {
        localStorage.setItem('pending_referral_code', ref.toUpperCase());
      }
    } catch (e) { console.error("Referral capture error:", e); }
  }

  function updateNavbarAfterLogin(user) {
    const avatarImg  = document.getElementById('header-profile-avatar');
    const avatarIcon = document.getElementById('header-profile-icon');
    const nameEl     = document.getElementById('header-profile-name');
    const subEl      = document.getElementById('header-profile-sub');
    if (avatarImg && user.photoURL) {
      avatarImg.src = user.photoURL;
      avatarImg.classList.remove('hidden');
      if (avatarIcon) avatarIcon.classList.add('hidden');
    }
    if (nameEl) nameEl.innerText = user.displayName || t('customerFallback');
    if (subEl) subEl.innerText = t('profileViewPrompt');
    // ✅ পেজ হেডার অ্যাভাটারও সিঙ্ক করো
    setTimeout(_syncTejHeaderAvatar, 100);
  }

  function updateNavbarAfterLogout() {
    const avatarImg  = document.getElementById('header-profile-avatar');
    const avatarIcon = document.getElementById('header-profile-icon');
    const nameEl     = document.getElementById('header-profile-name');
    const subEl      = document.getElementById('header-profile-sub');
    if (avatarImg) { avatarImg.classList.add('hidden'); avatarImg.src = ''; }
    if (avatarIcon) avatarIcon.classList.remove('hidden');
    if (nameEl) nameEl.innerText = t('profileDefaultName');
    if (subEl) subEl.innerText = t('profileLoginPrompt');
  }

  // ============================================================
  // ✅ সেলার হওয়ার আবেদন
  // ============================================================
  async function applyForSeller() {
    if (!currentUser) { alert("আগে লগইন করুন!"); return; }
    if (currentUserRole === 'seller') { alert("আপনি ইতিমধ্যে সেলার!"); return; }
    if (currentUserRole === 'pending_seller') { alert("আপনার আবেদন অনুমোদনের অপেক্ষায় আছে।"); return; }
    try {
      // ✅ ১. User doc আপডেট
      await firebase.firestore().collection("users").doc(currentUser.uid).update({
        role: 'pending_seller',
        appliedAt: firebase.firestore.FieldValue.serverTimestamp()
      });

      // ✅ ২. Admin notification Firestore-এ সেভ
      await firebase.firestore().collection("admin_notifications").add({
        type:        'seller_application',
        applicantUid:  currentUser.uid,
        applicantName: currentUser.displayName || 'অজানা',
        applicantEmail: currentUser.email || '',
        applicantPhoto: currentUser.photoURL || '',
        message:     `${currentUser.displayName || currentUser.email} সেলার হিসেবে আবেদন করেছেন।`,
        isRead:      false,
        createdAt:   firebase.firestore.FieldValue.serverTimestamp()
      });

      currentUserRole = 'pending_seller';
      renderSellerPanelByRole();
      alert("✅ আবেদন জমা হয়েছে! Admin অনুমোদন করলে সেলার প্যানেল চালু হবে।");
    } catch(e) { alert("ত্রুটি হয়েছে: " + e.message); }
  }

  // ============================================================
  // ✅ [FIX #1] পণ্য এখন Firestore থেকে লোড হবে — localStorage নয়
  // ============================================================
  const defaultProducts = [
    { id: "default_1", name: "Premium Punjabi - Crimson", price: 1850, stock: 5, image: "https://images.unsplash.com/photo-1597983073493-88cd35cf93b0?w=400&auto=format&fit=crop", sizes: ['M', 'L', 'XL'], category: "punjabi", sellerUid: "default" },
    { id: "default_2", name: "Classic Leather Shoe", price: 2450, stock: 10, image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&auto=format&fit=crop", sizes: ['39', '40', '41', '42'], category: "shoe", sellerUid: "default" },
    { id: "default_3", name: "Luxury Watch - Gold", price: 3200, stock: 3, image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&auto=format&fit=crop", sizes: ['Free Size'], category: "watch", sellerUid: "default" },
    { id: "default_4", name: "Casual T-Shirt - Navy Blue", price: 650, stock: 20, image: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&auto=format&fit=crop", sizes: ['S','M','L','XL'], category: "tshirt", sellerUid: "default" },
    { id: "default_5", name: "কটন শাড়ি - লাল বর্ডার", price: 1200, stock: 8, image: "https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=400&auto=format&fit=crop", sizes: ['Free Size'], category: "saree", sellerUid: "default" },
    { id: "default_6", name: "Wireless Earphone - Bass Pro", price: 890, stock: 15, image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&auto=format&fit=crop", sizes: ['Free Size'], category: "earphone", sellerUid: "default" },
    { id: "default_7", name: "Skin Care Combo Pack", price: 750, stock: 12, image: "https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=400&auto=format&fit=crop", sizes: ['Free Size'], category: "cosmetics", sellerUid: "default" },
    { id: "default_8", name: "Laptop Backpack - Black", price: 1350, stock: 7, image: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400&auto=format&fit=crop", sizes: ['Free Size'], category: "bags", sellerUid: "default" }
  ];

  let products = [...defaultProducts];
  // কার্ট এখনো localStorage-এ থাকবে (session-based, ঠিকই আছে)
  let cart = safeJSONParse(localStorage.getItem('cart'), []);
  let selectedSizesState = {};
  // ✅ NEW: প্রতিটি প্রোডাক্টের জন্য কার্টে যোগ করার আগে সিলেক্ট করা quantity (+/− বাটন দিয়ে সেট হয়)
  let selectedQtyState = {};

  // ✅ ফিল্টার, সর্ট ও প্রোডাক্ট ডিটেইল স্টেট
  let currentFilterState = { category: 'all', searchQuery: '', sortBy: 'default', priceMin: null, priceMax: null };
  let currentDetailProductId = null;
  let currentReviewRating = 0;
  let _reviewImageFile = null; // ✅ NEW: রিভিউয়ের সাথে ঐচ্ছিক ছবি — Firebase Storage-এ আপলোড হবে

  // ✅ NEW: রিভিউ ফর্মে ছবি সিলেক্ট
  function reviewImageSelected(input) {
    const file = input.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      showCartToast('⚠️ ছবি ৫MB এর বেশি হওয়া যাবে না'); input.value = ''; return;
    }
    _reviewImageFile = file;
    const previewUrl = URL.createObjectURL(file);
    document.getElementById('review-image-preview').src = previewUrl;
    document.getElementById('review-image-preview-wrap').classList.remove('hidden');
    document.getElementById('review-image-upload-label').classList.add('hidden');
  }

  function removeReviewImage() {
    const preview = document.getElementById('review-image-preview');
    if (preview.src) { try { URL.revokeObjectURL(preview.src); } catch (e) {} }
    _reviewImageFile = null;
    document.getElementById('review-image-preview-wrap').classList.add('hidden');
    document.getElementById('review-image-upload-label').classList.remove('hidden');
    document.getElementById('review-image-input').value = '';
  }

  // ✅ কুপন, লয়ালটি ও রেফারেল স্টেট
  let appliedCoupon = null;
  let loyaltyRedeemActive = false;
  let userLoyaltyPoints = 0;
  let userReferralCode = null;
  let userReferralCount = 0;
  let userBalance = 0; // ✅ NEW (feature-44): প্রোফাইল ব্যালেন্স
  let isMobileNumberVerified = false;
  let base64SelfieString = "";
  let base64NidString = "";
  let base64SellerLogoString = "";
  let base64UploadedProductImageString = "";
  let lastTrackedLat = null;
  let lastTrackedLng = null;
  let localVideoStreamObject = null;

  // লাইভ স্ট্রিমিং ভ্যারিয়েবল
  let sellerLiveStreamObject = null;
  let customerLiveStreamObject = null;
  let currentSellerCameraMode = "environment";
  let currentCustomerCameraMode = "user";
  let isBroadcasting = false;

  // [FIX #3] লাইভ স্ট্রিম ডেটা এখন Firestore থেকে আসবে
  let activeStreamsCache = [];

  // ============================================================
  // ✅ [FIX #1] Firestore থেকে পণ্য লোড করো (রিয়েল-টাইম)
  // ============================================================
  function initProductsListener() {
    showProductSkeletons();
    firestore.collection("products")
      .onSnapshot((snapshot) => {
        if (!snapshot.empty) {
          products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          // ✅ অফলাইন মোডের জন্য সর্বশেষ পণ্য লোকালি ক্যাশ করো
          cacheProductsForOffline(products);
        } else {
          products = [...defaultProducts];
        }
        applyFiltersAndRender();
        renderRecentlyViewed();
        const totalInventoryBadge = document.getElementById('total-inventory-count');
        if (totalInventoryBadge) totalInventoryBadge.innerText = products.length + " টি";
        // ✅ [PERF FIX 4] পণ্য লোড শেষ হলে Splash Screen সরাও — হার্ডকোড ২০০০ms অপেক্ষা নয়
        if (typeof window._splashHide === 'function') { window._splashHide(); window._splashHide = null; }
        // ✅ FIX (feature-23): Firestore থেকে আসলেই ডেটা চলে এসেছে — মানে নেট আসলে কাজ
        // করছে। navigator.onLine ভুলভাবে false বলে থাকলেও এখানে নিশ্চিত প্রমাণ পেয়ে
        // offline fallback স্ক্রিন (যদি ভুলভাবে দেখানো হয়ে থাকে) সরিয়ে দেওয়া হলো
        dismissOfflineFallback();
        updateOfflineBanner();
      }, (error) => {
        console.error("Products listener error:", error);
        // ✅ ইন্টারনেট/Firestore সমস্যা হলে আগের ক্যাশ করা পণ্য দেখাও
        const cachedProducts = loadProductsFromOfflineCache();
        products = cachedProducts || [...defaultProducts];
        applyFiltersAndRender();
        renderRecentlyViewed();
        updateOfflineBanner();
        // ✅ FIX (feature-21): এরর হলেও splash screen সরাও — আগে এই পথে splash
        // হাইড হতো না, ফলে অফলাইনে প্রথমবার লোডে ইউজার splash-এ আটকে থাকতো
        if (typeof window._splashHide === 'function') { window._splashHide(); window._splashHide = null; }
      });
  }

  // ============================================================
  // ✅ প্রোডাক্ট রেন্ডার
  // ============================================================
  // ✅ [NEW feature-66] একটি প্রোডাক্ট কার্ডের HTML — আগে renderProducts()-এর ভেতরেই
  // ইনলাইন ছিল, লেজি/ব্যাচ রেন্ডারের জন্য আলাদা ফাংশনে বের করা হলো
  function buildProductCardHtml(p) {
    const sizeButtonsHtml = (p.sizes || []).map(size => `
      <button type="button" onclick="selectProductSize('${p.id}', '${escapeHtml(size)}', this)" class="size-btn-node-${p.id} border border-slate-200 rounded-lg px-2.5 py-1.5 text-[10px] font-bold text-slate-600 bg-white hover:border-orange-400 hover:text-orange-600 shadow-sm">${escapeHtml(size)}</button>
    `).join('');
    const stockBadge = p.stock <= 0
      ? `<span class="absolute top-2 left-2 bg-red-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full">স্টক শেষ</span>`
      : (p.stock <= 3 ? `<span class="absolute top-2 left-2 bg-amber-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full">মাত্র ${p.stock}টি বাকি</span>` : '');
    return `
      <div class="bg-white rounded-2xl shadow-sm overflow-hidden border border-slate-100 flex flex-col justify-between group">
        <div>
          <div class="overflow-hidden relative cursor-pointer" onclick="openProductDetail('${p.id}')">
            <img src="${escapeHtml(p.image)}" loading="lazy" class="w-full h-44 object-cover transform group-hover:scale-105 transition duration-500" alt="${escapeHtml(p.name)}" onerror="this.src='https://placehold.co/400x400/f8fafc/94a3b8?text=ছবি+নেই'">
            <span class="absolute top-2 right-2 bg-white/80 backdrop-blur-md px-2 py-0.5 text-[9px] font-bold text-orange-600 rounded-full border border-white/20">Premium</span>
            ${stockBadge}
          </div>
          <div class="p-3.5 pb-1">
            <h4 onclick="openProductDetail('${p.id}')" class="font-bold text-slate-800 text-xs leading-relaxed h-8 overflow-hidden cursor-pointer">${escapeHtml(p.name)}</h4>
            ${renderStarsHtml(getAvgRating(p), p.ratingCount || 0)}
            <p class="text-[9px] font-semibold text-slate-400 mt-2 mb-1 uppercase tracking-wider">সাইজ সিলেক্ট করুন</p>
            <div class="flex flex-wrap gap-1.5 mb-1.5" id="size-container-${p.id}">${sizeButtonsHtml}</div>
            ${p.colors && p.colors.length ? `<p class='text-[9px] font-semibold text-slate-400 mb-1 uppercase tracking-wider'>কালার</p>` + _buildColorChips(p.id, p.colors) : ''}
          </div>
        </div>
        <div class="p-3.5 pt-0">
          <!-- ✅ NEW: Quantity স্টেপার — +/− বাটন দিয়ে একাধিক প্রোডাক্ট বাছাই করা যাবে -->
          <div class="flex items-center justify-center gap-3 mb-2 pt-2 border-t border-slate-50">
            <button type="button" onclick="changeProductQty('${p.id}', -1)" ${p.stock <= 0 ? 'disabled' : ''} class="w-7 h-7 rounded-full bg-slate-100 text-slate-700 font-bold text-sm flex items-center justify-center active:scale-90 transition disabled:opacity-40 disabled:cursor-not-allowed">−</button>
            <span id="qty-display-${p.id}" class="text-xs font-black text-slate-800 w-6 text-center">${selectedQtyState[p.id] || 1}</span>
            <button type="button" onclick="changeProductQty('${p.id}', 1)" ${p.stock <= 0 ? 'disabled' : ''} class="w-7 h-7 rounded-full bg-slate-100 text-slate-700 font-bold text-sm flex items-center justify-center active:scale-90 transition disabled:opacity-40 disabled:cursor-not-allowed">+</button>
          </div>
          <div class="flex items-center justify-between mt-2 pt-2 border-t border-slate-50">
            <span class="text-orange-600 font-black text-sm">৳${p.price}</span>
            <button onclick="addToCart('${p.id}')" ${p.stock <= 0 ? 'disabled class="bg-slate-300 text-slate-500 text-[10px] font-bold px-3 py-2 rounded-xl cursor-not-allowed"' : 'class="bg-slate-900 text-white text-[10px] font-bold px-3 py-2 rounded-xl hover:bg-orange-600 active:scale-95 transition-all"'}>
              ${p.stock <= 0 ? 'স্টক নেই' : 'কার্টে যোগ করুন'}
            </button>
          </div>
        </div>
      </div>
    `;
  }

  // ✅ [NEW feature-66] লেজি/ব্যাচ রেন্ডার স্টেট — একবারে সব প্রোডাক্ট DOM-এ না বসিয়ে
  // ব্যাচে বসানো হয়, যাতে বড় ক্যাটালগেও প্রথম রেন্ডার দ্রুত হয় ও পেজ স্পিড ভালো থাকে
  const PRODUCT_LAZY_BATCH_SIZE = 12;
  let _lazyProductList = [];
  let _lazyProductRenderedCount = 0;
  let _productGridObserver = null;

  function renderProducts(filteredProducts = products) {
    const grid = document.getElementById('product-grid');
    if (!grid) return;

    // পুরনো observer থাকলে বন্ধ করো — ফিল্টার/সার্চ বদলালে আগের sentinel অবজার্ভ করার প্রয়োজন নেই
    if (_productGridObserver) { _productGridObserver.disconnect(); _productGridObserver = null; }

    grid.innerHTML = '';
    const sentinel = document.getElementById('product-grid-sentinel');
    const spinner = document.getElementById('product-grid-loading-spinner');
    if (spinner) spinner.classList.add('hidden');

    if (filteredProducts.length === 0) {
      grid.innerHTML = `<div class="col-span-2 text-center py-12 text-slate-400 text-xs">এই ক্যাটাগরিতে পণ্য নেই!</div>`;
      return;
    }

    _lazyProductList = filteredProducts;
    _lazyProductRenderedCount = 0;
    renderNextProductBatch();

    // ✅ স্ক্রল করে sentinel-এর কাছে পৌঁছালে পরের ব্যাচ লোড হবে (ইনফিনিট স্ক্রল)
    if (sentinel && _lazyProductList.length > PRODUCT_LAZY_BATCH_SIZE) {
      _productGridObserver = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting) renderNextProductBatch();
      }, { rootMargin: '400px' });
      _productGridObserver.observe(sentinel);
    }
  }

  function renderNextProductBatch() {
    const grid = document.getElementById('product-grid');
    const spinner = document.getElementById('product-grid-loading-spinner');
    if (!grid) return;
    const nextBatch = _lazyProductList.slice(_lazyProductRenderedCount, _lazyProductRenderedCount + PRODUCT_LAZY_BATCH_SIZE);
    if (nextBatch.length === 0) {
      if (spinner) spinner.classList.add('hidden');
      if (_productGridObserver) { _productGridObserver.disconnect(); _productGridObserver = null; }
      return;
    }
    if (spinner) spinner.classList.remove('hidden');
    grid.insertAdjacentHTML('beforeend', nextBatch.map(buildProductCardHtml).join(''));
    _lazyProductRenderedCount += nextBatch.length;
    if (_lazyProductRenderedCount >= _lazyProductList.length && spinner) spinner.classList.add('hidden');
  }

  // ============================================================
  // ✅ রেটিং হেল্পার ফাংশন
  // ============================================================
  function getAvgRating(p) {
    return (p.ratingCount && p.ratingCount > 0) ? (p.ratingSum / p.ratingCount) : 0;
  }

  function renderStarsHtml(rating, count, options = {}) {
    const size = options.size || 'text-[9px]';
    const showCount = options.showCount !== false;
    let html = `<div class="flex items-center gap-0.5 mt-1">`;
    for (let i = 1; i <= 5; i++) {
      const filled = i <= Math.round(rating);
      html += `<i class="fas fa-star ${size} ${filled ? 'text-amber-400' : 'text-slate-200'}"></i>`;
    }
    if (showCount) {
      html += `<span class="text-[9px] text-slate-400 font-semibold ml-1">${count > 0 ? '(' + count + ')' : '(নতুন)'}</span>`;
    }
    html += `</div>`;
    return html;
  }

  // ============================================================
  // ✅ ইউনিফাইড ফিল্টার + সর্ট + রেন্ডার পাইপলাইন
  // ============================================================
  function applyFiltersAndRender() {
    let filtered = [...products];

    // ক্যাটাগরি ফিল্টার
    if (currentFilterState.category !== 'all') {
      filtered = filtered.filter(p => p.category === currentFilterState.category);
    }

    // সার্চ ফিল্টার
    if (currentFilterState.searchQuery) {
      const q = currentFilterState.searchQuery;
      filtered = filtered.filter(p => p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q));
    }

    // প্রাইস ফিল্টার
    if (currentFilterState.priceMin !== null) {
      filtered = filtered.filter(p => p.price >= currentFilterState.priceMin);
    }
    if (currentFilterState.priceMax !== null) {
      filtered = filtered.filter(p => p.price <= currentFilterState.priceMax);
    }

    // সর্টিং
    switch (currentFilterState.sortBy) {
      case 'price_low':  filtered.sort((a, b) => a.price - b.price); break;
      case 'price_high': filtered.sort((a, b) => b.price - a.price); break;
      case 'rating':     filtered.sort((a, b) => getAvgRating(b) - getAvgRating(a)); break;
      case 'newest':
        filtered.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        break;
    }

    renderProducts(filtered);
    // ✅ Flash Sale badge পুনরায় প্রয়োগ করো
    if (FLASH_SALE_CONFIG && FLASH_SALE_CONFIG.enabled) applyFlashSaleBadgesToGrid();
  }

  function handleSortChange(value) {
    currentFilterState.sortBy = value;
    applyFiltersAndRender();
  }

  // ============================================================
  // ✅ প্রাইস ফিল্টার
  // ============================================================
  function togglePriceFilterPanel() {
    document.getElementById('price-filter-panel').classList.toggle('hidden');
  }

  function updatePriceFilterDot() {
    const dot = document.getElementById('price-filter-active-dot');
    const isActive = currentFilterState.priceMin !== null || currentFilterState.priceMax !== null;
    if (dot) dot.classList.toggle('hidden', !isActive);
  }

  function applyPriceRange(min, max, evt) {
    currentFilterState.priceMin = min;
    currentFilterState.priceMax = max;
    document.getElementById('price-min-input').value = (min !== null && min !== undefined) ? min : '';
    document.getElementById('price-max-input').value = (max !== null && max !== undefined) ? max : '';

    document.querySelectorAll('.price-chip').forEach(chip => {
      chip.classList.remove('bg-orange-600', 'text-white', 'border-orange-600');
      chip.classList.add('bg-white', 'text-slate-600', 'border-slate-200');
    });
    if (evt && evt.target) {
      evt.target.classList.remove('bg-white', 'text-slate-600', 'border-slate-200');
      evt.target.classList.add('bg-orange-600', 'text-white', 'border-orange-600');
    }

    updatePriceFilterDot();
    applyFiltersAndRender();
  }

  function applyCustomPriceRange() {
    const minVal = document.getElementById('price-min-input').value;
    const maxVal = document.getElementById('price-max-input').value;
    currentFilterState.priceMin = minVal !== '' ? parseFloat(minVal) : null;
    currentFilterState.priceMax = maxVal !== '' ? parseFloat(maxVal) : null;

    document.querySelectorAll('.price-chip').forEach(chip => {
      chip.classList.remove('bg-orange-600', 'text-white', 'border-orange-600');
      chip.classList.add('bg-white', 'text-slate-600', 'border-slate-200');
    });

    updatePriceFilterDot();
    applyFiltersAndRender();
  }

  function clearPriceFilter() {
    currentFilterState.priceMin = null;
    currentFilterState.priceMax = null;
    document.getElementById('price-min-input').value = '';
    document.getElementById('price-max-input').value = '';
    document.querySelectorAll('.price-chip').forEach(chip => {
      chip.classList.remove('bg-orange-600', 'text-white', 'border-orange-600');
      chip.classList.add('bg-white', 'text-slate-600', 'border-slate-200');
    });
    updatePriceFilterDot();
    applyFiltersAndRender();
  }

  // ============================================================
  // ✅ SKELETON LOADING — পণ্য লোড হওয়ার সময় শিমার কার্ড দেখাও
  // ============================================================
  function showProductSkeletons(count = 6) {
    const grid = document.getElementById('product-grid');
    if (!grid) return;
    grid.innerHTML = Array(count).fill(`
      <div class="bg-white rounded-2xl overflow-hidden border border-slate-100 flex flex-col">
        <div class="skeleton h-44 w-full"></div>
        <div class="p-3.5 space-y-2.5">
          <div class="skeleton h-3 w-3/4 rounded-md"></div>
          <div class="skeleton h-2.5 w-1/2 rounded-md"></div>
          <div class="flex gap-1.5 mt-1">
            <div class="skeleton h-6 w-10 rounded-lg"></div>
            <div class="skeleton h-6 w-10 rounded-lg"></div>
            <div class="skeleton h-6 w-10 rounded-lg"></div>
          </div>
          <div class="flex justify-between items-center mt-2 pt-2 border-t border-slate-50">
            <div class="skeleton h-4 w-12 rounded-md"></div>
            <div class="skeleton h-8 w-24 rounded-xl"></div>
          </div>
        </div>
      </div>
    `).join('');
  }

  // ============================================================
  // ✅ DARK MODE — থিম টগল
  // ============================================================
  function updateThemeIcon(isDark) {
    // ✅ বাগ ফিক্স: আগে এখানে 'dark-mode-icon' নামের একটি অস্তিত্বহীন এলিমেন্ট খোঁজা হতো,
    // আর সেটা না পেলে ফাংশনটি সাথে সাথে return করে দিত — ফলে নিচের প্রোফাইল টগল সিঙ্ক কোডটি
    // কখনোই চলত না (ডার্ক মোড টগল করলে সেটিংস মডালের আইকন/সুইচ আপডেট হতো না)।
    const _pcb = document.getElementById('profile-dark-mode-toggle');
    if (_pcb) _pcb.checked = isDark;
    const _pic = document.getElementById('profile-dark-mode-icon');
    if (_pic) { _pic.classList.toggle('fa-moon', !isDark); _pic.classList.toggle('fa-sun', isDark); }
  }

  function applyDarkModePreference() {
    // <head>-এর early script ইতিমধ্যে ক্লাস সেট করে দিয়েছে; এখানে শুধু আইকন সিঙ্ক করো
    const isDark = document.documentElement.classList.contains('dark');
    updateThemeIcon(isDark);
  }

  function toggleDarkMode() {
    const isDark = document.documentElement.classList.toggle('dark');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    updateThemeIcon(isDark);
    // ✅ NEW (feature-20, dark-mode polish): অ্যানালিটিক্স প্যানেল খোলা থাকলে চার্ট
    // রি-রেন্ডার করা হলো, যাতে axis/gridline-এর রঙ থিমের সাথে সাথে সাথে আপডেট হয়
    if (document.getElementById('analytics-chart-bars') && typeof loadAnalytics === 'function') {
      try { loadAnalytics(); } catch (e) {}
    }
  }

  // ============================================================
  // ✅ PULL-TO-REFRESH — উপর থেকে টেনে রিফ্রেশ করুন
  // ============================================================
  async function refreshProductsData() {
    showProductSkeletons();
    try {
      const snap = await firestore.collection("products").get();
      products = !snap.empty ? snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) : [...defaultProducts];
      const totalInventoryBadge = document.getElementById('total-inventory-count');
      if (totalInventoryBadge) totalInventoryBadge.innerText = products.length + " টি";
    } catch (e) {
      console.error("Refresh error:", e);
      products = [...defaultProducts];
    }
    renderProducts();
  }

  (function initPullToRefresh() {
    let startY = 0, pulling = false, refreshing = false;
    const THRESHOLD = 70;
    const indicator = document.getElementById('pull-refresh-indicator');
    if (!indicator) return;

    window.addEventListener('touchstart', (e) => {
      if (window.scrollY <= 0 && !refreshing) {
        startY = e.touches[0].clientY;
        pulling = true;
      }
    }, { passive: true });

    window.addEventListener('touchmove', (e) => {
      if (!pulling || refreshing) return;
      const diff = e.touches[0].clientY - startY;
      if (diff > 0 && window.scrollY <= 0) {
        const pull = Math.min(diff, 110);
        indicator.style.transform = `translate(-50%, ${Math.min(pull - 50, 26)}px)`;
        indicator.classList.toggle('visible', pull > 8);
        indicator.classList.toggle('ready', pull > THRESHOLD);
      }
    }, { passive: true });

    window.addEventListener('touchend', () => {
      if (!pulling) return;
      pulling = false;
      if (indicator.classList.contains('ready') && !refreshing) {
        refreshing = true;
        indicator.classList.add('spinning');
        refreshProductsData().finally(() => {
          setTimeout(() => {
            indicator.classList.remove('visible', 'ready', 'spinning');
            indicator.style.transform = '';
            refreshing = false;
          }, 500);
        });
      } else {
        indicator.classList.remove('visible', 'ready');
        indicator.style.transform = '';
      }
    });
  })();

  // ============================================================
  // ✅ সম্প্রতি দেখা পণ্য
  // ============================================================
  function trackRecentlyViewed(productId) {
    let viewed = safeJSONParse(localStorage.getItem('recently_viewed'), []);
    viewed = viewed.filter(id => id !== productId);
    viewed.unshift(productId);
    viewed = viewed.slice(0, 10);
    localStorage.setItem('recently_viewed', JSON.stringify(viewed));
    renderRecentlyViewed();
  }

  function renderRecentlyViewed() {
    const section = document.getElementById('recently-viewed-section');
    const container = document.getElementById('recently-viewed-container');
    if (!section || !container) return;

    const viewedIds = safeJSONParse(localStorage.getItem('recently_viewed'), []);
    const viewedProducts = viewedIds.map(id => products.find(p => p.id == id)).filter(Boolean);

    if (viewedProducts.length === 0) {
      section.classList.add('hidden');
      return;
    }
    section.classList.remove('hidden');
    container.innerHTML = viewedProducts.map(p => `
      <div onclick="openProductDetail('${p.id}')" class='flex flex-col items-center shrink-0 w-16 cursor-pointer group'>
        <div class='w-14 h-14 rounded-xl overflow-hidden border-2 border-slate-100 group-hover:border-orange-300 transition'>
          <img src="${escapeHtml(p.image)}" loading='lazy' class='w-full h-full object-cover' alt="${escapeHtml(p.name)}" onerror="this.src='https://placehold.co/56x56/f8fafc/94a3b8?text=?'">
        </div>
        <p class='text-[9px] font-bold text-slate-600 mt-1 text-center line-clamp-1 w-full'>${escapeHtml(p.name)}</p>
      </div>
    `).join('');
  }

  // ============================================================
  // ✅ Related Products — একই ক্যাটাগরির পণ্য
  // ============================================================
  function renderRelatedProducts(product) {
    const section = document.getElementById('related-products-section');
    const container = document.getElementById('related-products-container');
    if (!section || !container) return;

    const related = products.filter(p => p.category === product.category && p.id !== product.id).slice(0, 8);
    if (related.length === 0) {
      section.classList.add('hidden');
      return;
    }
    section.classList.remove('hidden');
    container.innerHTML = related.map(p => `
      <div onclick="openProductDetail('${p.id}')" class='flex flex-col shrink-0 w-28 cursor-pointer group'>
        <div class='w-28 h-28 rounded-xl overflow-hidden border border-slate-100'>
          <img src="${escapeHtml(p.image)}" loading='lazy' class='w-full h-full object-cover group-hover:scale-105 transition' alt="${escapeHtml(p.name)}" onerror="this.src='https://placehold.co/120x120/f8fafc/94a3b8?text=?'">
        </div>
        <p class='text-[10px] font-bold text-slate-700 mt-1.5 line-clamp-2 leading-snug'>${escapeHtml(p.name)}</p>
        <p class='text-[11px] font-black text-orange-600 mt-0.5'>৳${escapeHtml(String(p.price))}</p>
      </div>
    `).join('');
  }

  // ============================================================
  // ✅ Product Detail Modal
  // ============================================================
  function openProductDetail(productId) {
    const product = products.find(p => p.id == productId);
    if (!product) return;

    currentDetailProductId = productId;
    currentReviewRating = 0;

    document.getElementById('detail-product-image').src = product.image;
    document.getElementById('detail-product-name').innerText = product.name;
    document.getElementById('detail-product-price').innerText = `৳${product.price}`;

    const avgRating = getAvgRating(product);
    document.getElementById('detail-product-stars').innerHTML = renderStarsHtml(avgRating, product.ratingCount || 0, { size: 'text-sm', showCount: false });
    document.getElementById('detail-product-rating-text').innerText = (product.ratingCount > 0)
      ? `${avgRating.toFixed(1)} (${product.ratingCount} রিভিউ)`
      : 'এখনো কোনো রিভিউ নেই';

    const stockEl = document.getElementById('detail-product-stock');
    if (product.stock <= 0) {
      stockEl.innerText = 'স্টক শেষ';
      stockEl.className = 'text-[11px] font-bold px-2.5 py-1 rounded-full bg-red-50 text-red-600';
    } else if (product.stock <= 3) {
      stockEl.innerText = `মাত্র ${product.stock}টি বাকি`;
      stockEl.className = 'text-[11px] font-bold px-2.5 py-1 rounded-full bg-amber-50 text-amber-600';
    } else {
      stockEl.innerText = 'স্টকে আছে';
      stockEl.className = 'text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-600';
    }

    // সাইজ অপশন
    const sizeContainer = document.getElementById('detail-size-container');
    sizeContainer.innerHTML = (product.sizes || []).map(size => `
      <button type='button' onclick="selectDetailProductSize('${size}', this)" class='detail-size-btn border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-600 bg-white hover:border-orange-400 hover:text-orange-600 transition'>${size}</button>
    `).join('');

    // কার্টে যোগ করুন বাটন
    const addBtn = document.getElementById('detail-add-to-cart-btn');
    if (product.stock <= 0) {
      addBtn.disabled = true;
      addBtn.className = 'w-full bg-slate-300 text-slate-500 font-bold text-sm py-3 rounded-2xl cursor-not-allowed';
      addBtn.innerText = 'স্টক নেই';
    } else {
      addBtn.disabled = false;
      addBtn.className = 'w-full bg-slate-900 text-white font-bold text-sm py-3 rounded-2xl hover:bg-orange-600 active:scale-95 transition';
      addBtn.innerText = 'কার্টে যোগ করুন';
    }

    // রিভিউ ফর্ম রিসেট
    document.getElementById('review-comment-input').value = '';
    highlightReviewStars(0);
    removeReviewImage();

    renderRelatedProducts(product);
    loadProductReviews(productId);
    trackRecentlyViewed(productId);
    // ✅ নতুন ফিচার
    renderDetailThumbs(product);
    renderDetailDescription(product);
    showFlashSaleInDetail(product);
    // ✅ তুলনা বাটনের অবস্থা আপডেট
    const compareBtn   = document.getElementById('detail-compare-btn');
    const compareLabel = document.getElementById('detail-compare-label');
    const inCompare    = compareList.some(p => p.id == productId);
    if (compareBtn) {
      compareBtn.className = inCompare
        ? 'w-full border-2 border-blue-500 bg-blue-50 text-blue-700 font-bold text-sm py-2.5 rounded-2xl active:scale-95 transition flex items-center justify-center gap-2'
        : 'w-full border-2 border-blue-200 text-blue-600 font-bold text-sm py-2.5 rounded-2xl hover:bg-blue-50 active:scale-95 transition flex items-center justify-center gap-2';
    }
    if (compareLabel) compareLabel.innerText = inCompare ? 'তুলনা থেকে বাদ দিন ✓' : 'তুলনায় যোগ করুন';

    // ✅ উইশলিস্ট বাটনের অবস্থা আপডেট
    const wishlistBtn = document.getElementById('detail-wishlist-btn');
    const wishlistLabel = document.getElementById('detail-wishlist-label');
    const currentWishlist = safeJSONParse(localStorage.getItem('wishlist'), []);
    const inWishlist = currentWishlist.some(item => item.id == productId);
    if (wishlistBtn) {
      wishlistBtn.className = inWishlist
        ? 'w-full border-2 border-rose-500 bg-rose-50 text-rose-700 font-bold text-sm py-2.5 rounded-2xl active:scale-95 transition flex items-center justify-center gap-2'
        : 'w-full border-2 border-rose-200 text-rose-600 font-bold text-sm py-2.5 rounded-2xl hover:bg-rose-50 active:scale-95 transition flex items-center justify-center gap-2';
    }
    if (wishlistLabel) wishlistLabel.innerText = inWishlist ? 'উইশলিস্ট থেকে বাদ দিন ✓' : 'উইশলিস্টে যোগ করুন';

    document.getElementById('product-detail-modal').classList.remove('hidden');
    document.body.style.overflow = 'hidden';

    // ✅ OG Tags আপডেট — WhatsApp/Facebook শেয়ার প্রিভিউ
    try {
      document.getElementById('og-title')?.setAttribute('content', product.name + ' | পারভেজ স্টোর');
      document.getElementById('og-description')?.setAttribute('content', 'মূল্য: ৳' + product.price + ' — পারভেজ স্টোরে পাওয়া যাচ্ছে!');
      document.getElementById('og-image')?.setAttribute('content', product.image || 'https://bdbigbazzar.blogspot.com/og-banner.png');
    } catch(e) {}
  }

  function closeProductDetail() {
    document.getElementById('product-detail-modal').classList.add('hidden');
    document.body.style.overflow = 'auto';
    currentDetailProductId = null;
    // ✅ OG Tags রিসেট
    try {
      document.getElementById('og-title')?.setAttribute('content', 'পারভেজ স্টোর | BD BIG BAZZAR');
      document.getElementById('og-description')?.setAttribute('content', 'কিনুন, বিক্রি করুন, রাইড বুক করুন — সব এক জায়গায়!');
      document.getElementById('og-image')?.setAttribute('content', 'https://bdbigbazzar.blogspot.com/og-banner.png');
    } catch(e) {}
  }

  // ✅ পণ্য শেয়ার ফাংশন
  function shareProductWhatsApp() {
    if (!currentDetailProductId) return;
    const p = products.find(x => x.id == currentDetailProductId);
    if (!p) return;
    const url = 'https://bdbigbazzar.blogspot.com/?product=' + encodeURIComponent(p.id);
    const text = '🛍️ *' + p.name + '*\n💰 মূল্য: ৳' + p.price + '\n\nপারভেজ স্টোরে পাওয়া যাচ্ছে!\n' + url;
    window.open('https://wa.me/?text=' + encodeURIComponent(text), '_blank');
  }

  function shareProductFacebook() {
    if (!currentDetailProductId) return;
    const url = 'https://bdbigbazzar.blogspot.com/?product=' + encodeURIComponent(currentDetailProductId);
    window.open('https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(url), '_blank');
  }

  function copyProductLink() {
    if (!currentDetailProductId) return;
    const url = 'https://bdbigbazzar.blogspot.com/?product=' + encodeURIComponent(currentDetailProductId);
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(function() {
        var btn = document.getElementById('copy-link-btn');
        if (btn) {
          btn.innerHTML = '<i class="fas fa-check text-emerald-600 text-xs"></i>';
          setTimeout(function() { btn.innerHTML = '<i class="fas fa-link text-xs"></i>'; }, 2000);
        }
        showCartToast && showCartToast('✅ লিংক কপি হয়েছে!', 'success');
      });
    }
  }

  function selectDetailProductSize(size, element) {
    if (!currentDetailProductId) return;
    selectedSizesState[currentDetailProductId] = size;
    document.querySelectorAll('.detail-size-btn').forEach(btn => {
      btn.classList.remove('border-orange-500', 'bg-orange-50', 'text-orange-600');
      btn.classList.add('border-slate-200', 'bg-white', 'text-slate-600');
    });
    element.classList.remove('border-slate-200', 'bg-white', 'text-slate-600');
    element.classList.add('border-orange-500', 'bg-orange-50', 'text-orange-600');
  }

  function addToCartFromDetail() {
    if (!currentDetailProductId) return;
    addToCart(currentDetailProductId);
  }

  // ============================================================
  // ✅ রিভিউ ও রেটিং সিস্টেম
  // ============================================================
  function setReviewRating(stars) {
    currentReviewRating = stars;
    highlightReviewStars(stars);
  }

  function highlightReviewStars(stars) {
    document.querySelectorAll('.review-star-btn').forEach(btn => {
      const val = parseInt(btn.dataset.star);
      if (val <= stars) {
        btn.classList.remove('text-slate-200');
        btn.classList.add('text-amber-400');
      } else {
        btn.classList.remove('text-amber-400');
        btn.classList.add('text-slate-200');
      }
    });
  }

  async function loadProductReviews(productId) {
    const container = document.getElementById('reviews-list-container');
    container.innerHTML = `<div class='text-center py-4 text-slate-400 text-xs'><i class='fas fa-spinner fa-spin mr-1.5'></i> লোড হচ্ছে...</div>`;
    try {
      const snap = await firestore.collection('products').doc(String(productId)).collection('reviews').orderBy('createdAt', 'desc').limit(20).get();
      if (snap.empty) {
        container.innerHTML = `<div class='text-center py-6 text-slate-400 text-xs'><i class='fas fa-comment-slash text-xl text-slate-200 mb-1.5 block'></i>এখনো কোনো রিভিউ নেই। প্রথম রিভিউ দিন!</div>`;
        return;
      }
      container.innerHTML = snap.docs.map(doc => {
        const r = doc.data();
        const date = r.createdAt ? new Date(r.createdAt.seconds * 1000).toLocaleDateString('bn-BD', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
        const safeUserName = escapeHtml(r.userName || 'কাস্টমার');
        const avatarFallback = `https://placehold.co/28x28/f1f5f9/94a3b8?text=${encodeURIComponent((r.userName || '?')[0] || '?')}`;
        return `
          <div class='border border-slate-100 rounded-xl p-2.5'>
            <div class='flex items-center justify-between mb-1'>
              <div class='flex items-center gap-2'>
                <img src="${escapeHtml(r.userPhoto || avatarFallback)}" loading='lazy' class='w-6 h-6 rounded-full object-cover' alt="${safeUserName}" onerror="this.src='${avatarFallback}'">
                <span class='text-[11px] font-bold text-slate-700'>${safeUserName}</span>
              </div>
              <span class='text-[9px] text-slate-400'>${escapeHtml(date)}</span>
            </div>
            ${renderStarsHtml(r.rating || 0, 0, { size: 'text-[10px]', showCount: false })}
            ${r.comment ? `<p class='text-[11px] text-slate-600 mt-1.5 leading-relaxed'>${escapeHtml(r.comment)}</p>` : ''}
            ${r.imageUrl ? `<img src="${escapeHtml(r.imageUrl)}" loading='lazy' class='mt-2 w-20 h-20 object-cover rounded-lg border border-slate-100 cursor-pointer' onclick="window.open('${escapeHtml(r.imageUrl)}','_blank')">` : ''}
          </div>`;
      }).join('');
    } catch (e) {
      container.innerHTML = `<div class='text-center py-4 text-red-400 text-xs'>রিভিউ লোড হয়নি। Firebase Rules চেক করুন।</div>`;
      console.error("Review load error:", e);
    }
  }

  async function submitProductReview() {
    if (!currentUser) { showCartToast('⚠️ রিভিউ দিতে আগে Google দিয়ে লগইন করুন!'); return; }
    if (!currentDetailProductId) return;
    if (currentReviewRating === 0) { showCartToast('⚠️ দয়া করে স্টার রেটিং দিন!'); return; }

    const comment = document.getElementById('review-comment-input').value.trim();
    const btn = document.getElementById('submit-review-btn');
    if (btn) { btn.disabled = true; btn.innerHTML = `<i class="fas fa-spinner fa-spin mr-1.5"></i> জমা হচ্ছে...`; }

    try {
      // ✅ NEW: রিভিউয়ের সাথে ছবি থাকলে আগে Firebase Storage-এ আপলোড করো
      let imageUrl = null;
      if (_reviewImageFile) {
        if (btn) btn.innerHTML = `<i class="fas fa-spinner fa-spin mr-1.5"></i> ছবি আপলোড হচ্ছে...`;
        const safeName = _reviewImageFile.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const storagePath = `reviews/${currentUser.uid}/${currentDetailProductId}_${Date.now()}_${safeName}`;
        const uploadTask = storage.ref(storagePath).put(_reviewImageFile, { contentType: _reviewImageFile.type });
        await new Promise((resolve, reject) => uploadTask.on('state_changed', null, reject, resolve));
        imageUrl = await uploadTask.snapshot.ref.getDownloadURL();
        if (btn) btn.innerHTML = `<i class="fas fa-spinner fa-spin mr-1.5"></i> জমা হচ্ছে...`;
      }

      const productRef = firestore.collection('products').doc(String(currentDetailProductId));

      await productRef.collection('reviews').add({
        uid: currentUser.uid,
        userName: currentUser.displayName || 'কাস্টমার',
        userPhoto: currentUser.photoURL || '',
        rating: currentReviewRating,
        comment,
        imageUrl,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });

      await productRef.set({
        ratingSum: firebase.firestore.FieldValue.increment(currentReviewRating),
        ratingCount: firebase.firestore.FieldValue.increment(1)
      }, { merge: true });

      // লোকাল স্টেট আপডেট করো
      const product = products.find(p => p.id == currentDetailProductId);
      if (product) {
        product.ratingSum = (product.ratingSum || 0) + currentReviewRating;
        product.ratingCount = (product.ratingCount || 0) + 1;

        const avgRating = getAvgRating(product);
        document.getElementById('detail-product-stars').innerHTML = renderStarsHtml(avgRating, product.ratingCount, { size: 'text-sm', showCount: false });
        document.getElementById('detail-product-rating-text').innerText = `${avgRating.toFixed(1)} (${product.ratingCount} রিভিউ)`;
      }

      document.getElementById('review-comment-input').value = '';
      currentReviewRating = 0;
      highlightReviewStars(0);
      removeReviewImage();

      await loadProductReviews(currentDetailProductId);
      applyFiltersAndRender();
      showCartToast('✅ আপনার রিভিউ জমা হয়েছে! ধন্যবাদ।');
    } catch (e) {
      showCartToast('❌ রিভিউ জমা হয়নি: ' + e.message);
      console.error("Review submit error:", e);
    } finally {
      if (btn) { btn.disabled = false; btn.innerHTML = `<i class="fas fa-paper-plane mr-1.5"></i> রিভিউ জমা দিন`; }
    }
  }

  // ============================================================
  // ✅ কার্ট ফাংশন
  // ============================================================
  function addToCart(id) {
    const product = products.find(p => p.id == id);
    if (!product) return;
    // ✅ NEW: +/− স্টেপার দিয়ে বাছাই করা quantity ব্যবহার হবে (ডিফল্ট ১)
    const qtyToAdd = selectedQtyState[id] || 1;
    const existingInCart = cart.find(c => c.id == id);
    const currentQtyInCart = existingInCart ? existingInCart.quantity : 0;
    if (currentQtyInCart + qtyToAdd > product.stock) { alert("দুঃখিত, এই পণ্যের স্টকে আর পণ্য নেই!"); return; }
    const productSize = selectedSizesState[id];
    if (!productSize) { alert(`দয়া করে প্রথমে সাইজ সিলেক্ট করুন!`); return; }
    const item = cart.find(c => c.id == id && c.size === productSize);
    if (item) { item.quantity += qtyToAdd; } else { cart.push({ ...product, quantity: qtyToAdd, size: productSize }); }
    saveCart(); updateCartUi();
    alert(`"${product.name}" (${qtyToAdd}টি) কার্টে যোগ হয়েছে।`);
    // কার্টে যোগ হওয়ার পর স্টেপার আবার ১-এ রিসেট
    selectedQtyState[id] = 1;
    const display = document.getElementById(`qty-display-${id}`);
    if (display) display.innerText = 1;
  }

  function removeFromCart(index) { cart.splice(index, 1); saveCart(); updateCartUi(); }
  function saveCart() { localStorage.setItem('cart', JSON.stringify(cart)); }

  function updateCartUi() {
    const countElement = document.getElementById('cart-count');
    const navCountElement = document.getElementById('nav-cart-count');
    const itemsContainer = document.getElementById('cart-items');
    const totalItems = cart.reduce((acc, item) => acc + item.quantity, 0);
    if (countElement) countElement.innerText = totalItems;
    if (navCountElement) navCountElement.innerText = totalItems;

    if (itemsContainer) {
      if (cart.length === 0) {
        itemsContainer.innerHTML = `<div class="text-center py-8 text-slate-400 text-xs font-medium">আপনার কার্টটি খালি!</div>`;
      } else {
        itemsContainer.innerHTML = cart.map((item, index) => `
          <div class="flex items-center justify-between bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-xs">
            <div class="flex items-center gap-3">
              <img src="${item.image}" loading="lazy" class="w-10 h-10 object-cover rounded-lg" onerror="this.src='https://placehold.co/40x40/f8fafc/94a3b8?text=?'">
              <div>
                <p class="font-bold text-slate-800">${item.name} <span class="text-orange-600 font-extrabold">[${item.size}]</span></p>
                <p class="text-slate-500 mt-0.5 font-medium">৳${item.price} × ${item.quantity}</p>
              </div>
            </div>
            <button onclick="removeFromCart(${index})" class="text-rose-500 p-2"><i class="fas fa-trash-can text-sm"></i></button>
          </div>
        `).join('');
      }
    }

    updateOrderSummaryUi();
    autoFillCheckoutForm();
  }

  // ============================================================
  // ✅ কুপন, লয়ালটি পয়েন্ট — অর্ডার সামারি হিসাব
  // ============================================================
  function calculateOrderTotals() {
    const subtotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    let couponDiscount = 0;

    if (appliedCoupon) {
      if (appliedCoupon.type === 'percent') {
        couponDiscount = subtotal * (appliedCoupon.value / 100);
        if (appliedCoupon.maxDiscount) couponDiscount = Math.min(couponDiscount, appliedCoupon.maxDiscount);
      } else {
        couponDiscount = appliedCoupon.value;
      }
    }
    couponDiscount = Math.min(couponDiscount, subtotal);

    let pointsDiscount = 0;
    if (loyaltyRedeemActive && userLoyaltyPoints > 0) {
      // ১০ পয়েন্ট = ৳১ ছাড়
      pointsDiscount = Math.floor(userLoyaltyPoints / 10);
      pointsDiscount = Math.min(pointsDiscount, Math.max(subtotal - couponDiscount, 0));
    }

    const totalDiscount = Math.min(couponDiscount + pointsDiscount, subtotal);
    const total = Math.max(subtotal - totalDiscount, 0);
    const pointsUsed = pointsDiscount * 10;

    return { subtotal, couponDiscount, pointsDiscount, totalDiscount, total, pointsUsed };
  }

  function updateOrderSummaryUi() {
    const totals = calculateOrderTotals();
    const subtotalEl = document.getElementById('cart-subtotal');
    const discountRow = document.getElementById('discount-row');
    const discountEl = document.getElementById('cart-discount');
    const totalEl = document.getElementById('cart-total');

    if (subtotalEl) subtotalEl.innerText = totals.subtotal;
    if (totalEl) totalEl.innerText = totals.total;
    if (discountRow && discountEl) {
      if (totals.totalDiscount > 0) {
        discountRow.classList.remove('hidden');
        discountEl.innerText = Math.round(totals.totalDiscount);
      } else {
        discountRow.classList.add('hidden');
      }
    }

    // লয়ালটি রিডিম বক্স দেখাও/লুকাও
    const loyaltyBox = document.getElementById('loyalty-redeem-box');
    const loyaltyLabel = document.getElementById('loyalty-points-label');
    if (loyaltyBox && loyaltyLabel) {
      if (currentUser && userLoyaltyPoints >= 10) {
        loyaltyBox.classList.remove('hidden');
        const maxRedeemable = Math.floor(userLoyaltyPoints / 10);
        loyaltyLabel.innerText = `আপনার ${userLoyaltyPoints} পয়েন্ট আছে — ৳${maxRedeemable} ছাড় নিতে চান?`;
      } else {
        loyaltyBox.classList.add('hidden');
        loyaltyRedeemActive = false;
      }
    }
  }

  // ============================================================
  // ✅ কুপন কোড প্রয়োগ
  // ============================================================
  async function applyCouponCode() {
    const codeInput = document.getElementById('coupon-code-input');
    const code = codeInput.value.trim().toUpperCase();
    if (!code) { alert('কুপন কোড লিখুন!'); return; }

    const subtotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);

    try {
      const couponDoc = await firestore.collection('coupons').doc(code).get();
      if (!couponDoc.exists) { alert('❌ এই কুপন কোডটি সঠিক নয়!'); return; }
      const coupon = couponDoc.data();

      if (coupon.isActive === false) { alert('এই কুপনটি আর সক্রিয় নয়!'); return; }
      if (coupon.expiryDate) {
        const expiry = new Date(coupon.expiryDate);
        const today = new Date(); today.setHours(0,0,0,0);
        if (expiry < today) { alert('এই কুপনের মেয়াদ শেষ হয়ে গেছে!'); return; }
      }
      if (coupon.minOrderAmount && subtotal < coupon.minOrderAmount) {
        alert(`এই কুপন প্রয়োগের জন্য সর্বনিম্ন অর্ডার ৳${coupon.minOrderAmount} হতে হবে!`);
        return;
      }
      if (coupon.usageLimit && (coupon.usedCount || 0) >= coupon.usageLimit) {
        alert('এই কুপনের ব্যবহারের সীমা শেষ হয়ে গেছে!');
        return;
      }

      appliedCoupon = { id: couponDoc.id, ...coupon };
      const discountText = coupon.type === 'percent' ? `${coupon.value}% ছাড় প্রযোজ্য হয়েছে` : `৳${coupon.value} ছাড় প্রযোজ্য হয়েছে`;
      document.getElementById('coupon-applied-info').classList.remove('hidden');
      document.getElementById('coupon-applied-text').innerText = `${code} — ${discountText}`;
      codeInput.value = '';
      codeInput.disabled = true;
      updateOrderSummaryUi();
    } catch (e) {
      alert('কুপন যাচাই করা যায়নি: ' + e.message);
      console.error("Coupon error:", e);
    }
  }

  function removeCouponCode() {
    appliedCoupon = null;
    document.getElementById('coupon-applied-info').classList.add('hidden');
    document.getElementById('coupon-code-input').disabled = false;
    updateOrderSummaryUi();
  }

  function toggleLoyaltyRedeem() {
    loyaltyRedeemActive = document.getElementById('loyalty-redeem-checkbox').checked;
    updateOrderSummaryUi();
  }

  function openCart() {
    const m = document.getElementById('cart-modal');
    if (m) { m.classList.remove('hidden'); document.body.style.overflow = 'hidden'; updateOrderSummaryUi(); }
    autoFillCheckoutForm();
    // ডেলিভারি চার্জ রিসেট
    window._deliveryCharge = 0;
    const districtEl = document.getElementById('delivery-district');
    if (districtEl && !districtEl.value) {
      document.getElementById('delivery-result')?.classList.add('hidden');
    }
    // Payment Config নম্বর বসাও
    applyPaymentConfig();
    initPaymentSelect();
    // ✅ Address Book লিংক যোগ করো
    injectAddressBookLink();
  }
  function closeCart() { const m = document.getElementById('cart-modal'); if (m) { m.classList.add('hidden'); document.body.style.overflow = 'auto'; } }

  // ============================================================
  // ✅ অর্ডার প্লেস — Firestore
  // ============================================================
  async function placeOrder() {
    if (cart.length === 0) { alert('কার্ট খালি!'); return; }
    // ✅ NEW (feature-21): অফলাইনে অর্ডার সাবমিট করার চেষ্টা করলে Firestore-এর
    // ঘোলাটে এরর দেখানোর বদলে স্পষ্ট অফলাইন স্ক্রিন দেখাও
    if (!navigator.onLine) { showOfflineFallback(); return; }
    const customerName    = document.getElementById('customer-name')?.value.trim();
    const customerPhone   = document.getElementById('customer-phone')?.value.trim();
    const customerAddress = document.getElementById('customer-address')?.value.trim();
    const paymentMethod   = document.getElementById('payment-method')?.value;
    const bkashTxId       = document.getElementById('bkash-txid')?.value.trim();
    const qrTxId          = document.getElementById('qr-txid')?.value.trim();
    const emiProvider     = document.getElementById('emi-provider')?.value;
    const emiCardNumber   = document.getElementById('emi-card-number')?.value.trim();
    if (!customerName)    { alert('অনুগ্রহ করে আপনার নাম দিন!'); return; }
    if (!customerPhone)   { alert('অনুগ্রহ করে মোবাইল নম্বর দিন!'); return; }
    if (!customerAddress) { alert('অনুগ্রহ করে ঠিকানা দিন!'); return; }
    if (paymentMethod === 'bkash' && !bkashTxId) { alert('বিকাশ ট্র্যানজেকশন আইডি দিন!'); return; }
    if (paymentMethod === 'qr' && !qrTxId) { alert('QR পেমেন্টের ট্র্যানজেকশন আইডি দিন!'); return; }
    if (paymentMethod === 'emi' && !emiCardNumber) { alert('EMI-এর জন্য কার্ড/অ্যাকাউন্ট নম্বর দিন!'); return; }
    const orderBtn = document.querySelector('[onclick="placeOrder()"]');
    if (orderBtn) { orderBtn.disabled = true; orderBtn.innerHTML = `<i class="fas fa-spinner fa-spin mr-2"></i> অর্ডার হচ্ছে...`; }
    const savedProfile = safeJSONParse(localStorage.getItem('user_profile_data'), {});
    const totals = calculateOrderTotals();
    // ✅ [FIX #8] window._deliveryCharge global variable এর বদলে সরাসরি function call
    // calculateDeliveryCharge() return করে, তাই global variable দরকার নেই
    const deliveryCharge = calculateDeliveryCharge() || 0;
    const deliveryDistrict = document.getElementById('delivery-district')?.options[document.getElementById('delivery-district')?.selectedIndex]?.text || '';
    const nagadTxId  = document.getElementById('nagad-txid')?.value.trim()  || null;
    const rocketTxId = document.getElementById('rocket-txid')?.value.trim() || null;

    const orderData = {
      storeName:       "পারভেজ স্টোর",
      customerName, customerPhone, customerAddress,
      paymentMethod,
      txId: paymentMethod === 'bkash'  ? bkashTxId  :
            paymentMethod === 'nagad'  ? nagadTxId  :
            paymentMethod === 'rocket' ? rocketTxId :
            paymentMethod === 'qr'     ? qrTxId     : null,
      emiProvider:     paymentMethod === 'emi' ? emiProvider   : null,
      emiCardNumber:   paymentMethod === 'emi' ? emiCardNumber : null,
      // ✅ NEW (feature-48): প্রতিটা আইটেমের সাথে sellerUid রাখা হলো (মাল্টি-ভেন্ডর কার্ট সাপোর্ট),
      // যাতে ডেলিভারির সময় প্রত্যেক সেলারকে তার নিজের পণ্যের টাকা আলাদাভাবে দেওয়া যায়
      items: cart.map(item => ({ id: item.id, name: item.name, price: item.price, quantity: item.quantity, size: item.size, image: item.image, sellerUid: item.sellerUid || 'default' })),
      // ✅ NEW (feature-48): ডিসটিংক্ট সেলার uid-গুলোর লিস্ট — সেলার ড্যাশবোর্ডে অর্ডার খুঁজে পেতে এটা দিয়ে কোয়েরি হবে
      sellerUids:      [...new Set(cart.map(item => item.sellerUid || 'default'))],
      subtotal:        totals.subtotal,
      deliveryCharge,
      deliveryDistrict,
      couponCode:      appliedCoupon ? appliedCoupon.code : null,
      couponDiscount:  Math.round(totals.couponDiscount),
      pointsRedeemed:  totals.pointsUsed,
      pointsDiscount:  Math.round(totals.pointsDiscount),
      totalAmount:     totals.total + deliveryCharge,
      isVerified:      !!currentUser,
      status:          "পেন্ডিং 🕐",
      createdAt:       firebase.firestore.FieldValue.serverTimestamp(),
      customerUid:     currentUser ? currentUser.uid : null
    };
    try {
      const docRef = await firebase.firestore().collection("orders").add(orderData);
      if (appliedCoupon) {
        firestore.collection('coupons').doc(appliedCoupon.id).set({
          usedCount: firebase.firestore.FieldValue.increment(1)
        }, { merge: true }).catch(e => console.error("Coupon update error:", e));
      }

      // ✅ লয়ালটি পয়েন্ট রিডিম হলে কাটো
      if (currentUser && totals.pointsUsed > 0) {
        userLoyaltyPoints = Math.max(0, userLoyaltyPoints - totals.pointsUsed);
        firestore.collection('users').doc(currentUser.uid).set({
          loyaltyPoints: firebase.firestore.FieldValue.increment(-totals.pointsUsed)
        }, { merge: true }).catch(e => console.error("Points deduct error:", e));
      }

      // ✅ রেফারেল বোনাস চেক করো
      checkAndApplyReferralBonus();

      // ✅ Push Notification
      notifyOrderSuccess(docRef.id);
      notifyAdminNewOrder(customerName, totals.total + deliveryCharge, docRef.id);

      showOrderSuccessModal(docRef.id, totals.total + deliveryCharge);
      cart = []; saveCart();
      appliedCoupon = null;
      loyaltyRedeemActive = false;
      // [FIX #3] window._deliveryCharge = 0; ← অপ্রয়োজনীয় লাইন সরানো হয়েছে (calculateDeliveryCharge() ব্যবহার হচ্ছে)
      document.getElementById('coupon-applied-info')?.classList.add('hidden');
      const couponInput = document.getElementById('coupon-code-input');
      if (couponInput) couponInput.disabled = false;
      const loyaltyCheckbox = document.getElementById('loyalty-redeem-checkbox');
      if (loyaltyCheckbox) loyaltyCheckbox.checked = false;
      updateCartUi(); closeCart();
    } catch (error) {
      console.error("Firestore Error:", error);
      alert(`❌ অর্ডার সেভ হয়নি!\nকারণ: ${error.message}\nইন্টারনেট ও Firebase Rules চেক করুন।`);
    } finally {
      if (orderBtn) { orderBtn.disabled = false; orderBtn.innerHTML = `অর্ডার কনফার্ম করুন`; }
    }
  }

  // ============================================================
  // ✅ রেফারেল বোনাস — প্রথম অর্ডারে রেফারার ও রেফারি দুজনেই পয়েন্ট পাবে
  // ============================================================
  async function checkAndApplyReferralBonus() {
    if (!currentUser) return;
    const pendingRefCode = localStorage.getItem('pending_referral_code');
    if (!pendingRefCode) return;
    if (pendingRefCode === userReferralCode) { localStorage.removeItem('pending_referral_code'); return; } // নিজেকে রেফার করা যাবে না

    try {
      const userRef = firestore.collection('users').doc(currentUser.uid);
      const userDoc = await userRef.get();
      if (userDoc.exists && userDoc.data().referralBonusGiven) {
        localStorage.removeItem('pending_referral_code');
        return; // ইতিমধ্যে বোনাস দেওয়া হয়েছে
      }

      // রেফারার খুঁজো
      const referrerSnap = await firestore.collection('users').where('referralCode', '==', pendingRefCode).limit(1).get();
      if (referrerSnap.empty) { localStorage.removeItem('pending_referral_code'); return; }

      const referrerDoc = referrerSnap.docs[0];
      const REFERRAL_BONUS = 50;

      // রেফারিকে বোনাস দাও
      await userRef.set({
        loyaltyPoints: firebase.firestore.FieldValue.increment(REFERRAL_BONUS),
        referredBy: referrerDoc.id,
        referralBonusGiven: true
      }, { merge: true });
      userLoyaltyPoints += REFERRAL_BONUS;

      // রেফারারকে বোনাস ও কাউন্ট বাড়াও
      await firestore.collection('users').doc(referrerDoc.id).set({
        loyaltyPoints: firebase.firestore.FieldValue.increment(REFERRAL_BONUS),
        referralCount: firebase.firestore.FieldValue.increment(1)
      }, { merge: true });

      localStorage.removeItem('pending_referral_code');
      updateLoyaltyAndReferralUI();
      alert(`🎉 রেফারেল বোনাস পেয়েছেন! +${REFERRAL_BONUS} পয়েন্ট যুক্ত হয়েছে।`);
    } catch (e) {
      console.error("Referral bonus error:", e);
    }
  }



  function showOrderSuccessModal(orderId, totalAmount) {
    const old = document.getElementById('order-success-modal');
    if (old) old.remove();
    const modal = document.createElement('div');
    modal.id = 'order-success-modal';
    modal.className = 'fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-[60] flex items-center justify-center p-4';
    modal.innerHTML = `
      <div class="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl text-center space-y-4 border border-slate-100">
        <div class="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
          <i class="fas fa-check-circle text-emerald-500 text-3xl"></i>
        </div>
        <h3 class="text-lg font-black text-slate-800">অর্ডার সফল হয়েছে! 🎉</h3>
        <p class="text-xs text-slate-500">আপনার অর্ডারটি <span class="font-bold text-orange-600">পারভেজ স্টোরে</span> জমা হয়েছে।</p>
        <div class="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2 text-left">
          <div class="flex justify-between text-xs"><span class="text-slate-500 font-medium">অর্ডার ID:</span><span class="font-black text-slate-800 text-[11px] select-all">${orderId}</span></div>
          <div class="flex justify-between text-xs"><span class="text-slate-500 font-medium">মোট মূল্য:</span><span class="font-black text-orange-600">৳${totalAmount}</span></div>
          <div class="flex justify-between text-xs"><span class="text-slate-500 font-medium">স্ট্যাটাস:</span><span class="font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">পেন্ডিং 🕐</span></div>
        </div>
        <p class="text-[10px] text-slate-400 font-medium"><i class="fas fa-info-circle text-blue-400 mr-1"></i>এই অর্ডার ID সেভ করুন। পরে প্রোফাইল → ট্র্যাকিং-এ স্ট্যাটাস দেখতে পাবেন।</p>
        <button onclick="document.getElementById('order-success-modal').remove()" class="w-full bg-slate-900 text-white font-bold text-sm py-3 rounded-2xl hover:bg-orange-600 transition active:scale-95">ঠিক আছে, ধন্যবাদ!</button>
      </div>`;
    document.body.appendChild(modal);
  }

  function autoFillCheckoutForm() {
    if (currentUser) {
      if (document.getElementById('customer-name')) document.getElementById('customer-name').value = currentUser.displayName || '';
    } else {
      const savedData = safeJSONParse(localStorage.getItem('user_profile_data'), null);
      if (savedData) {
        if (document.getElementById('customer-name')) document.getElementById('customer-name').value = savedData.name || '';
        if (document.getElementById('customer-phone')) document.getElementById('customer-phone').value = savedData.phone || '';
        if (document.getElementById('customer-address')) document.getElementById('customer-address').value = savedData.address || '';
      }
    }
  }

  // ============================================================
  // ✅ [FIX #1] সেলারের আয়ের হিসাব — Firestore থেকে
  // ============================================================
  async function loadSellerEarnings() {
    if (!currentUser || currentUserRole !== 'seller') return;
    const earnEl = document.getElementById('seller-total-earnings');
    const soldEl = document.getElementById('seller-total-sold');
    if (!earnEl) return;
    try {
      const isAdmin = ADMIN_EMAILS.includes(currentUser.email);
      let query = firebase.firestore().collection("orders");
      if (!isAdmin) query = query.where("sellerUid", "==", currentUser.uid);
      const snap = await query.get();
      let totalEarnings = 0, totalSold = 0;
      snap.forEach(doc => {
        const d = doc.data();
        if (d.status === 'ডেলিভারড ✅') {
          totalEarnings += d.totalAmount || 0;
          totalSold += (d.items || []).reduce((a, i) => a + i.quantity, 0);
        }
      });
      if (earnEl) earnEl.innerText = '৳' + totalEarnings.toLocaleString('bn-BD');
      if (soldEl) soldEl.innerText = totalSold + ' টি';
    } catch(e) { console.error("Earnings error:", e); }
  }

  function togglePaymentFields() {
    const method = document.getElementById('payment-method')?.value;
    ['bkash-fields','nagad-fields','rocket-fields','qr-fields','emi-fields','cod-fields'].forEach(id => {
      document.getElementById(id)?.classList.add('hidden');
    });
    const fieldMap = { bkash:'bkash-fields', nagad:'nagad-fields', rocket:'rocket-fields', qr:'qr-fields', emi:'emi-fields', cod:'cod-fields' };
    document.getElementById(fieldMap[method] || 'cod-fields')?.classList.remove('hidden');
    if (method === 'qr') populateQrPayment();
    if (method === 'emi') populateEmiOptions();
    calculateDeliveryCharge();
  }

  // ✅ QR কোড ইমেজ বসাও
  function populateQrPayment() {
    const img = document.getElementById('qr-payment-image');
    if (img && PAYMENT_CONFIG.qr) img.src = PAYMENT_CONFIG.qr.imageUrl;
  }

  // ✅ EMI প্রোভাইডার লিস্ট ও মিনিমাম অ্যামাউন্ট চেক
  function populateEmiOptions() {
    const select = document.getElementById('emi-provider');
    const msgEl  = document.getElementById('emi-min-amount-msg');
    if (!select || !PAYMENT_CONFIG.emi) return;
    select.innerHTML = PAYMENT_CONFIG.emi.providers.map(p =>
      `<option value="${p.name}">${p.name} — ${p.tenor}</option>`
    ).join('');
    const totals = calculateOrderTotals();
    const minAmt = PAYMENT_CONFIG.emi.minOrderAmount;
    if (msgEl) {
      msgEl.innerHTML = totals.subtotal >= minAmt
        ? `<i class="fas fa-check-circle mr-1"></i>আপনার অর্ডার EMI-এর জন্য উপযুক্ত!`
        : `<i class="fas fa-info-circle mr-1"></i>৳${minAmt.toLocaleString('bn-BD')} টাকার বেশি অর্ডারে কিস্তি সুবিধা প্রযোজ্য (বর্তমান: ৳${Math.round(totals.subtotal).toLocaleString('bn-BD')})`;
    }
  }

  // ============================================================
  // ✅ ফিল্টার ও সার্চ
  // ============================================================
  function filterCategory(categoryName) {
    closeSideMenu();
    const titleElement = document.getElementById('grid-title');
    const clearBtn = document.getElementById('clear-filter-btn');
    document.getElementById('image-search-feedback-bar').classList.add('hidden');
    const categoryTitles = {
      // পুরুষ
      'punjabi': 'পাঞ্জাবি ও কুর্তা কালেকশন', 'tshirt': 'টি-শার্ট ও শার্ট কালেকশন',
      'pants': 'প্যান্ট ও জিন্স কালেকশন', 'traditional': 'লুঙ্গি ও ধুতি কালেকশন',
      'jacket': 'জ্যাকেট ও হুডি কালেকশন',
      // মহিলা
      'womens': 'থ্রি-পিস ও সালোয়ার কালেকশন', 'saree': 'শাড়ি কালেকশন',
      'tops': 'টপস ও কুর্তি কালেকশন', 'burkha': 'বোরখা ও হিজাব কালেকশন',
      // শিশু
      'kids_dress': 'বাচ্চাদের পোশাক কালেকশন', 'toys': 'খেলনা ও গেমস কালেকশন', 'baby': 'বেবি কেয়ার কালেকশন',
      // জুতো ও এক্সেসরিজ
      'shoe': 'জুতো ও স্যান্ডেল কালেকশন', 'watch': 'ঘড়ি কালেকশন',
      'bags': 'ব্যাগ ও ওয়ালেট কালেকশন', 'sunglasses': 'সানগ্লাস ও জুয়েলারি', 'cap': 'ক্যাপ ও হ্যাট কালেকশন',
      // ইলেকট্রনিক্স
      'electronics': 'মোবাইল ও ট্যাবলেট কালেকশন', 'earphone': 'ইয়ারফোন ও স্পিকার',
      'charger': 'চার্জার ও ক্যাবল', 'camera': 'ক্যামেরা ও অ্যাকসেসরি', 'computer': 'ল্যাপটপ ও কম্পিউটার',
      // বিউটি
      'cosmetics': 'মেকআপ ও স্কিনকেয়ার কালেকশন', 'haircare': 'হেয়ারকেয়ার প্রোডাক্ট',
      'perfume': 'পারফিউম ও আতর কালেকশন', 'health': 'হেলথ ও ফিটনেস',
      // হোম
      'home': 'হোম ডেকোর কালেকশন', 'kitchen': 'রান্নাঘরের সরঞ্জাম', 'bedding': 'বেডশিট ও বালিশ', 'lighting': 'লাইটিং ও পর্দা',
      // খাদ্য
      'food': 'শুকনো খাবার ও মশলা', 'organic': 'অর্গানিক পণ্য', 'agri': 'কৃষি সরঞ্জাম',
      // বই
      'books': 'বই ও নোটবুক কালেকশন', 'stationery': 'স্টেশনারি ও অফিস সাপ্লাই',
      // স্পোর্টস
      'sports': 'স্পোর্টস সরঞ্জাম কালেকশন', 'outdoor': 'আউটডোর ও ট্র্যাভেল',
      // বিশেষ
      'offers': '🔥 আজকের অফার জোন',
      // হাতের তৈরি ও প্রক্রিয়াজাত
      'handmade': '🤝 হাতের তৈরি পণ্য কালেকশন',
      'handmade_bamboo': '🎋 বাঁশের তৈরি পণ্য', 'handmade_beet': '🪑 বেতের তৈরি পণ্য', 'handmade_wood': '🪵 কাঠের তৈরি পণ্য',
      // মাংস
      'meat': '🍖 মাংস প্রক্রিয়াজাত পণ্য কালেকশন',
      'meat_beef': '🐄 গরুর মাংস', 'meat_mutton': '🐐 খাসির মাংস', 'meat_chicken': '🐔 মুরগির মাংস',
      'meat_duck': '🦆 হাঁসের মাংস', 'meat_pigeon': '🕊️ কবুতরের মাংস', 'meat_rabbit': '🐇 খরগোশের মাংস',
      'meat_venison': '🦌 হরিণের মাংস', 'meat_camel': '🐪 উটের মাংস',
      // মৎস
      'fish': '🐟 মৎস প্রক্রিয়াজাত পণ্য কালেকশন',
      'fish_ilish': '🐠 ইলিশ মাছ', 'fish_rui': '🐟 রুই মাছ', 'fish_catla': '🐡 কাতলা মাছ',
      'fish_pangash': '🐟 পাঙাশ মাছ', 'fish_tilapia': '🐟 তেলাপিয়া মাছ', 'fish_shrimp': '🦐 চিংড়ি মাছ',
      'fish_hilsa_dry': '🐠 শুঁটকি মাছ', 'fish_crab': '🦀 কাঁকড়া', 'fish_sea': '🌊 সামুদ্রিক মাছ',
      // ফল
      'fruit': '🍎 ফল জাত পণ্য কালেকশন',
      'fruit_mango': '🥭 আম', 'fruit_jackfruit': '🍈 কাঁঠাল', 'fruit_banana': '🍌 কলা',
      'fruit_guava': '🍐 পেয়ারা', 'fruit_litchi': '🍒 লিচু', 'fruit_papaya': '🍈 পেঁপে',
      'fruit_watermelon': '🍉 তরমুজ', 'fruit_coconut': '🥥 নারকেল', 'fruit_date': '🌴 খেজুর', 'fruit_berry': '🫐 বরই / কুল',
      // ফুল
      'flower': '🌸 ফুল জাত পণ্য কালেকশন',
      'flower_rose': '🌹 গোলাপ ফুল', 'flower_marigold': '🌼 গাঁদা ফুল', 'flower_jasmine': '🌺 বেলি / জুঁই ফুল',
      'flower_lotus': '🪷 পদ্ম ফুল', 'flower_sunflower': '🌻 সূর্যমুখী ফুল', 'flower_tuberose': '🌷 রজনীগন্ধা ফুল',
      'flower_orchid': '🌸 অর্কিড ফুল', 'flower_dried': '🍂 শুকনো ফুল',
      // ভেষজ
      'herbal': '🌿 ভেষজ জাত পণ্য কালেকশন',
      'herbal_neem': '🌿 নিম', 'herbal_turmeric': '🟡 হলুদ', 'herbal_ginger': '🫚 আদা',
      'herbal_garlic': '🧄 রসুন', 'herbal_tulsi': '🌱 তুলসী', 'herbal_aloe': '🪴 অ্যালোভেরা',
      'herbal_ashwagandha': '🌿 অশ্বগন্ধা', 'herbal_black_seed': '🖤 কালোজিরা', 'herbal_mint': '🌿 পুদিনা',
      'herbal_moringa': '🌳 সজনে / মরিঙ্গা', 'herbal_honey': '🍯 মধু',
      'tree': '🌳 বৃক্ষ কালেকশন'
    };
    let filtered = products;
    if (categoryName !== 'all') {
      filtered = products.filter(p => p.category === categoryName);
      if (clearBtn) clearBtn.classList.remove('hidden');
      if (titleElement) titleElement.innerText = categoryTitles[categoryName] || categoryName;
    } else {
      if (clearBtn) clearBtn.classList.add('hidden');
      if (titleElement) titleElement.innerText = "আপনার জন্য বাছাইকৃত পণ্য";
      const searchInput = document.getElementById('search-input-field');
      if (searchInput) searchInput.value = "";
    }
    currentFilterState.category = categoryName;
    if (categoryName === 'all') currentFilterState.searchQuery = '';
    applyFiltersAndRender();
  }

  function selectProductSize(productId, size, element) {
    selectedSizesState[productId] = size;
    const buttons = document.querySelectorAll(`.size-btn-node-${productId}`);
    buttons.forEach(btn => {
      btn.classList.remove('border-orange-500', 'bg-orange-50', 'text-orange-600');
      btn.classList.add('border-slate-200', 'bg-white', 'text-slate-600');
    });
    element.classList.remove('border-slate-200', 'bg-white', 'text-slate-600');
    element.classList.add('border-orange-500', 'bg-orange-50', 'text-orange-600');
  }

  // ✅ NEW: প্রোডাক্ট কার্ডে +/− বাটন দিয়ে কার্টে যোগ করার আগে quantity বাড়ানো/কমানো
  function changeProductQty(productId, delta) {
    const product = products.find(p => p.id == productId);
    if (!product) return;
    const current = selectedQtyState[productId] || 1;
    let next = current + delta;
    if (next < 1) next = 1;
    const maxQty = product.stock > 0 ? product.stock : 1;
    if (next > maxQty) next = maxQty;
    selectedQtyState[productId] = next;
    const display = document.getElementById(`qty-display-${productId}`);
    if (display) display.innerText = next;
  }

  // ✅ NEW (feature-19): Color variant selector
  const selectedColorsState = {};
  function selectProductColor(productId, color, element) {
    selectedColorsState[productId] = color;
    document.querySelectorAll(`.color-btn-node-${productId}`).forEach(btn => {
      btn.classList.remove('ring-2', 'ring-orange-500', 'ring-offset-1', 'scale-110');
    });
    element.classList.add('ring-2', 'ring-orange-500', 'ring-offset-1', 'scale-110');
  }

  // Color chip preview in seller form
  function previewColorChips(val) {
    const el = document.getElementById('color-chips-preview');
    if (!el) return;
    const colors = val.split(',').map(s => s.trim()).filter(s => s);
    if (!colors.length) { el.innerHTML = ''; return; }
    el.innerHTML = colors.map(c =>
      `<span class='inline-flex items-center gap-1 text-[10px] font-bold bg-white border border-slate-200 px-2 py-1 rounded-full shadow-sm'>
        <span class='w-3 h-3 rounded-full border border-slate-200 inline-block' style='background:${_colorNameToHex(c)}'></span>
        ${escapeHtml(c)}
      </span>`
    ).join('');
  }

  function _colorNameToHex(name) {
    const map = { লাল:'#ef4444', নীল:'#3b82f6', সবুজ:'#22c55e', হলুদ:'#eab308', সাদা:'#f8fafc', কালো:'#1e293b', গোলাপী:'#f472b6', বেগুনী:'#a855f7', কমলা:'#f97316', ধূসর:'#94a3b8', বাদামী:'#92400e', আকাশী:'#38bdf8', red:'#ef4444', blue:'#3b82f6', green:'#22c55e', yellow:'#eab308', white:'#f8fafc', black:'#1e293b', pink:'#f472b6', purple:'#a855f7', orange:'#f97316', gray:'#94a3b8', brown:'#92400e', sky:'#38bdf8' };
    return map[name.toLowerCase()] || '#cbd5e1';
  }

  // Build color chips HTML for product card/detail
  function _buildColorChips(productId, colors) {
    if (!colors || !colors.length) return '';
    return `<div class='flex flex-wrap gap-1.5 mt-1.5'>` +
      colors.map(c =>
        `<button type='button' onclick="selectProductColor('${productId}','${c}',this)" class='color-btn-node-${productId} w-6 h-6 rounded-full border-2 border-white shadow transition-transform' style='background:${_colorNameToHex(c)}' title='${escapeHtml(c)}'></button>`
      ).join('') +
      `</div>`;
  }

  function handleTextSearch(query) {
    currentFilterState.searchQuery = query.toLowerCase().trim();
    applyFiltersAndRender();
    // ✅ [NEW feature-65] খালি বক্সে সার্চ হিস্টরি, টাইপ করলে লাইভ প্রোডাক্ট সাজেশন
    clearTimeout(window._searchSuggestTimer);
    window._searchSuggestTimer = setTimeout(() => renderSearchSuggestions(currentFilterState.searchQuery), 120);
    // ✅ Search History — টাইপ থামার পর সেভ করো
    clearTimeout(window._searchHistorySaveTimer);
    if (currentFilterState.searchQuery.length >= 2) {
      window._searchHistorySaveTimer = setTimeout(() => saveSearchHistory(currentFilterState.searchQuery), 1200);
    }
  }

  // ============================================================
  // ✅ [NEW feature-65] সার্চ অটোকমপ্লিট / সাজেশন
  // ============================================================
  const SEARCH_SUGGESTION_MAX = 6;

  // escapeHtml করার পর, escape করা query দিয়ে ম্যাচ হওয়া অংশটুকু বোল্ড করে
  function _highlightSearchMatch(escapedName, rawQuery) {
    const q = escapeHtml(rawQuery).trim();
    if (!q) return escapedName;
    const idx = escapedName.toLowerCase().indexOf(q.toLowerCase());
    if (idx === -1) return escapedName;
    return escapedName.slice(0, idx)
      + '<b class="text-orange-600">' + escapedName.slice(idx, idx + q.length) + '</b>'
      + escapedName.slice(idx + q.length);
  }

  function renderSearchSuggestions(query) {
    const dropdown = document.getElementById('search-history-dropdown');
    const listEl   = document.getElementById('search-history-list');
    const titleEl  = document.getElementById('search-history-title');
    const clearBtn = document.getElementById('search-history-clear-btn');
    if (!dropdown || !listEl) return;

    const q = (query || '').trim();
    if (q.length === 0) { showSearchHistory(); return; } // খালি হলে পুরনো হিস্টরি দেখাও

    const matches = (products || [])
      .filter(p => p.name && p.name.toLowerCase().includes(q))
      .slice(0, SEARCH_SUGGESTION_MAX);

    if (matches.length === 0) { dropdown.classList.add('hidden'); return; }

    if (titleEl) titleEl.innerText = 'সাজেশন';
    if (clearBtn) clearBtn.classList.add('hidden');

    listEl.innerHTML = matches.map(p => `
      <button type="button" onclick="selectSearchSuggestion('${p.id}', '${escapeHtml(p.name).replace(/'/g, "\\'")}')" class="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-slate-50 transition text-left">
        <img loading="lazy" src="${escapeHtml(p.image) || 'https://placehold.co/32x32/f1f5f9/94a3b8?text=?'}" class="w-8 h-8 rounded-lg object-cover shrink-0 border border-slate-100" onerror="this.src='https://placehold.co/32x32/f1f5f9/94a3b8?text=?'">
        <span class="text-xs text-slate-700 font-medium flex-1 truncate">${_highlightSearchMatch(escapeHtml(p.name), q)}</span>
        <span class="text-[10px] font-bold text-orange-600 shrink-0">৳${p.price}</span>
      </button>
    `).join('');
    dropdown.classList.remove('hidden');
  }

  function selectSearchSuggestion(productId, name) {
    const input = document.getElementById('search-input-field');
    if (input) input.value = name;
    currentFilterState.searchQuery = name.toLowerCase().trim();
    applyFiltersAndRender();
    saveSearchHistory(currentFilterState.searchQuery);
    document.getElementById('search-history-dropdown')?.classList.add('hidden');
    // সাজেশন থেকে নির্দিষ্ট পণ্য বাছাই করলে সরাসরি ডিটেইল পেজ খুলে যাবে
    openProductDetail(productId);
  }

  // ============================================================
  // ✅ SEARCH HISTORY — আগের সার্চ লোকালস্টোরেজে সেভ ও দেখানো
  // ============================================================
  const SEARCH_HISTORY_KEY = 'BD BiG BAZZAR_store_search_history';
  const SEARCH_HISTORY_MAX = 8;

  function getSearchHistory() {
    try { return JSON.parse(localStorage.getItem(SEARCH_HISTORY_KEY)) || []; }
    catch (e) { return []; }
  }

  function saveSearchHistory(query) {
    if (!query || query.length < 2) return;
    let history = getSearchHistory().filter(q => q !== query);
    history.unshift(query);
    history = history.slice(0, SEARCH_HISTORY_MAX);
    localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(history));
  }

  function showSearchHistory() {
    const dropdown = document.getElementById('search-history-dropdown');
    const listEl   = document.getElementById('search-history-list');
    const titleEl  = document.getElementById('search-history-title');
    const clearBtn = document.getElementById('search-history-clear-btn');
    if (!dropdown || !listEl) return;
    if (titleEl) titleEl.innerText = 'সাম্প্রতিক সার্চ';
    if (clearBtn) clearBtn.classList.remove('hidden');
    const history = getSearchHistory();
    const inputVal = document.getElementById('search-input-field')?.value || '';
    // ইনপুটে টেক্সট থাকলে (ফোকাস হওয়ার সময়) সাজেশন দেখাও, হিস্টরি না
    if (inputVal.trim().length > 0) { renderSearchSuggestions(inputVal.toLowerCase().trim()); return; }
    if (history.length === 0) { dropdown.classList.add('hidden'); return; }
    listEl.innerHTML = history.map(q => `
      <button type="button" onclick="rerunSearchFromHistory('${q.replace(/'/g, "\\'")}')" class="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-slate-50 transition text-left">
        <i class="fas fa-clock-rotate-left text-slate-300 text-[10px]"></i>
        <span class="text-xs text-slate-700 font-medium flex-1 truncate">${q}</span>
        <i class="fas fa-arrow-up-right-from-square text-slate-300 text-[9px]"></i>
      </button>
    `).join('');
    dropdown.classList.remove('hidden');
  }

  function rerunSearchFromHistory(query) {
    const input = document.getElementById('search-input-field');
    if (input) input.value = query;
    currentFilterState.searchQuery = query.toLowerCase().trim();
    applyFiltersAndRender();
    saveSearchHistory(query);
    document.getElementById('search-history-dropdown')?.classList.add('hidden');
  }

  function clearSearchHistory(evt) {
    if (evt) evt.stopPropagation();
    localStorage.removeItem(SEARCH_HISTORY_KEY);
    document.getElementById('search-history-dropdown')?.classList.add('hidden');
  }

  // বাইরে ক্লিক করলে হিস্টরি ড্রপডাউন বন্ধ করো
  document.addEventListener('click', (e) => {
    const dropdown = document.getElementById('search-history-dropdown');
    const input    = document.getElementById('search-input-field');
    if (!dropdown || dropdown.classList.contains('hidden')) return;
    if (!dropdown.contains(e.target) && e.target !== input) dropdown.classList.add('hidden');
  });

  // ============================================================
  // ✅ VOICE SEARCH — Web Speech API দিয়ে মাইক সার্চ
  // ============================================================
  function startVoiceSearch() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      showCartToast?.('আপনার ব্রাউজার ভয়েস সার্চ সাপোর্ট করে না', 'error');
      return;
    }
    const icon = document.getElementById('voice-search-icon');
    const input = document.getElementById('search-input-field');
    const recognition = new SpeechRecognition();
    recognition.lang = currentLang === 'en' ? 'en-US' : 'bn-BD';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      icon?.classList.remove('fa-microphone');
      icon?.classList.add('fa-microphone-lines', 'text-red-500', 'animate-pulse');
    };
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      if (input) input.value = transcript;
      handleTextSearch(transcript);
      saveSearchHistory(transcript.toLowerCase().trim());
    };
    recognition.onerror = () => {
      showCartToast?.('ভয়েস সার্চ শুনতে সমস্যা হয়েছে, আবার চেষ্টা করুন', 'error');
    };
    recognition.onend = () => {
      icon?.classList.add('fa-microphone');
      icon?.classList.remove('fa-microphone-lines', 'text-red-500', 'animate-pulse');
    };
    try { recognition.start(); } catch (e) { console.error('Voice search error:', e); }
  }

  // ============================================================
  // ✅ [FIX #4 - v2] Image Search — Firebase Cloud Function দিয়ে Gemini কল
  // (API key এখন সম্পূর্ণ সার্ভার-সাইডে, ব্রাউজারে কখনো আসে না)
  // ============================================================
  const classifyProductImage = firebase.app().functions('asia-southeast1').httpsCallable('classifyProductImage');

  async function triggerVisualImageSearch(input) {
    if (!input.files || !input.files[0]) return;
    const file = input.files[0];
    await processVisualSearchFile(file);
    // ✅ দুটো input-ই reset করো যাতে একই ছবি আবার সিলেক্ট করা যায়
    input.value = "";
    const camInput = document.getElementById('header-image-search-camera');
    const galInput = document.getElementById('header-image-search-gallery');
    if (camInput) camInput.value = "";
    if (galInput) galInput.value = "";
  }

  // ✅ এই ফাংশনটা ফাইল-অবজেক্ট সরাসরি নেয় — তাই native <input capture> ছাড়াও
  // in-page camera (getUserMedia) থেকে পাওয়া ছবি দিয়েও কল করা যায়
  async function processVisualSearchFile(file) {
    if (!file) return;
    if (window._visualSearchProcessing) return; // ✅ duplicate প্রসেস আটকানো
    window._visualSearchProcessing = true;
    const feedbackBar = document.getElementById('image-search-feedback-bar');
    const gridTitle = document.getElementById('grid-title');
    const clearBtn = document.getElementById('clear-filter-btn');

    if (!feedbackBar) {
      // ✅ এই element না পেলে পুরো ফাংশন আটকে যাওয়ার বদলে অন্তত alert দিয়ে জানাও
      console.error('image-search-feedback-bar element not found in DOM');
      window._visualSearchProcessing = false;
      alert('ছবি সার্চ লোড করা যায়নি (UI element পাওয়া যায়নি) — পেজ রিফ্রেশ করে আবার চেষ্টা করুন');
      return;
    }

    // লোডিং স্টেট দেখাও
    feedbackBar.classList.remove('hidden');
    feedbackBar.innerHTML = `<span class='flex items-center gap-2'><i class='fas fa-spinner fa-spin text-orange-600'></i> AI দিয়ে ছবি বিশ্লেষণ করা হচ্ছে...</span>`;
    if (clearBtn) clearBtn.classList.remove('hidden');
    if (gridTitle) gridTitle.innerText = "ছবি অনুযায়ী পণ্য খোঁজা হচ্ছে...";

    try {
      // ছবি base64-এ রূপান্তর করো
      const base64Image = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = e => resolve(e.target.result.split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      // ✅ Firebase Cloud Function দিয়ে Gemini Flash কল (key সার্ভারে সুরক্ষিত)
      const mimeType = file.type && file.type.startsWith('image/') ? file.type : 'image/jpeg';
      const result = await classifyProductImage({ base64Image, mimeType });

      let keyword = (result.data?.keyword || "").trim().toLowerCase().replace(/[^a-z_]/g, '');

      const validCategories = ["punjabi","tshirt","pants","jacket","traditional","womens","saree","tops","burkha","kids_dress","toys","baby","shoe","watch","bags","sunglasses","cap","electronics","earphone","charger","camera","computer","cosmetics","haircare","perfume","health","home","kitchen","bedding","lighting","food","organic","agri","books","stationery","sports","outdoor","handmade","handmade_bamboo","handmade_beet","handmade_wood","fish","fish_ilish","fish_rui","fish_catla","fish_pangash","fish_tilapia","fish_shrimp","fish_hilsa_dry","fish_crab","fish_sea","meat","meat_beef","meat_mutton","meat_chicken","meat_duck","meat_pigeon","meat_rabbit","meat_venison","meat_camel","fruit","fruit_mango","fruit_jackfruit","fruit_banana","fruit_guava","fruit_litchi","fruit_papaya","fruit_watermelon","fruit_coconut","fruit_date","fruit_berry","flower","flower_rose","flower_marigold","flower_jasmine","flower_lotus","flower_sunflower","flower_tuberose","flower_orchid","flower_dried","herbal","herbal_neem","herbal_turmeric","herbal_ginger","herbal_garlic","herbal_tulsi","herbal_aloe","herbal_ashwagandha","herbal_black_seed","herbal_mint","herbal_moringa","herbal_honey","tree"];
      if (!validCategories.includes(keyword)) {
        // AI যদি চিনতে না পারে, সব পণ্য দেখাও
        keyword = "all";
      }

      const matchedProducts = keyword === "all" ? products : products.filter(p => p.category === keyword);
      renderProducts(matchedProducts);

      const categoryNames = {
        "punjabi":"পাঞ্জাবি","tshirt":"টি-শার্ট","pants":"প্যান্ট","jacket":"জ্যাকেট",
        "traditional":"লুঙ্গি","womens":"থ্রি-পিস","saree":"শাড়ি","tops":"টপস","burkha":"বোরখা",
        "kids_dress":"বাচ্চাদের পোশাক","toys":"খেলনা","baby":"বেবি কেয়ার",
        "shoe":"জুতো","watch":"ঘড়ি","bags":"ব্যাগ","sunglasses":"সানগ্লাস","cap":"ক্যাপ",
        "electronics":"মোবাইল","earphone":"ইয়ারফোন","charger":"চার্জার","camera":"ক্যামেরা","computer":"ল্যাপটপ",
        "cosmetics":"মেকআপ","haircare":"হেয়ারকেয়ার","perfume":"পারফিউম","health":"হেলথ",
        "home":"হোম ডেকোর","kitchen":"কিচেন","bedding":"বেডশিট","lighting":"লাইটিং",
        "food":"খাবার","organic":"অর্গানিক","agri":"কৃষি",
        "books":"বই","stationery":"স্টেশনারি",
        "sports":"স্পোর্টস","outdoor":"আউটডোর","all":"সব পণ্য",
        "handmade":"হাতের তৈরি পণ্য","fish":"মৎস প্রক্রিয়াজাত","meat":"মাংস প্রক্রিয়াজাত",
        "fruit":"ফল জাত পণ্য","herbal":"ভেষজ জাত পণ্য","flower":"ফুল জাত পণ্য","tree":"বৃক্ষ"
      };
      feedbackBar.innerHTML = `
        <span class='flex items-center gap-2'><i class='fas fa-image text-orange-600'></i> AI সনাক্ত করেছে: <strong>${categoryNames[keyword] || keyword}</strong> — ${matchedProducts.length} টি পণ্য পাওয়া গেছে</span>
        <button onclick='clearVisualImageSearchFilter()' class='text-[10px] bg-orange-600 text-white px-2 py-1 rounded-md shadow-sm font-bold'>রিমুভ</button>`;
      if (gridTitle) gridTitle.innerText = `AI ইমেজ সার্চ: ${categoryNames[keyword] || keyword}`;

    } catch (error) {
      console.error("AI Image Search error:", error);
      // ফলব্যাক: ফাইল নাম দিয়ে চেষ্টা করো
      const fileNameLower = (file.name || "").toLowerCase();
      let searchedKeyword = "all";
      if (fileNameLower.includes("punjabi") || fileNameLower.includes("shirt")) searchedKeyword = "punjabi";
      else if (fileNameLower.includes("shoe") || fileNameLower.includes("boot")) searchedKeyword = "shoe";
      else if (fileNameLower.includes("watch") || fileNameLower.includes("clock")) searchedKeyword = "watch";

      const matchedProducts = searchedKeyword === "all" ? products : products.filter(p => p.category === searchedKeyword);
      renderProducts(matchedProducts);
      feedbackBar.innerHTML = `
        <span class='flex items-center gap-2'><i class='fas fa-image text-orange-600'></i> ছবি অনুযায়ী ফলাফল দেখানো হচ্ছে</span>
        <button onclick='clearVisualImageSearchFilter()' class='text-[10px] bg-orange-600 text-white px-2 py-1 rounded-md shadow-sm font-bold'>রিমুভ</button>`;
    }

    window._visualSearchProcessing = false; // ✅ guard রিলিজ করো
  }

  function clearVisualImageSearchFilter() {
    document.getElementById('image-search-feedback-bar').classList.add('hidden');
    filterCategory('all');
  }

  // ============================================================
  // ✅ [FIX #5] In-page Camera — native Camera অ্যাপ না খুলে, পেজের ভিতরেই
  // getUserMedia দিয়ে লাইভ ক্যামেরা দেখিয়ে ছবি তোলা।
  // কারণ: native capture='environment' input ক্যামেরা অ্যাপ খুললে Chrome
  // ব্যাকগ্রাউন্ডে চলে যায়, এই ডিভাইসে তখন Android Chrome-কে kill করে দিচ্ছে
  // (ফিরে এসে সাদা/blank পেজ) — getUserMedia ব্যবহার করলে Chrome কখনো
  // ব্যাকগ্রাউন্ডে যায় না, তাই এই ক্র্যাশ হওয়ার কোনো সুযোগই থাকে না।
  // ============================================================
  let _inPageCameraStream = null;

  async function openInPageCamera() {
    window._lastImageSearchAttempt = Date.now(); // ✅ যাতে এই ফ্লো-তেও error banner কাজ করে
    closeImageSearchSheet();
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      // পুরোনো ব্রাউজার যেখানে getUserMedia নেই — পুরোনো native capture input-এ ফলব্যাক
      const camInput = document.getElementById('header-image-search-camera');
      if (camInput) camInput.click();
      return;
    }
    const modal = document.getElementById('inpage-camera-modal');
    const video = document.getElementById('inpage-camera-video');
    try {
      _inPageCameraStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 1280 } },
        audio: false
      });
      video.srcObject = _inPageCameraStream;
      modal.classList.remove('hidden');
      document.body.style.overflow = 'hidden';
    } catch (err) {
      console.error('In-page camera error:', err);
      // পারমিশন না দিলে বা ক্যামেরা না পাওয়া গেলে — পুরোনো native capture input-এ ফলব্যাক
      const camInput = document.getElementById('header-image-search-camera');
      if (camInput) camInput.click();
    }
  }

  function closeInPageCamera() {
    const modal = document.getElementById('inpage-camera-modal');
    modal.classList.add('hidden');
    document.body.style.overflow = 'auto';
    if (_inPageCameraStream) {
      _inPageCameraStream.getTracks().forEach(track => track.stop());
      _inPageCameraStream = null;
    }
  }

  function captureInPagePhoto() {
    window._lastImageSearchAttempt = Date.now();
    try {
      const video = document.getElementById('inpage-camera-video');
      const canvas = document.getElementById('inpage-camera-canvas');

      // ✅ ভিডিও এখনো প্রস্তুত না হলে (videoWidth/Height শূন্য) ক্যাপচার করো না, বরং জানিয়ে দাও
      if (!video.videoWidth || !video.videoHeight) {
        console.warn('Camera capture: video not ready yet', video.videoWidth, video.videoHeight);
        const feedbackBar = document.getElementById('image-search-feedback-bar');
        if (feedbackBar) {
          feedbackBar.classList.remove('hidden');
          feedbackBar.innerHTML = `<span class='flex items-center gap-2 text-amber-700'><i class='fas fa-triangle-exclamation'></i> ক্যামেরা এখনো প্রস্তুত হয়নি, আবার চেষ্টা করুন</span>`;
        }
        return;
      }

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(blob => {
        closeInPageCamera();
        if (blob) {
          const file = new File([blob], 'camera-capture.jpg', { type: 'image/jpeg' });
          processVisualSearchFile(file).catch(err => {
            console.error('processVisualSearchFile error:', err);
          });
        } else {
          console.error('Camera capture: toBlob returned null');
          const feedbackBar = document.getElementById('image-search-feedback-bar');
          if (feedbackBar) {
            feedbackBar.classList.remove('hidden');
            feedbackBar.innerHTML = `<span class='flex items-center gap-2 text-red-700'><i class='fas fa-bug'></i> ছবি ক্যাপচার করতে ব্যর্থ হয়েছে, আবার চেষ্টা করুন</span>`;
          }
        }
      }, 'image/jpeg', 0.85);
    } catch (err) {
      console.error('captureInPagePhoto error:', err);
      closeInPageCamera();
      const feedbackBar = document.getElementById('image-search-feedback-bar');
      if (feedbackBar) {
        feedbackBar.classList.remove('hidden');
        feedbackBar.innerHTML = `<span class='flex items-center gap-2 text-red-700'><i class='fas fa-bug'></i> Error: ${(err.message || 'unknown').toString().slice(0,120)}</span>`;
      }
    }
  }

  // ✅ [FIX] Android fallback — কিছু Android browser/WebView-এ ক্যামেরা থেকে ছবি তোলার পরে
  // ফিরে এসে 'change' event fire হয় না (input display:none থাকলে বেশি হয়, উপরে সেটাও fix করা হয়েছে)।
  // তাও নিশ্চিত করার জন্য window 'focus' হওয়ার পর input.files চেক করে ম্যানুয়ালি প্রসেস করা হচ্ছে —
  // এটা ব্যাকআপ মেকানিজম, normal change event ঠিকমতো fire হলে এটা কিছুই করবে না (files খালি থাকবে)।
  function recoverPendingImageSearchCapture() {
    ['header-image-search-camera', 'header-image-search-gallery'].forEach(id => {
      const el = document.getElementById(id);
      if (el && el.files && el.files.length > 0) {
        triggerVisualImageSearch(el);
      }
    });
  }
  window.addEventListener('focus', () => setTimeout(recoverPendingImageSearchCapture, 300));
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') setTimeout(recoverPendingImageSearchCapture, 300);
  });

  // ✅ [DEBUG] পেজ লোড হওয়ার পরে চেক করো — ক্যামেরা ওপেন থাকা অবস্থায় পেজ রিলোড/রিস্টার্ট হয়েছিল কিনা।
  // (Android-এ অনেক ট্যাব খোলা থাকলে low-memory-এর কারণে ক্যামেরা চলাকালীন ব্যাকগ্রাউন্ডে থাকা ট্যাব
  //  পুরোপুরি রিলোড হয়ে যেতে পারে — তখন ছবি/state সব হারিয়ে যায়, কোনো error ছাড়াই কিছু হয় না বলে মনে হয়।)
  (function checkLostImageCapture() {
    const pending = sessionStorage.getItem('pendingImageCapture');
    if (pending && (Date.now() - Number(pending)) < 5 * 60 * 1000) {
      sessionStorage.removeItem('pendingImageCapture');
      setTimeout(() => {
        const feedbackBar = document.getElementById('image-search-feedback-bar');
        if (feedbackBar) {
          feedbackBar.classList.remove('hidden');
          feedbackBar.innerHTML = `<span class='flex items-center gap-2 text-amber-700'><i class='fas fa-triangle-exclamation'></i> ক্যামেরা চলার সময় পেজ রিলোড হয়ে গিয়েছিল (লো-মেমোরি কারণে হতে পারে) — ব্রাউজারের অন্য ট্যাব বন্ধ করে আবার চেষ্টা করুন</span>
            <button onclick='clearVisualImageSearchFilter()' class='text-[10px] bg-amber-600 text-white px-2 py-1 rounded-md shadow-sm font-bold'>বন্ধ করুন</button>`;
        }
      }, 800);
    } else if (pending) {
      sessionStorage.removeItem('pendingImageCapture');
    }
  })();

  // ✅ [DEBUG] কোনো JS error হলে সরাসরি স্ক্রিনে দেখাও, যাতে DevTools ছাড়াই বোঝা যায় কী হয়েছে
  // (শুধু ছবি-সার্চ চালু করার ~১৫ সেকেন্ডের মধ্যে error হলেই দেখাবে, অন্য অংশের error-এ noise করবে না)
  window.addEventListener('error', (e) => {
    if (!window._lastImageSearchAttempt || (Date.now() - window._lastImageSearchAttempt) > 15000) return;
    const feedbackBar = document.getElementById('image-search-feedback-bar');
    if (feedbackBar) {
      feedbackBar.classList.remove('hidden');
      feedbackBar.innerHTML = `<span class='flex items-center gap-2 text-red-700'><i class='fas fa-bug'></i> Error: ${(e.message || 'unknown').toString().slice(0,120)}</span>`;
    }
  });
  // ✅ async function-এর ভিতরে throw হওয়া error সাধারণ 'error' event-এ ধরা পড়ে না,
  // এটা 'unhandledrejection' event-এ আসে — এটাও দেখানো দরকার
  window.addEventListener('unhandledrejection', (e) => {
    if (!window._lastImageSearchAttempt || (Date.now() - window._lastImageSearchAttempt) > 15000) return;
    const feedbackBar = document.getElementById('image-search-feedback-bar');
    if (feedbackBar) {
      feedbackBar.classList.remove('hidden');
      feedbackBar.innerHTML = `<span class='flex items-center gap-2 text-red-700'><i class='fas fa-bug'></i> Error: ${((e.reason && e.reason.message) || e.reason || 'unknown').toString().slice(0,120)}</span>`;
    }
  });

  // ✅ Image Search Choice Sheet — ক্যামেরা বা গ্যালারি বেছে নিন
  function openImageSearchSheet() {
    document.getElementById('image-search-choice-sheet').classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }
  function closeImageSearchSheet() {
    document.getElementById('image-search-choice-sheet').classList.add('hidden');
    document.body.style.overflow = 'auto';
  }

  // ============================================================
  // ✅ উইশলিস্ট
  // ============================================================
  // ✅ NEW: লগইন করা ইউজারের জন্য উইশলিস্ট Firestore-এ সিঙ্ক (ডিভাইস বদলালেও/অ্যাপ রিইনস্টল করলেও উইশলিস্ট থাকবে)
  async function syncWishlistOnLogin(uid) {
    try {
      const userDoc = await firestore.collection('users').doc(uid).get();
      const cloudWishlist = (userDoc.exists && Array.isArray(userDoc.data().wishlist)) ? userDoc.data().wishlist : [];
      const localWishlist = safeJSONParse(localStorage.getItem('wishlist'), []);

      // ✅ ক্লাউড + লোকাল (গেস্ট অবস্থায় যোগ করা) — id অনুযায়ী মার্জ, ডুপ্লিকেট বাদ
      const merged = [...cloudWishlist];
      localWishlist.forEach(item => {
        if (!merged.find(m => m.id === item.id)) merged.push(item);
      });

      localStorage.setItem('wishlist', JSON.stringify(merged));
      updateWishlistCount();

      // লোকালে নতুন কিছু (গেস্ট আইটেম) থাকলে সেটা ক্লাউডেও লিখে দাও
      if (merged.length !== cloudWishlist.length) {
        firestore.collection('users').doc(uid).set({ wishlist: merged }, { merge: true }).catch(e => console.error('Wishlist migrate error:', e));
      }
    } catch (e) {
      console.error('syncWishlistOnLogin error:', e);
    }
  }

  function toggleWishlist(productId, productName) {
    let wishlist = safeJSONParse(localStorage.getItem('wishlist'), []);
    if (wishlist.find(item => item.id === productId)) {
      wishlist = wishlist.filter(item => item.id !== productId);
      showCartToast('💔 উইশলিস্ট থেকে সরানো হয়েছে');
    } else {
      const product = products.find(p => p.id == productId);
      wishlist.push({ id: productId, name: productName, image: product?.image || '', price: product?.price || 0 });
      showCartToast('❤️ উইশলিস্টে যোগ করা হয়েছে');
    }
    localStorage.setItem('wishlist', JSON.stringify(wishlist));
    updateWishlistCount();
    // ✅ লগইন করা থাকলে Firestore-এও সিঙ্ক করে দাও (ডিভাইস-জোড়া সিঙ্কের জন্য)
    if (currentUser) {
      firestore.collection('users').doc(currentUser.uid).set({ wishlist }, { merge: true }).catch(e => console.error('Wishlist sync error:', e));
    }
  }

  // ✅ [FIX #3] Wishlist count — আগে function শরীর খালি ছিল, এখন সঠিকভাবে ঠিক করা হয়েছে
  function updateWishlistCount() {
    const wishlist = safeJSONParse(localStorage.getItem('wishlist'), []);
    const countEl = document.getElementById('wishlist-count');
    if (countEl) {
      countEl.innerText = wishlist.length;
      countEl.classList.toggle('hidden', wishlist.length === 0);
    }
  }

  // ✅ উইশলিস্ট ভিউ — সেভ করা পণ্য প্রদর্শন
  function openWishlistView() {
    const wishlist = safeJSONParse(localStorage.getItem('wishlist'), []);
    if (wishlist.length === 0) {
      showCartToast('আপনার উইশলিস্ট খালি! পছন্দের পণ্যে ❤️ আইকনে ট্যাপ করে যুক্ত করুন।');
      return;
    }
    const wishlistProducts = wishlist
      .map(w => products.find(p => p.id == w.id) || w)
      .filter(Boolean);
    renderProducts(wishlistProducts);
    const titleElement = document.getElementById('grid-title');
    const clearBtn = document.getElementById('clear-filter-btn');
    if (titleElement) titleElement.innerText = "❤️ আপনার উইশলিস্ট";
    if (clearBtn) clearBtn.classList.remove('hidden');
    const gridSection = document.getElementById('product-grid');
    if (gridSection) gridSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // ============================================================
  // ✅ [FIX #2] লাইভ স্ট্রিমিং — Firebase Realtime DB-তে সিগনালিং
  // WebRTC P2P এর জন্য Realtime Database ব্যবহার করা হচ্ছে
  // ============================================================

  // Seller লাইভ শুরু করে Firebase-এ রেজিস্টার করবে
  async function startLiveStreamingModule() {
    if (!currentUser) {
      alert("লাইভ শুরু করতে আগে Google দিয়ে লগইন করুন!");
      return;
    }

    const liveWindow = document.getElementById('live-stream-window-seller');
    const videoElement = document.getElementById('live-stream-video-seller');

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      alert('আপনার ব্রাউজারটি লাইভ স্ট্রিমিং সাপোর্ট করে না।');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: currentSellerCameraMode, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: true
      });
      sellerLiveStreamObject = stream;
      videoElement.srcObject = stream;
      liveWindow.classList.remove('hidden');
      document.body.style.overflow = 'hidden';
      isBroadcasting = true;
      // ✅ feature-38: আগের সেশনের পণ্য ব্যাজ রিসেট করো
      const sellerBadge = document.getElementById('seller-live-product-badge');
      sellerBadge.classList.add('hidden');
      sellerBadge.innerHTML = '';

      // Firebase-এ লাইভ স্ট্রিম রেজিস্টার করো
      const liveRef = db.ref(`live_streams/${currentUser.uid}`);
      await liveRef.set({
        uid: currentUser.uid,
        name: currentUser.displayName || 'সেলার',
        avatar: currentUser.photoURL || '',
        product: 'লাইভ পণ্য শোকেস',
        productId: '',
        price: '৳০',
        image: '',
        startedAt: firebase.database.ServerValue.TIMESTAMP,
        isLive: true
      });

      // ব্রাউজার বন্ধ হলে অটো-রিমুভ করো
      liveRef.onDisconnect().remove();

    } catch (err) {
      alert('লাইভ স্ট্রিমিং শুরু করতে ক্যামেরা এবং মাইক্রোফোন পারমিশন দিন!');
    }
  }

  async function stopLiveStreamingModule() {
    if (sellerLiveStreamObject) { sellerLiveStreamObject.getTracks().forEach(t => t.stop()); sellerLiveStreamObject = null; }
    document.getElementById('live-stream-window-seller').classList.add('hidden');
    document.body.style.overflow = 'auto';
    isBroadcasting = false;

    // Firebase থেকে লাইভ সেশন মুছে ফেলো
    if (currentUser) {
      await db.ref(`live_streams/${currentUser.uid}`).remove();
    }
  }

  function switchSellerCamera() {
    if (!sellerLiveStreamObject) return;
    sellerLiveStreamObject.getTracks().forEach(t => t.stop());
    currentSellerCameraMode = currentSellerCameraMode === "environment" ? "user" : "environment";
    const videoElement = document.getElementById('live-stream-video-seller');
    navigator.mediaDevices.getUserMedia({ video: { facingMode: currentSellerCameraMode }, audio: true })
      .then((stream) => { sellerLiveStreamObject = stream; videoElement.srcObject = stream; })
      .catch(err => console.error("ক্যামেরা সুইচ ত্রুটি:", err));
  }

  // ============================================================
  // ✅ [FIX #2] Firebase থেকে রিয়েল-টাইম লাইভ স্ট্রিম লিস্ট লোড
  // ============================================================
  function initLiveStreamsListener() {
    db.ref("live_streams").on("value", (snapshot) => {
      activeStreamsCache = [];
      snapshot.forEach((child) => {
        activeStreamsCache.push({ id: child.key, ...child.val() });
      });
      renderActiveCustomerStreamsList();
    });
  }

  function renderActiveCustomerStreamsList() {
    // ✅ feature-42: হোমপেজ + Tej ফিড পেজ — দুই জায়গাতেই একই লাইভ লিস্ট দেখানো হয়
    ['active-streams-container', 'tej-active-streams-container'].forEach(containerId => {
      const container = document.getElementById(containerId);
      if (!container) return;
      container.innerHTML = "";

      if (activeStreamsCache.length === 0) {
        container.dataset.emptyState = 'true';
        container.innerHTML = `<div class="flex items-center text-[10px] text-slate-400 font-medium self-center">${t('noOneLiveNow')}</div>`;
        return;
      }
      container.dataset.emptyState = 'false';

      activeStreamsCache.forEach(stream => {
        container.insertAdjacentHTML('beforeend', `
          <div onclick="watchCustomerLive('${stream.id}')" class="flex flex-col items-center shrink-0 cursor-pointer group">
            <div class="w-14 h-14 rounded-full p-[3px] live-ring-animation transition group-hover:scale-105">
              <img src="${stream.avatar || 'https://placehold.co/56x56/1e293b/f97316?text=L'}" loading="lazy" class="w-full h-full object-cover rounded-full border-2 border-white" alt="avatar" onerror="this.src='https://placehold.co/56x56/1e293b/f97316?text=L'"/>
            </div>
            <span class="text-[9px] font-bold text-slate-800 mt-1 flex items-center gap-0.5">
              <span class="w-1 h-1 rounded-full bg-red-500 animate-ping"></span> ${stream.name}
            </span>
          </div>
        `);
      });
    });
  }

  async function startCustomerOwnLive() {
    if (!currentUser) { alert("লাইভে আসতে আগে লগইন করুন!"); return; }
    const videoElement = document.getElementById('live-stream-video');
    isBroadcasting = true;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: true });
      customerLiveStreamObject = stream;
      videoElement.srcObject = stream;
      videoElement.src = "";

      document.getElementById('btn-switch-cam').classList.remove('hidden');
      document.getElementById('btn-stop-live').classList.remove('hidden');
      document.getElementById('btn-love-live').classList.add('hidden');
      document.getElementById('live-buy-btn').classList.add('hidden');
      // ✅ ব্রডকাস্ট করার সময় ডিফল্ট "লাইভ রিভিউ পণ্য" প্লেসহোল্ডার বক্সটি লুকাও
      document.getElementById('live-product-badge').classList.add('hidden');
      // ✅ feature-38: ব্রডকাস্ট করার সময় পণ্য যুক্ত করার বাটন দেখাও, আগের সেশনের ব্যাজ মুছে নতুন করে রিসেট করো
      document.getElementById('btn-add-live-product').classList.remove('hidden');
      const ownBadge = document.getElementById('customer-live-broadcast-badge');
      ownBadge.classList.add('hidden');
      ownBadge.innerHTML = '';
      document.getElementById('live-status-indicator').innerHTML = `<span class='w-1.5 h-1.5 rounded-full bg-white inline-block animate-ping'></span> আপনি লাইভে আছেন`;
      document.getElementById('live-stream-window').classList.remove('hidden');

      // Firebase-এ রেজিস্টার করো
      const liveRef = db.ref(`live_streams/${currentUser.uid}`);
      await liveRef.set({
        uid: currentUser.uid, name: currentUser.displayName || 'কাস্টমার',
        avatar: currentUser.photoURL || '', product: 'কাস্টমার লাইভ', productId: '',
        price: '', image: '', startedAt: firebase.database.ServerValue.TIMESTAMP, isLive: true
      });
      liveRef.onDisconnect().remove();

    } catch(err) { alert("ক্যামেরা ব্যবহারের অনুমতি দিন!"); isBroadcasting = false; }
  }

  function watchCustomerLive(streamId) {
    const selectedStream = activeStreamsCache.find(s => s.id === streamId);
    if (!selectedStream) { alert("এই লাইভ সেশন এখন আর চলছে না।"); return; }
    isBroadcasting = false;

    // NOTE: সত্যিকারের P2P ভিডিও শেয়ারিংয়ের জন্য WebRTC সিগনালিং সার্ভার দরকার।
    // এই ডেমোতে লাইভ প্রিভিউ UI দেখানো হচ্ছে।
    const videoElement = document.getElementById('live-stream-video');
    if (customerLiveStreamObject) { customerLiveStreamObject.getTracks().forEach(t => t.stop()); customerLiveStreamObject = null; }
    videoElement.srcObject = null;
    videoElement.src = "https://assets.mixkit.co/videos/preview/mixkit-fashion-woman-with-silver-dress-and-glitter-makeup-41315-large.mp4";
    videoElement.loop = true;

    document.getElementById('live-status-indicator').innerHTML = `<span class='w-1.5 h-1.5 rounded-full bg-white inline-block animate-ping'></span> ${selectedStream.name} এর লাইভ`;
    // [FIX #5] Viewer count — session-stable (একই session-এ একই count থাকবে)
    if (!window._liveViewerCount) {
      window._liveViewerCount = Math.floor(Math.random() * 45) + 5;
    }
    document.getElementById('live-viewer-count').innerText = window._liveViewerCount;
    document.getElementById('live-p-name').innerText = selectedStream.product || 'লাইভ পণ্য';
    document.getElementById('live-p-price').innerText = selectedStream.price || '৳০';
    const imgBox = document.getElementById('live-p-img-box');
    imgBox.innerHTML = selectedStream.image
      ? `<img src="${selectedStream.image}" class="w-full h-full object-cover"/>`
      : `<i class='fas fa-box text-sm'></i>`;
    // ✅ feature-38: ব্রডকাস্টারের রিয়েল পণ্য আইডি মনে রাখো — "কিনুন" বাটনে আসল অর্ডার ফ্লোতে নিয়ে যাওয়ার জন্য
    window._currentLiveProductId = selectedStream.productId || null;

    document.getElementById('btn-switch-cam').classList.add('hidden');
    document.getElementById('btn-stop-live').classList.add('hidden');
    document.getElementById('btn-love-live').classList.remove('hidden');
    document.getElementById('live-buy-btn').classList.remove('hidden');
    // ✅ দর্শক হিসেবে দেখার সময় পণ্য ব্যাজটি আবার দেখাও
    document.getElementById('live-product-badge').classList.remove('hidden');
    // ✅ feature-38: দর্শক হিসেবে দেখার সময় ব্রডকাস্টার-অনলি কন্ট্রোল লুকাও
    document.getElementById('btn-add-live-product').classList.add('hidden');
    document.getElementById('customer-live-broadcast-badge').classList.add('hidden');
    document.getElementById('live-stream-window').classList.remove('hidden');
  }

  function switchCustomerCamera() {
    if (!customerLiveStreamObject) return;
    customerLiveStreamObject.getTracks().forEach(t => t.stop());
    currentCustomerCameraMode = currentCustomerCameraMode === "user" ? "environment" : "user";
    navigator.mediaDevices.getUserMedia({ video: { facingMode: currentCustomerCameraMode }, audio: true })
      .then((stream) => { customerLiveStreamObject = stream; document.getElementById('live-stream-video').srcObject = stream; })
      .catch(err => console.error("ক্যামেরা সুইচ ত্রুটি:", err));
  }

  async function closeLiveStreamModule() {
    if (customerLiveStreamObject) { customerLiveStreamObject.getTracks().forEach(t => t.stop()); customerLiveStreamObject = null; }
    const videoElement = document.getElementById('live-stream-video');
    videoElement.pause(); videoElement.src = ""; videoElement.srcObject = null;
    document.getElementById('live-stream-window').classList.add('hidden');
    window._currentLiveProductId = null;
    if (isBroadcasting && currentUser) {
      await db.ref(`live_streams/${currentUser.uid}`).remove();
    }
    isBroadcasting = false;
  }

  function sendLoveReaction() { alert("❤️ আপনি লাইভে একটি লাভ রিঅ্যাকশন পাঠিয়েছেন!"); }

  // ✅ feature-38: লাইভে দেখানো হলে আসল পণ্য থাকলে — সরাসরি সেই পণ্যের ডিটেইল/অর্ডার ফ্লোতে নিয়ে যায়
  function actionLiveCartAdd() {
    const pid = window._currentLiveProductId;
    if (pid) {
      const product = products.find(p => p.id == pid);
      if (product) {
        closeLiveStreamModule();
        openProductDetail(pid);
        return;
      }
    }
    // ফলব্যাক: ব্রডকাস্টার এখনো কোনো আসল পণ্য যুক্ত করেননি
    const pName = document.getElementById('live-p-name').innerText;
    alert(`⚠️ ব্রডকাস্টার এখনো কোনো নির্দিষ্ট পণ্য যুক্ত করেননি। সাধারণ পণ্য তালিকা থেকে কেনাকাটা করুন।`);
    closeLiveStreamModule();
  }

  // ============================================================
  // ✅ NEW (feature-38): লাইভ পণ্য পিকার — সেলার ও কাস্টমার উভয়ের লাইভ থেকেই
  // আসল পণ্য সিলেক্ট করে দেখানো যায়, যাতে দর্শকরা সরাসরি অর্ডার করতে পারে
  // ============================================================
  let _liveProductPickerContext = null; // 'seller' | 'customer'

  function openLiveProductPicker(context) {
    if (!currentUser) return;
    _liveProductPickerContext = context;
    const searchInput = document.getElementById('live-product-picker-search');
    if (searchInput) searchInput.value = '';
    renderLiveProductPickerList('');
    document.getElementById('live-product-picker-modal').classList.remove('hidden');
  }

  function closeLiveProductPicker() {
    document.getElementById('live-product-picker-modal').classList.add('hidden');
  }

  function renderLiveProductPickerList(query) {
    const list = document.getElementById('live-product-picker-list');
    if (!list) return;
    const q = (query || '').trim().toLowerCase();
    let pool = products || [];
    // সেলার হলে নিজের পণ্য আগে দেখাও (নিজের পণ্য থাকলে শুধু সেগুলোই দেখাও)
    if (_liveProductPickerContext === 'seller' && currentUser) {
      const own = pool.filter(p => p.sellerUid === currentUser.uid);
      if (own.length > 0) pool = own;
    }
    const filtered = q ? pool.filter(p => (p.name || '').toLowerCase().includes(q)) : pool;
    if (filtered.length === 0) {
      list.innerHTML = `<div class='text-center py-8 text-slate-400 text-xs'>কোনো পণ্য পাওয়া যায়নি</div>`;
      return;
    }
    list.innerHTML = filtered.slice(0, 30).map(p => `
      <div onclick="selectLiveProductForBroadcast('${p.id}')" class='flex items-center gap-3 p-2.5 rounded-xl border border-slate-100 hover:border-orange-300 cursor-pointer active:scale-95 transition'>
        <img src="${p.image}" loading="lazy" class='w-12 h-12 rounded-lg object-cover bg-slate-100' onerror="this.src='https://placehold.co/48x48/f8fafc/94a3b8?text=?'">
        <div class='flex-1 min-w-0'>
          <p class='text-xs font-bold text-slate-800 line-clamp-1'>${escapeHtml(p.name)}</p>
          <p class='text-[11px] font-black text-orange-600 mt-0.5'>৳${p.price}</p>
        </div>
        <i class='fas fa-chevron-right text-slate-300 text-xs'></i>
      </div>
    `).join('');
  }

  async function selectLiveProductForBroadcast(productId) {
    const product = products.find(p => p.id == productId);
    if (!product || !currentUser) return;

    try {
      await db.ref(`live_streams/${currentUser.uid}`).update({
        productId: product.id,
        product: product.name,
        price: '৳' + product.price,
        image: product.image || ''
      });
    } catch (e) { console.error('লাইভ পণ্য আপডেট ত্রুটি:', e); }

    // ব্রডকাস্টারের নিজের প্রিভিউতে নির্বাচিত পণ্যের ব্যাজ দেখাও
    const badgeId = _liveProductPickerContext === 'seller' ? 'seller-live-product-badge' : 'customer-live-broadcast-badge';
    const badge = document.getElementById(badgeId);
    if (badge) {
      badge.classList.remove('hidden');
      badge.innerHTML = `
        <img src="${product.image}" class='w-9 h-9 rounded-lg object-cover bg-slate-100' onerror="this.src='https://placehold.co/36x36/f8fafc/94a3b8?text=?'">
        <div class='flex-1 min-w-0'>
          <p class='text-[11px] font-bold text-slate-900 line-clamp-1'>${escapeHtml(product.name)}</p>
          <p class='text-[10px] font-black text-orange-600'>৳${product.price} — কাস্টমাররা এটি এখন অর্ডার করতে পারবেন</p>
        </div>
        <i class='fas fa-circle-check text-emerald-500'></i>
      `;
    }
    closeLiveProductPicker();
  }

  // ============================================================
  // ✅ [FIX #1] সেলার প্যানেল — পণ্য এখন Firestore-এ সেভ হবে
  // ============================================================
  async function handleSellerProductUpload() {
    if (!currentUser || currentUserRole !== 'seller') { alert('সেলার লগইন করুন!'); return; }

    const name = document.getElementById('new-product-name').value.trim();
    const price = parseFloat(document.getElementById('new-product-price').value.trim());
    const category = document.getElementById('new-product-category').value;
    const sizesInput = document.getElementById('new-product-sizes').value.trim();

    if (!base64UploadedProductImageString) { alert('দয়া করে পণ্যের একটি ছবি সিলেক্ট করুন!'); return; }
    if (!name) { alert('দয়া করে পণ্যের নাম লিখুন!'); return; }
    if (!price || isNaN(price)) { alert('দয়া করে পণ্যের সঠিক মূল্য দিন!'); return; }
    if (!sizesInput) { alert('দয়া করে অন্তত একটি সাইজ উল্লেখ করুন!'); return; }

    const uploadBtn = document.querySelector('[onclick="handleSellerProductUpload()"]');
    if (uploadBtn) { uploadBtn.disabled = true; uploadBtn.innerHTML = `<i class="fas fa-spinner fa-spin mr-1"></i> আপলোড হচ্ছে...`; }

    const rawSizesArray  = sizesInput.split(',').map(s => s.trim()).filter(s => s.length > 0);
    // ✅ NEW (feature-19): color variant
    const colorsInput    = (document.getElementById('new-product-colors')?.value || '').trim();
    const rawColorsArray = colorsInput ? colorsInput.split(',').map(s => s.trim()).filter(s => s.length > 0) : [];
    const stockInput     = parseInt(document.getElementById('new-product-stock')?.value || '10', 10);
    const newProduct = {
      name, price, stock: isNaN(stockInput) ? 10 : stockInput,
      image: base64UploadedProductImageString,
      sizes: rawSizesArray,
      colors: rawColorsArray,
      category,
      sellerUid: currentUser.uid,
      sellerName: currentUser.displayName || '',
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    try {
      // Firestore-এ পণ্য সেভ করো
      await firestore.collection("products").add(newProduct);
      clearProductUploadFormFields();
      alert('অভিনন্দন! আপনার নতুন পণ্যটি সকলের শপে লাইভ যুক্ত হয়েছে। 🚀');
    } catch (e) {
      alert('পণ্য আপলোড ব্যর্থ হয়েছে: ' + e.message);
    } finally {
      if (uploadBtn) { uploadBtn.disabled = false; uploadBtn.innerHTML = t('publishProductBtn'); }
    }
  }

  function clearProductUploadFormFields() {
    document.getElementById('new-product-name').value = '';
    document.getElementById('new-product-price').value = '';
    document.getElementById('new-product-sizes').value = '';
    // ✅ NEW (feature-19)
    const colEl = document.getElementById('new-product-colors');
    if (colEl) colEl.value = '';
    const stockEl = document.getElementById('new-product-stock');
    if (stockEl) stockEl.value = '10';
    const cpEl = document.getElementById('color-chips-preview');
    if (cpEl) cpEl.innerHTML = '';
    document.getElementById('product-preview-img').classList.add('hidden');
    document.getElementById('product-preview-img').src = '';
    document.getElementById('product-upload-ui-box').classList.remove('hidden');
    base64UploadedProductImageString = "";
  }

  function processProductImageUpload(input) {
    if (input.files && input.files[0]) {
      const reader = new FileReader();
      reader.onload = function(e) {
        base64UploadedProductImageString = e.target.result;
        document.getElementById('product-upload-ui-box').classList.add('hidden');
        const previewImg = document.getElementById('product-preview-img');
        previewImg.src = base64UploadedProductImageString;
        previewImg.classList.remove('hidden');
      };
      reader.readAsDataURL(input.files[0]);
    }
  }

  // ============================================================
  // ✅ [FIX #1] সেলার শপ সেটিংস — Firestore-এ সেভ
  // ============================================================
  async function saveSellerDashboardSettings() {
    const shopName = document.getElementById('seller-shop-name-input').value.trim();
    const whatsapp = document.getElementById('seller-whatsapp-input').value.trim();
    const confirmTerms = confirm("আপনি কি নিশ্চিত করছেন যে আপনার সকল পণ্য ভেজালমুক্ত, ১০০% অরিজিনাল এবং গ্রাহকের জন্য লাভজনক?");
    if (!confirmTerms) return;

    try {
      await firestore.collection("users").doc(currentUser.uid).update({
        shopName, whatsapp, logoBase64: base64SellerLogoString || null
      });
      document.getElementById('seller-display-shop-name').innerText = shopName;
      alert('শপ ডাটা সফলভাবে আপডেট হয়েছে!');
    } catch(e) {
      // Firestore ব্যর্থ হলে localStorage-এ সেভ করো
      localStorage.setItem('seller_shop_data', JSON.stringify({ shopName, whatsapp, logoBase64: base64SellerLogoString }));
      document.getElementById('seller-display-shop-name').innerText = shopName;
      alert('শপ ডাটা সফলভাবে আপডেট হয়েছে!');
    }
  }

  function processSellerLogoUpload(input) {
    if (input.files && input.files[0]) {
      const reader = new FileReader();
      reader.onload = function(e) { base64SellerLogoString = e.target.result; applySellerLogoToUi(base64SellerLogoString); };
      reader.readAsDataURL(input.files[0]);
    }
  }

  function applySellerLogoToUi(base64Data) {
    document.getElementById('seller-logo-placeholder').classList.add('hidden');
    const previewImg = document.getElementById('seller-logo-preview-img');
    previewImg.src = base64Data; previewImg.classList.remove('hidden');
  }

  function resetSellerLogoUi() {
    document.getElementById('seller-logo-placeholder').classList.remove('hidden');
    document.getElementById('seller-logo-preview-img').classList.add('hidden');
    document.getElementById('seller-logo-preview-img').src = "";
  }

  // ============================================================
  // ✅ প্রোফাইল ও ভেরিফিকেশন
  // ============================================================
  // ✅ NEW (feature-54): Welcome ইন্ট্রো স্টেপ ↔ সাইন ইন/আপ ফর্ম স্টেপ টগল করার ফাংশন
  function showAuthWelcomeStep() {
    const w = document.getElementById('auth-step-welcome');
    const f = document.getElementById('auth-step-form');
    if (w) { w.classList.remove('hidden'); w.style.display = 'flex'; }
    if (f) { f.classList.add('hidden'); f.style.display = 'none'; }
  }
  function proceedToAuthForm(tab) {
    const w = document.getElementById('auth-step-welcome');
    const f = document.getElementById('auth-step-form');
    if (w) { w.classList.add('hidden'); w.style.display = 'none'; }
    if (f) { f.classList.remove('hidden'); f.style.display = 'flex'; }
    if (typeof switchAuthTab === 'function') switchAuthTab(tab || 'signin');
  }
  function openProfile() {
    // feature-33/34/36: sync toggles on open
    { const _d=document.documentElement.classList.contains('dark');
      const _cb=document.getElementById('profile-dark-mode-toggle');
      if(_cb)_cb.checked=_d;
      const _ic=document.getElementById('profile-dark-mode-icon');
      if(_ic){_ic.classList.toggle('fa-moon',!_d);_ic.classList.toggle('fa-sun',_d);}
      // lang toggle: checked = English
      const _lc=document.getElementById('profile-lang-toggle');
      if(_lc)_lc.checked=(typeof currentLang!=='undefined' && currentLang==='en');
      // page nav toggle sync
      const _pn=document.getElementById('profile-page-nav-toggle');
      if(_pn)_pn.checked=(typeof _liquidNavState!=='undefined' && _liquidNavState==='page');
      const _sub=document.getElementById('profile-page-nav-sub');
      if(_sub)_sub.textContent=(typeof _liquidNavState!=='undefined' && _liquidNavState==='page') ? 'হোমে ফিরে যান' : 'সোশ্যাল ফিডে যান';
    }
    const profileModal = document.getElementById('profile-modal');
    if (!profileModal) return;
    profileModal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    const loginScreen   = document.getElementById('login-screen');
    const loggedInPanel = document.getElementById('logged-in-panel');
    const modalSheet     = document.getElementById('profile-modal-sheet');
    if (!currentUser) {
      loginScreen.classList.remove('hidden');
      loginScreen.style.display = 'flex';
      loggedInPanel.style.display = 'none';
      if (modalSheet) modalSheet.classList.add('profile-sheet-fullscreen');
      showAuthWelcomeStep(); // ✅ feature-54: প্রতিবার মোডাল খুললে Welcome ইন্ট্রো স্টেপ থেকে শুরু হবে
    } else {
      loginScreen.classList.add('hidden');
      loginScreen.style.display = 'none';
      loggedInPanel.style.display = 'flex';
      if (modalSheet) modalSheet.classList.remove('profile-sheet-fullscreen');
      const nameEl = document.getElementById('profile-display-name');
      const emailEl = document.getElementById('profile-email-display');
      const avatarEl = document.getElementById('avatar-preview-img');
      const placeholderEl = document.getElementById('avatar-placeholder-icon');
      if (nameEl) nameEl.innerText = currentUser.displayName || 'কাস্টমার';
      if (emailEl) emailEl.innerText = currentUser.email || '';
      if (avatarEl && currentUser.photoURL) {
        avatarEl.src = currentUser.photoURL;
        avatarEl.classList.remove('hidden');
        if (placeholderEl) placeholderEl.classList.add('hidden');
      }
      if (document.getElementById('profile-name')) document.getElementById('profile-name').value = currentUser.displayName || '';
      const savedProfileData = safeJSONParse(localStorage.getItem('user_profile_data'), null);
      if (savedProfileData) {
        if (document.getElementById('profile-phone')) document.getElementById('profile-phone').value = savedProfileData.phone || '';
        if (document.getElementById('profile-address')) document.getElementById('profile-address').value = savedProfileData.address || '';
      }
      updateGoogleVerifyUI(currentUser); // ✅ প্রোফাইল খুললে verify UI আপডেট
      toggleProfileVerifySection(!isMobileNumberVerified); // ✅ ভেরিফাইড না হলে ফর্ম খোলা থাকবে, ভেরিফাইড হলে গুটানো থাকবে
      updateLoyaltyAndReferralUI(); // ✅ লয়ালটি পয়েন্ট ও রেফারেল কোড দেখাও
      updateBalanceUI(); // ✅ NEW (feature-44): ব্যালেন্স দেখাও
      renderSellerPanelByRole();
      switchProfilePanel('customer');
      // ✅ privacy toggle লোড করো
      _loadProfilePrivacyToggle();
      _loadProfileBio();
    }
  }

  // ============================================================
  // ✅ Admin Notification System — রিয়েল-টাইম বেল নোটিফিকেশন
  // ============================================================

  // Admin লগইন করলে notification listener শুরু করো
  function initAdminNotificationListener() {
    if (!currentUser || !ADMIN_EMAILS.includes(currentUser.email)) return;

    firestore.collection("admin_notifications")
      .where("isRead", "==", false)
      .onSnapshot((snapshot) => {
        const count = snapshot.size;

        // ✅ নেভিগেশন বেল ব্যাজ আপডেট
        const bellBadge = document.getElementById('admin-notif-badge');
        if (bellBadge) {
          bellBadge.innerText = count;
          bellBadge.classList.toggle('hidden', count === 0);
        }

        // ✅ নতুন নোটিফিকেশন এলে পপআপ টোস্ট দেখাও
        if (!snapshot.metadata.hasPendingWrites) {
          snapshot.docChanges().forEach(change => {
            if (change.type === 'added') {
              const d = change.doc.data();
              if (d.type === 'seller_application') {
                showAdminToast(
                  `🆕 নতুন সেলার আবেদন!`,
                  `${d.applicantName} সেলার হতে চান।`,
                  d.applicantPhoto,
                  change.doc.id
                );
              }
            }
          });
        }

        // ✅ নোটিফিকেশন প্যানেল রেন্ডার করো
        renderAdminNotifications(snapshot.docs);
      });
  }

  // টোস্ট পপআপ
  function showAdminToast(title, body, photo, notifId) {
    const old = document.getElementById('admin-toast');
    if (old) old.remove();

    const toast = document.createElement('div');
    toast.id = 'admin-toast';
    toast.className = 'fixed top-4 left-1/2 -translate-x-1/2 z-[100] w-[90%] max-w-sm bg-white rounded-2xl shadow-2xl border border-violet-200 p-3 flex items-center gap-3 animate-bounce-once';
    toast.innerHTML = `
      <div class="w-10 h-10 rounded-full overflow-hidden bg-violet-100 shrink-0 border-2 border-violet-300">
        ${photo ? `<img loading="lazy" src="${photo}" class="w-full h-full object-cover"/>` : `<div class="w-full h-full flex items-center justify-center"><i class="fas fa-user text-violet-400"></i></div>`}
      </div>
      <div class="flex-1 min-w-0">
        <p class="text-xs font-black text-slate-800">${title}</p>
        <p class="text-[10px] text-slate-500 truncate">${body}</p>
      </div>
      <div class="flex flex-col gap-1 shrink-0">
        <button onclick="openProfile(); switchProfilePanel('seller'); markNotifRead('${notifId}'); document.getElementById('admin-toast').remove();"
          class="bg-violet-600 text-white text-[9px] font-bold px-2.5 py-1.5 rounded-lg">
          দেখুন
        </button>
        <button onclick="document.getElementById('admin-toast').remove();"
          class="bg-slate-100 text-slate-500 text-[9px] font-bold px-2.5 py-1.5 rounded-lg">
          বন্ধ করুন
        </button>
      </div>
    `;
    document.body.appendChild(toast);
    // ১০ সেকেন্ড পর স্বয়ংক্রিয় বন্ধ
    setTimeout(() => { if (toast.parentNode) toast.remove(); }, 10000);
  }

  // নোটিফিকেশন প্যানেল রেন্ডার
  function renderAdminNotifications(docs) {
    const listEl = document.getElementById('admin-notif-list');
    if (!listEl) return;

    if (docs.length === 0) {
      listEl.innerHTML = `
        <div class="text-center py-5 text-slate-400 text-xs">
          <i class="fas fa-bell-slash text-xl text-slate-200 mb-1 block"></i>
          কোনো নতুন নোটিফিকেশন নেই
        </div>`;
      return;
    }

    listEl.innerHTML = docs.map(doc => {
      const d = doc.data();
      const date = d.createdAt
        ? new Date(d.createdAt.seconds * 1000).toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' })
        : '';
      return `
        <div class="bg-violet-50 border border-violet-100 rounded-xl p-3 flex items-center gap-3" id="notif-${doc.id}">
          <div class="w-9 h-9 rounded-full overflow-hidden bg-violet-100 shrink-0 border border-violet-200">
            ${d.applicantPhoto ? `<img loading="lazy" src="${d.applicantPhoto}" class="w-full h-full object-cover"/>` : `<div class="w-full h-full flex items-center justify-center"><i class="fas fa-user text-violet-400 text-xs"></i></div>`}
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-[11px] font-black text-slate-800 truncate">${escapeHtml(d.applicantName)}</p>
            <p class="text-[9px] text-slate-500">${escapeHtml(d.message)}</p>
            <p class="text-[9px] text-violet-500 font-bold mt-0.5">${date}</p>
          </div>
          <button onclick="markNotifRead('${doc.id}')"
            class="text-[9px] font-bold px-2 py-1.5 bg-white border border-slate-200 text-slate-500 rounded-lg hover:bg-slate-50 shrink-0">
            ✓ পড়েছি
          </button>
        </div>`;
    }).join('');
  }

  // নোটিফিকেশন পড়া হয়েছে mark করো
  async function markNotifRead(docId) {
    try {
      await firestore.collection("admin_notifications").doc(docId).update({ isRead: true });
      const el = document.getElementById(`notif-${docId}`);
      if (el) el.remove();
    } catch(e) { console.error(e); }
  }

  // সব নোটিফিকেশন পড়া হয়েছে mark করো
  async function markAllNotifsRead() {
    try {
      const snap = await firestore.collection("admin_notifications").where("isRead", "==", false).get();
      const batch = firestore.batch();
      snap.docs.forEach(doc => batch.update(doc.ref, { isRead: true }));
      await batch.commit();
    } catch(e) { console.error(e); }
  }

  // ============================================================
  // ✅ Admin — Pending Seller অনুমোদন সিস্টেম
  // ============================================================

  // Firestore থেকে pending_seller রোলের সব ইউজার লোড করো
  async function loadPendingSellers() {
    const listEl = document.getElementById('pending-seller-list');
    const badgeEl = document.getElementById('pending-seller-badge');
    if (!listEl) return;

    listEl.innerHTML = `<div class="text-center py-4 text-slate-400 text-xs"><i class="fas fa-spinner fa-spin text-lg text-slate-300 mb-1 block"></i> লোড হচ্ছে...</div>`;

    try {
      const snap = await firestore.collection("users").where("role", "==", "pending_seller").get();

      if (badgeEl) badgeEl.innerText = snap.size;

      if (snap.empty) {
        listEl.innerHTML = `
          <div class="text-center py-6 text-slate-400 text-xs font-medium">
            <i class="fas fa-check-circle text-2xl text-emerald-300 mb-2 block"></i>
            কোনো পেন্ডিং আবেদন নেই!
          </div>`;
        return;
      }

      listEl.innerHTML = snap.docs.map(doc => {
        const u = doc.data();
        const appliedDate = u.appliedAt
          ? new Date(u.appliedAt.seconds * 1000).toLocaleDateString('bn-BD', { day: 'numeric', month: 'short', year: 'numeric' })
          : 'অজানা';

        return `
          <div class="bg-violet-50 border border-violet-100 rounded-xl p-3 flex items-center gap-3" id="pending-card-${doc.id}">
            <img loading="lazy" src="${u.photo || 'https://placehold.co/40x40/ede9fe/7c3aed?text=' + (u.name?.[0] || '?')}"
              loading="lazy"
              class="w-10 h-10 rounded-full object-cover border-2 border-violet-200 shrink-0"
              onerror="this.src='https://placehold.co/40x40/ede9fe/7c3aed?text=?'"/>
            <div class="flex-1 min-w-0">
              <p class="text-[11px] font-black text-slate-800 truncate">${u.name || 'নাম নেই'}</p>
              <p class="text-[10px] text-slate-500 truncate">${u.email || ''}</p>
              <p class="text-[9px] text-violet-600 font-bold mt-0.5">📅 আবেদন: ${appliedDate}</p>
            </div>
            <div class="flex flex-col gap-1.5 shrink-0">
              <button onclick="approveSellerRequest('${doc.id}', '${(u.name || '').replace(/'/g, "")}')"
                class="bg-emerald-500 hover:bg-emerald-600 text-white text-[9px] font-black px-2.5 py-1.5 rounded-lg transition active:scale-95 flex items-center gap-1">
                <i class="fas fa-check"></i> অনুমোদন
              </button>
              <button onclick="rejectSellerRequest('${doc.id}', '${(u.name || '').replace(/'/g, "")}')"
                class="bg-red-100 hover:bg-red-200 text-red-700 text-[9px] font-black px-2.5 py-1.5 rounded-lg transition active:scale-95 flex items-center gap-1">
                <i class="fas fa-times"></i> প্রত্যাখ্যান
              </button>
            </div>
          </div>`;
      }).join('');

    } catch (e) {
      listEl.innerHTML = `<div class="text-center py-4 text-red-400 text-xs">Firebase Rules চেক করুন: ${e.message}</div>`;
      console.error("Pending sellers load error:", e);
    }
  }

  // সেলার অনুমোদন দাও
  async function approveSellerRequest(uid, name) {
    if (!confirm(`"${name}" কে সেলার হিসেবে অনুমোদন দিতে চান?`)) return;
    try {
      await firestore.collection("users").doc(uid).update({
        role: 'seller',
        approvedAt: firebase.firestore.FieldValue.serverTimestamp(),
        approvedBy: currentUser.uid
      });
      // ✅ পাবলিক প্রোফাইল (কমিউনিটি লিস্ট/কাউন্ট) সিঙ্ক — কাস্টমার থেকে সেলারে সরে যাবে
      // [বাগ ফিক্স] আগে শুধু {role, updatedAt} পাঠানো হতো — ডকটা আগে থেকে না থাকলে
      // Rules-এর create শর্ত (uid/name/createdAt আবশ্যক) পূরণ হতো না, write চুপচাপ ফেইল হতো।
      // এখন users/{uid} থেকে নাম/ছবি এনে পুরো payload পাঠানো হচ্ছে, merge:true সহ —
      // ডক আগে থেকে থাকলে শুধু role/photo/name updatedAt হবে, না থাকলে সঠিকভাবে তৈরি হবে।
      (async () => {
        try {
          let profileName = name; let photo = '';
          const uDoc = await firestore.collection('users').doc(uid).get();
          if (uDoc.exists) {
            profileName = uDoc.data().name || profileName;
            photo = uDoc.data().photo || '';
          }
          const pRef = firestore.collection('public_profiles').doc(uid);
          const pSnap = await pRef.get();
          const payload = {
            uid: uid, name: profileName, photo: photo, role: 'seller', bio: '',
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
          };
          if (!pSnap.exists) payload.createdAt = firebase.firestore.FieldValue.serverTimestamp();
          await pRef.set(payload, { merge: true });
        } catch (e) { console.error('public_profiles sync error:', e); }
      })();
      // কার্ড সরিয়ে ফেলো
      const card = document.getElementById(`pending-card-${uid}`);
      if (card) {
        card.classList.add('opacity-0', 'scale-95');
        card.style.transition = 'all 0.3s';
        setTimeout(() => { card.remove(); updatePendingBadge(); }, 300);
      }
      alert(`✅ "${name}" এখন সেলার হিসেবে অনুমোদিত হয়েছে!`);
    } catch (e) {
      alert('অনুমোদন ব্যর্থ হয়েছে: ' + e.message);
    }
  }

  // সেলার আবেদন প্রত্যাখ্যান করো
  async function rejectSellerRequest(uid, name) {
    if (!confirm(`"${name}" এর আবেদন প্রত্যাখ্যান করতে চান?`)) return;
    try {
      await firestore.collection("users").doc(uid).update({
        role: 'customer',
        rejectedAt: firebase.firestore.FieldValue.serverTimestamp(),
        rejectedBy: currentUser.uid
      });
      // ✅ পাবলিক প্রোফাইল সিঙ্ক — কমিউনিটি কাস্টমার কাউন্টে ফিরে যাবে
      firestore.collection('public_profiles').doc(uid).set({
        role: 'customer', updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true }).catch(e => console.error('public_profiles sync error:', e));
      const card = document.getElementById(`pending-card-${uid}`);
      if (card) {
        card.classList.add('opacity-0', 'scale-95');
        card.style.transition = 'all 0.3s';
        setTimeout(() => { card.remove(); updatePendingBadge(); }, 300);
      }
      alert(`❌ "${name}" এর আবেদন প্রত্যাখ্যান করা হয়েছে।`);
    } catch (e) {
      alert('প্রত্যাখ্যান ব্যর্থ হয়েছে: ' + e.message);
    }
  }

  // Badge কাউন্ট আপডেট করো
  function updatePendingBadge() {
    const listEl = document.getElementById('pending-seller-list');
    const badgeEl = document.getElementById('pending-seller-badge');
    if (!listEl || !badgeEl) return;
    const remaining = listEl.querySelectorAll('[id^="pending-card-"]').length;
    badgeEl.innerText = remaining;
    if (remaining === 0) {
      listEl.innerHTML = `
        <div class="text-center py-6 text-slate-400 text-xs font-medium">
          <i class="fas fa-check-circle text-2xl text-emerald-300 mb-2 block"></i>
          সব আবেদন প্রক্রিয়া সম্পন্ন!
        </div>`;
    }
  }

  // Firestore রিয়েল-টাইম লিসেনার — pending_seller count badge
  function initPendingSellerListener() {
    firestore.collection("users").where("role", "==", "pending_seller")
      .onSnapshot((snap) => {
        const badgeEl = document.getElementById('pending-seller-badge');
        if (badgeEl) badgeEl.innerText = snap.size;
        // admin seller approval box দেখাও
        const approvalBox = document.getElementById('admin-seller-approval-box');
        if (approvalBox && snap.size > 0) {
          approvalBox.classList.remove('hidden');
        }
      });
  }

  function renderSellerPanelByRole() {
    const sellerView = document.getElementById('seller-panel-view');
    if (!sellerView || !currentUser) return;

    if (currentUserRole === 'seller') {
      document.getElementById('seller-display-shop-name').innerText = currentUser.displayName || 'My Store';
      // Firestore থেকে শপ ডেটা লোড
      firestore.collection("users").doc(currentUser.uid).get().then(doc => {
        if (doc.exists && doc.data().shopName) {
          document.getElementById('seller-shop-name-input').value = doc.data().shopName;
          document.getElementById('seller-display-shop-name').innerText = doc.data().shopName;
          if (doc.data().whatsapp) document.getElementById('seller-whatsapp-input').value = doc.data().whatsapp;
        }
      });
      // ✅ [FIX #2] Admin হলে Approval box, Notification panel ও কুপন বক্স দেখাও
      // ডাবল চেক: email AND Firestore-এ role === 'seller' উভয়ই থাকতে হবে
      const isVerifiedAdmin = ADMIN_EMAILS.includes(currentUser.email) && currentUserRole === 'seller';
      if (isVerifiedAdmin) {
        const approvalBox = document.getElementById('admin-seller-approval-box');
        if (approvalBox) approvalBox.classList.remove('hidden');
        // Notification panel দেখাও
        const notifPanel = document.getElementById('admin-notif-panel');
        if (notifPanel) notifPanel.classList.remove('hidden');
        // ✅ NEW (feature-47): উইথড্রো ম্যানেজমেন্ট প্যানেল দেখাও
        const withdrawPanel = document.getElementById('admin-withdraw-panel');
        if (withdrawPanel) withdrawPanel.classList.remove('hidden');
        loadAdminWithdrawRequests();
        // কুপন বক্স দেখাও
        const couponBox = document.getElementById('admin-coupon-box');
        if (couponBox) couponBox.classList.remove('hidden');
        loadAdminCoupons();
        loadPendingSellers();
        if (!window._pendingSellerListenerStarted) {
          window._pendingSellerListenerStarted = true;
          initPendingSellerListener();
        }
      }

    } else if (currentUserRole === 'pending_seller') {
      sellerView.innerHTML = `
        <div class="flex flex-col items-center justify-center flex-1 p-8 text-center space-y-4">
          <div class="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center">
            <i class="fas fa-clock text-amber-500 text-2xl"></i>
          </div>
          <h4 class="font-black text-slate-800 text-base">আবেদন পর্যালোচনাধীন</h4>
          <p class="text-xs text-slate-500 leading-relaxed">Admin অনুমোদন করলে সেলার প্যানেল চালু হবে।<br>সাধারণত ২৪ ঘণ্টার মধ্যে সিদ্ধান্ত জানানো হয়।</p>
        </div>`;

    } else {
      // সাধারণ কাস্টমার — সেলার আবেদনের অপশন
      sellerView.innerHTML = `
        <div class="flex flex-col items-center justify-center flex-1 p-8 text-center space-y-5">
          <div class="w-16 h-16 rounded-full bg-orange-100 flex items-center justify-center">
            <i class="fas fa-shop text-orange-500 text-2xl"></i>
          </div>
          <div>
            <h4 class="font-black text-slate-800 text-base">সেলার হতে চান?</h4>
            <p class="text-xs text-slate-500 mt-1.5 leading-relaxed">আবেদন করুন। Admin অনুমোদনের পর আপনি পণ্য বিক্রি করতে পারবেন।</p>
          </div>
          <div class="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-left space-y-2 text-xs text-slate-600">
            <p class="font-bold text-slate-700 mb-1">✅ সেলার হলে যা পাবেন:</p>
            <p>📦 নিজের পণ্য আপলোড করুন (সবার কাছে দেখাবে)</p>
            <p>📋 অর্ডার ট্র্যাক করুন</p>
            <p>💰 আয়ের হিসাব দেখুন</p>
            <p>📡 লাইভ স্ট্রিমে পণ্য দেখান</p>
          </div>
          <button onclick="applyForSeller()" class="w-full bg-orange-600 text-white font-bold text-sm py-3 rounded-2xl hover:bg-orange-700 active:scale-95 transition shadow-lg shadow-orange-500/20">
            সেলার হিসেবে আবেদন করুন 🚀
          </button>
        </div>`;
    }
  }

  function closeProfile() {
    stopCameraHardwareStream();
    const profileModal = document.getElementById('profile-modal');
    if (profileModal) { profileModal.classList.add('hidden'); document.body.style.overflow = 'auto'; }
  }

  function switchProfilePanel(targetPanel) {
    stopCameraHardwareStream();
    const customerView = document.getElementById('customer-panel-view');
    const sellerView = document.getElementById('seller-panel-view');
    const customerBtn = document.getElementById('tab-customer-btn');
    const sellerBtn = document.getElementById('tab-seller-btn');
    if (targetPanel === 'customer') {
      customerView.classList.remove('hidden'); sellerView.classList.add('hidden');
      customerBtn.className = "flex-1 py-2.5 text-xs font-bold rounded-xl transition-all duration-300 flex items-center justify-center gap-2 bg-white text-slate-900 shadow";
      sellerBtn.className = "flex-1 py-2.5 text-xs font-bold rounded-xl transition-all duration-300 flex items-center justify-center gap-2 text-slate-500 hover:bg-white/60";
      showCustomerSubView('list'); // ✅ কাস্টমার ট্যাবে আসলে সবসময় লিস্ট ভিউ থেকে শুরু হবে
    } else {
      customerView.classList.add('hidden'); sellerView.classList.remove('hidden');
      sellerBtn.className = "flex-1 py-2.5 text-xs font-bold rounded-xl transition-all duration-300 flex items-center justify-center gap-2 bg-white text-slate-900 shadow";
      customerBtn.className = "flex-1 py-2.5 text-xs font-bold rounded-xl transition-all duration-300 flex items-center justify-center gap-2 text-slate-500 hover:bg-white/60";
      if (currentUserRole === 'seller' && !window._sellerListenerStarted) {
        window._sellerListenerStarted = true;
        initSellerOrderListener();
        loadSellerEarnings();
      }
      // ✅ Analytics, Low Stock ও Chat auto-load
      setTimeout(() => {
        loadAnalytics('week');
        checkLowStockAlert();
        if (currentUser) initSupportChat();
      }, 600);
    }
  }

  // ✅ কাস্টমার প্রোফাইলের লিস্ট-ভিউ ⇄ সেটিংস-ভিউ টগল করো
  function showCustomerSubView(view) {
    const header   = document.getElementById('customer-profile-header');
    const listView  = document.getElementById('customer-list-view');
    const settingsView = document.getElementById('customer-settings-view');
    if (!listView || !settingsView) return;
    if (view === 'settings') {
      if (header) header.classList.add('hidden');
      listView.classList.add('hidden');
      settingsView.classList.remove('hidden');
      settingsView.classList.add('flex');
    } else {
      if (header) header.classList.remove('hidden');
      listView.classList.remove('hidden');
      settingsView.classList.add('hidden');
      settingsView.classList.remove('flex');
    }
  }

  // ✅ প্রোফাইল লিস্টের রো থেকে খোলা বটম-শিটগুলো (My Orders, Notification, Loyalty, Privacy, Terms)
  function openBottomSheet(sheetId) {
    const sheet = document.getElementById(sheetId);
    if (!sheet) return;
    sheet.classList.remove('hidden');
    if (sheetId === 'notification-settings-sheet') refreshNotificationSettingsUi();
    if (sheetId === 'my-orders-sheet') loadMyOrdersList();
  }
  function closeBottomSheet(sheetId) {
    const sheet = document.getElementById(sheetId);
    if (sheet) sheet.classList.add('hidden');
  }

  // ============================================================
  // ✅ প্রোফাইল প্রাইভেসি — public_profiles-এ profilePrivacy ফিল্ড
  // ============================================================
  async function _loadProfilePrivacyToggle() {
    const toggle = document.getElementById('profile-privacy-toggle');
    if (!toggle || !currentUser) return;
    try {
      const doc = await firestore.collection('public_profiles').doc(currentUser.uid).get();
      if (doc.exists) {
        toggle.checked = doc.data().profilePrivacy === 'public';
      } else {
        toggle.checked = false;
      }
    } catch(e) {
      toggle.checked = false;
    }
  }

  // ============================================================
  // ✅ BIO — লোড ও সেভ
  // ============================================================
  async function _loadProfileBio() {
    const bioEl = document.getElementById('profile-bio');
    const countEl = document.getElementById('profile-bio-count');
    if (!bioEl || !currentUser) return;
    try {
      const doc = await firestore.collection('public_profiles').doc(currentUser.uid).get();
      if (doc.exists && doc.data().bio) {
        bioEl.value = doc.data().bio;
        if (countEl) countEl.textContent = doc.data().bio.length;
      }
    } catch(e) {}
  }

  async function saveProfilePrivacy(isPublic) {
    if (!currentUser) return;
    const toggle = document.getElementById('profile-privacy-toggle');
    try {
      await firestore.collection('public_profiles').doc(currentUser.uid).set({
        profilePrivacy: isPublic ? 'public' : 'private',
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
      showCartToast(isPublic ? 'প্রোফাইল সর্বজনীন করা হয়েছে ✅' : 'প্রোফাইল প্রাইভেট করা হয়েছে 🔒', 'success');
    } catch(e) {
      showCartToast('সেটিং সেভ ব্যর্থ: ' + e.message, 'error');
      if (toggle) toggle.checked = !isPublic; // রোলব্যাক
    }
  }

  // ============================================================
  // ✅ [FIX #3] প্রোফাইল ডেটা — Firestore-এ সেভ
  // ============================================================
  async function saveProfileData() {
    const name = document.getElementById('profile-name')?.value.trim() || '';
    const phone = document.getElementById('profile-phone')?.value.trim() || '';
    const address = document.getElementById('profile-address')?.value.trim() || '';
    const bio = (document.getElementById('profile-bio')?.value.trim() || '').substring(0, 150);
    if (!name) { alert('অনুগ্রহ করে অন্তত আপনার নাম প্রদান করুন।'); return; }

    const profileData = {
      name, phone, address,
      selfieBase64: base64SelfieString, nidBase64: base64NidString,
      isVerified: isMobileNumberVerified,
      latitude: lastTrackedLat, longitude: lastTrackedLng
    };

    // localStorage-এ সেভ (অফলাইনের জন্য)
    localStorage.setItem('user_profile_data', JSON.stringify(profileData));

    // Firestore-এ সেভ (লগইন থাকলে)
    if (currentUser) {
      try {
        await firestore.collection("users").doc(currentUser.uid).update({
          displayName: name, phone, address, isVerified: isMobileNumberVerified,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        // ✅ [FIX] public_profiles — প্রথমবার create হলে সব required+hasOnly field দাও
        const pubRef = firestore.collection('public_profiles').doc(currentUser.uid);
        const pubSnap = await pubRef.get();
        if (!pubSnap.exists) {
          await pubRef.set({
            uid: currentUser.uid,
            name,
            photo: currentUser.photoURL || '',
            role: currentUserRole || 'customer',
            bio,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
          });
        } else {
          await pubRef.set({
            name,
            bio,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
          }, { merge: true });
        }
      } catch(e) { console.error("Profile update error:", e); }
    }

    document.getElementById('profile-display-name').innerText = name;
    if (isMobileNumberVerified) markProfileUiAsFullyVerified();
    alert('কাস্টমার তথ্য সেভ হয়েছে!');
    autoFillCheckoutForm();
    closeProfile();
  }

  function markProfileUiAsFullyVerified() {
    const label = document.getElementById('verification-status-label');
    const badge = document.getElementById('profile-verification-badge');
    if (label) {
      label.innerText = "সিকিউরিটি লেভেল: ১০০% ভেরিফাইড ⚡";
      label.classList.remove('bg-slate-500/20', 'text-slate-300');
      label.classList.add('bg-emerald-500/20', 'text-emerald-300');
    }
    if (badge) {
      badge.innerHTML = "<i class='fas fa-check'></i>";
      badge.classList.remove('bg-slate-500');
      badge.classList.add('bg-emerald-500');
    }
    // ✅ ভেরিফাইড হয়ে গেলে আর তথ্যের ফর্মটি জুড়ে থাকার দরকার নেই — গুটিয়ে রাখো
    toggleProfileVerifySection(false);
  }

  // ✅ প্রোফাইল ভেরিফিকেশন আকর্ডিয়ন খোলা/বন্ধ করো (forceState দিলে সরাসরি ওই অবস্থায় সেট হবে)
  function toggleProfileVerifySection(forceState) {
    const content = document.getElementById('profile-verify-section-content');
    const chevron = document.getElementById('profile-verify-chevron');
    if (!content) return;
    const willOpen = forceState !== undefined ? forceState : content.classList.contains('hidden');
    content.classList.toggle('hidden', !willOpen);
    if (chevron) chevron.style.transform = willOpen ? 'rotate(180deg)' : 'rotate(0deg)';
  }

  // ============================================================
  // ✅ Google Login দিয়ে ভেরিফিকেশন (OTP এর পরিবর্তে)
  // ============================================================

  // Google লগইন হলে স্বয়ংক্রিয়ভাবে ভেরিফাইড হবে
  function updateGoogleVerifyUI(user) {
    const nameEl   = document.getElementById('google-verify-name');
    const emailEl  = document.getElementById('google-verify-email');
    const badgeEl  = document.getElementById('google-verify-badge');
    const avatarEl = document.getElementById('google-verify-avatar');
    const headerNameEl  = document.getElementById('profile-display-name');
    const headerEmailEl = document.getElementById('profile-email-display');
    if (!nameEl) return;

    if (user) {
      isMobileNumberVerified = true; // Google লগইন মানেই ভেরিফাইড
      if (nameEl)  nameEl.innerText  = user.displayName || 'Google ইউজার';
      if (emailEl) emailEl.innerText = user.email || '';
      if (headerNameEl)  headerNameEl.innerText  = user.displayName || 'কাস্টমার';
      if (headerEmailEl) headerEmailEl.innerText = user.email || '';
      if (badgeEl) {
        badgeEl.innerText   = '✅ ভেরিফাইড';
        badgeEl.className   = 'text-[9px] font-black px-2 py-1 rounded-full border bg-emerald-100 text-emerald-700 border-emerald-300';
      }
      if (avatarEl && user.photoURL) {
        avatarEl.innerHTML = `<img src="${user.photoURL}" class="w-full h-full object-cover rounded-full"/>`;
      }
      markProfileUiAsFullyVerified();
    } else {
      isMobileNumberVerified = false;
      if (nameEl)  nameEl.innerText  = 'লগইন করা হয়নি';
      if (emailEl) emailEl.innerText = 'Google দিয়ে লগইন করলে স্বয়ংক্রিয়ভাবে ভেরিফাইড হবে';
      if (badgeEl) {
        badgeEl.innerText = '⚠️ আন-ভেরিফাইড';
        badgeEl.className = 'text-[9px] font-black px-2 py-1 rounded-full border bg-amber-50 text-amber-700 border-amber-200';
      }
    }
  }

  // ============================================================
  // ✅ লয়ালটি পয়েন্ট ও রেফারেল কোড — প্রোফাইল UI আপডেট
  // ============================================================
  function updateLoyaltyAndReferralUI() {
    const pointsEl = document.getElementById('profile-loyalty-points');
    const codeEl   = document.getElementById('profile-referral-code');
    const countEl  = document.getElementById('profile-referral-count');
    if (pointsEl) pointsEl.innerText = userLoyaltyPoints.toLocaleString('bn-BD');
    if (codeEl)   codeEl.innerText   = userReferralCode || '...';
    if (countEl)  countEl.innerText  = userReferralCount.toLocaleString('bn-BD');
  }

  function shareReferralCode() {
    if (!userReferralCode) { alert('লগইন করুন প্রথমে!'); return; }
    const link = `${window.location.origin}${window.location.pathname}?ref=${userReferralCode}`;
    const shareText = `আমার রেফারেল কোড "${userReferralCode}" দিয়ে BD BIG BAZZAR-এ প্রথম অর্ডার করুন এবং দুজনেই ৫০ বোনাস পয়েন্ট জিতুন! ${link}`;

    if (navigator.share) {
      navigator.share({ title: 'BD BIG BAZZAR', text: shareText }).catch(() => {});
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(shareText).then(() => alert('✅ রেফারেল লিংক কপি হয়েছে! বন্ধুদের পাঠান।'));
    } else {
      alert(shareText);
    }
  }

  // ============================================================
  // ✅ NEW (feature-44): প্রোফাইল ব্যালেন্স ও উইথড্রো সিস্টেম
  // ============================================================
  function updateBalanceUI() {
    const amountText = '৳' + (userBalance || 0).toLocaleString('bn-BD');
    const headerEl = document.getElementById('profile-balance-amount');
    const sheetEl  = document.getElementById('balance-sheet-amount');
    if (headerEl) headerEl.innerText = amountText;
    if (sheetEl)  sheetEl.innerText  = amountText;
  }

  function openBalanceWithdrawSheet() {
    if (!currentUser) { alert('উইথড্র করতে লগইন করুন প্রথমে!'); return; }
    updateBalanceUI();
    openBottomSheet('balance-withdraw-sheet');
    loadWithdrawHistory();
  }

  // নিজের উইথড্রো অনুরোধের হিস্টরি লোড করো (সর্বশেষ ২০টি)
  async function loadWithdrawHistory() {
    const listEl  = document.getElementById('withdraw-history-list');
    const emptyEl = document.getElementById('withdraw-history-empty');
    if (!listEl || !currentUser) return;
    try {
      const snap = await firebase.firestore().collection('withdrawals')
        .where('uid', '==', currentUser.uid)
        .orderBy('createdAt', 'desc')
        .limit(20)
        .get();
      if (snap.empty) {
        listEl.innerHTML = `<p class='text-[10px] text-slate-400 text-center py-3' id='withdraw-history-empty'>কোনো উইথড্র অনুরোধ নেই</p>`;
        return;
      }
      const statusMap = {
        pending:  { label: 'অপেক্ষমাণ',  cls: 'bg-amber-50 text-amber-700 border-amber-200' },
        approved: { label: 'প্রদান সম্পন্ন', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
        rejected: { label: 'বাতিল',       cls: 'bg-rose-50 text-rose-700 border-rose-200' }
      };
      listEl.innerHTML = snap.docs.map(doc => {
        const d = doc.data();
        const st = statusMap[d.status] || statusMap.pending;
        const dateStr = d.createdAt && d.createdAt.toDate ? d.createdAt.toDate().toLocaleDateString('bn-BD') : '';
        return `
          <div class='bg-white border border-slate-200 rounded-xl p-3 flex items-center justify-between gap-2'>
            <div>
              <p class='text-xs font-black text-slate-800'>৳${(d.amount || 0).toLocaleString('bn-BD')} — ${escapeHtml(d.method || '')}</p>
              <p class='text-[9px] text-slate-400 mt-0.5'>${escapeHtml(d.accountNumber || '')} • ${dateStr}</p>
            </div>
            <span class='text-[9px] font-black px-2 py-1 rounded-full border shrink-0 ${st.cls}'>${st.label}</span>
          </div>`;
      }).join('');
    } catch (e) {
      console.error('Withdraw history load error:', e);
      listEl.innerHTML = `<p class='text-[10px] text-rose-400 text-center py-3'>হিস্টরি লোড করা যায়নি</p>`;
    }
  }

  // ============================================================
  // ✅ NEW (feature-47): Admin উইথড্রো ম্যানেজমেন্ট — পেন্ডিং রিকোয়েস্ট দেখা, অ্যাপ্রুভ/রিজেক্ট
  // ============================================================
  async function loadAdminWithdrawRequests() {
    if (!currentUser || !ADMIN_EMAILS.includes(currentUser.email)) return;
    const listEl  = document.getElementById('admin-withdraw-list');
    const badgeEl = document.getElementById('admin-withdraw-badge');
    if (!listEl) return;
    try {
      const snap = await firebase.firestore().collection('withdrawals')
        .where('status', '==', 'pending')
        .orderBy('createdAt', 'desc')
        .limit(50)
        .get();
      if (badgeEl) badgeEl.innerText = snap.size.toLocaleString('bn-BD');
      if (snap.empty) {
        listEl.innerHTML = `<div class='text-center py-5 text-slate-400 text-xs'><i class='fas fa-circle-check text-xl text-slate-200 mb-1 block'></i><span id='no-pending-withdraw-label'>কোনো অপেক্ষমাণ উইথড্রো নেই</span></div>`;
        return;
      }
      listEl.innerHTML = snap.docs.map(doc => {
        const d = doc.data();
        const dateStr = d.createdAt && d.createdAt.toDate ? d.createdAt.toDate().toLocaleDateString('bn-BD') : '';
        return `
          <div class='bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2'>
            <div class='flex items-center justify-between'>
              <p class='text-xs font-black text-slate-800'>${escapeHtml(d.userName || 'ইউজার')}</p>
              <p class='text-sm font-black text-emerald-600'>৳${(d.amount || 0).toLocaleString('bn-BD')}</p>
            </div>
            <p class='text-[10px] text-slate-500'>${escapeHtml(d.method || '')} — ${escapeHtml(d.accountNumber || '')}</p>
            <p class='text-[9px] text-slate-400'>${escapeHtml(d.userEmail || '')} • ${dateStr}</p>
            <div class='flex gap-2 pt-1'>
              <button onclick="approveWithdrawRequest('${doc.id}')" class='flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black py-2 rounded-lg active:scale-95 transition'><i class="fas fa-check"></i> অ্যাপ্রুভ</button>
              <button onclick="rejectWithdrawRequest('${doc.id}', '${d.uid}', ${d.amount || 0})" class='flex-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-[10px] font-black py-2 rounded-lg active:scale-95 transition'><i class="fas fa-xmark"></i> রিজেক্ট ও ফেরত</button>
            </div>
          </div>`;
      }).join('');
    } catch (e) {
      console.error('Admin withdraw list load error:', e);
      listEl.innerHTML = `<p class='text-[10px] text-rose-400 text-center py-3'>লোড করা যায়নি — Firebase Rules/Index চেক করুন</p>`;
    }
  }

  // অ্যাপ্রুভ — টাকা ইতিমধ্যে ইউজারের ব্যালেন্স থেকে কাটা হয়ে গিয়েছিল, এখানে শুধু স্ট্যাটাস আপডেট হয়
  async function approveWithdrawRequest(withdrawId) {
    if (!currentUser || !ADMIN_EMAILS.includes(currentUser.email)) return;
    if (!confirm('টাকা পাঠানো হয়ে গেছে নিশ্চিত? অ্যাপ্রুভ করলে এই অনুরোধ "প্রদান সম্পন্ন" হিসেবে চিহ্নিত হবে।')) return;
    try {
      await firebase.firestore().collection('withdrawals').doc(withdrawId).update({
        status: 'approved',
        processedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      loadAdminWithdrawRequests();
    } catch (e) {
      console.error('Approve withdraw error:', e);
      alert('অ্যাপ্রুভ করা যায়নি। আবার চেষ্টা করুন।');
    }
  }

  // রিজেক্ট — কেটে নেওয়া টাকা স্বয়ংক্রিয়ভাবে ইউজারের ব্যালেন্সে ফেরত যাবে
  async function rejectWithdrawRequest(withdrawId, uid, amount) {
    if (!currentUser || !ADMIN_EMAILS.includes(currentUser.email)) return;
    if (!confirm(`এই অনুরোধ রিজেক্ট করলে ৳${(amount || 0).toLocaleString('bn-BD')} টাকা ইউজারের ব্যালেন্সে ফেরত যাবে। নিশ্চিত?`)) return;
    try {
      const db = firebase.firestore();
      const batch = db.batch();
      batch.update(db.collection('withdrawals').doc(withdrawId), {
        status: 'rejected',
        processedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      batch.set(db.collection('users').doc(uid), {
        balance: firebase.firestore.FieldValue.increment(amount || 0)
      }, { merge: true });
      await batch.commit();

      // নিজের রিকোয়েস্ট নিজে রিজেক্ট করলে (টেস্টিং কেস) লোকাল UI-ও আপডেট করো
      if (currentUser.uid === uid) {
        userBalance += (amount || 0);
        updateBalanceUI();
      }
      loadAdminWithdrawRequests();
    } catch (e) {
      console.error('Reject withdraw error:', e);
      alert('রিজেক্ট করা যায়নি। আবার চেষ্টা করুন।');
    }
  }

  // নতুন উইথড্রো অনুরোধ জমা দাও — অ্যাডমিন অনুমোদনের জন্য 'pending' স্ট্যাটাসে যায়
  async function submitWithdrawRequest() {
    if (!currentUser) { alert('লগইন করুন প্রথমে!'); return; }
    const amountInput  = document.getElementById('withdraw-amount-input');
    const methodSelect = document.getElementById('withdraw-method-select');
    const accountInput = document.getElementById('withdraw-account-input');
    const btn = document.getElementById('withdraw-submit-btn');

    const amount = parseFloat(amountInput?.value || '0');
    const method = methodSelect?.value || 'bKash';
    const accountNumber = (accountInput?.value || '').trim();

    if (!amount || amount < 50) { alert('সর্বনিম্ন ৫০ টাকা উইথড্রো করা যাবে।'); return; }
    if (amount > userBalance) { alert('আপনার ব্যালেন্সে পর্যাপ্ত টাকা নেই।'); return; }
    if (!accountNumber) { alert('একাউন্ট নাম্বার লিখুন।'); return; }

    try {
      if (btn) { btn.disabled = true; btn.classList.add('opacity-50'); }
      const db = firebase.firestore();
      const withdrawRef = db.collection('withdrawals').doc();
      const userRef = db.collection('users').doc(currentUser.uid);

      // ✅ NEW (feature-46): অনুরোধ করার সাথে সাথেই ব্যালেন্স থেকে টাকা কেটে নেওয়া হয় (অটোমেটিক),
      // যাতে একই টাকা দুইবার উইথড্রো করা না যায়। batch দিয়ে atomically দুইটা কাজ একসাথে হয়।
      const batch = db.batch();
      batch.set(withdrawRef, {
        uid: currentUser.uid,
        userName: currentUser.displayName || 'ইউজার',
        userEmail: currentUser.email || '',
        amount: amount,
        method: method,
        accountNumber: accountNumber,
        status: 'pending',
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      batch.update(userRef, {
        balance: firebase.firestore.FieldValue.increment(-amount)
      });
      await batch.commit();

      userBalance = Math.max(0, userBalance - amount);
      updateBalanceUI();

      if (amountInput) amountInput.value = '';
      if (accountInput) accountInput.value = '';
      alert('✅ উইথড্রো অনুরোধ পাঠানো হয়েছে! ব্যালেন্স থেকে টাকা কেটে নেওয়া হয়েছে — এডমিন রিভিউ করার পর টাকা পাঠানো হবে।');
      loadWithdrawHistory();
    } catch (e) {
      console.error('Withdraw request error:', e);
      alert('দুঃখিত, অনুরোধ পাঠানো যায়নি। আবার চেষ্টা করুন।');
    } finally {
      if (btn) { btn.disabled = false; btn.classList.remove('opacity-50'); }
    }
  }

  function processCustomerAvatarUpload(input) {
    if (input.files && input.files[0]) {
      const reader = new FileReader();
      reader.onload = function(e) { base64SelfieString = e.target.result; applySelfieToAvatarUi(base64SelfieString); };
      reader.readAsDataURL(input.files[0]);
    }
  }

  function applySelfieToAvatarUi(base64Data) {
    document.getElementById('avatar-placeholder-icon').classList.add('hidden');
    const previewImg = document.getElementById('avatar-preview-img');
    previewImg.src = base64Data; previewImg.classList.remove('hidden');
  }

  function processNidCardUpload(input) {
    if (input.files && input.files[0]) {
      const reader = new FileReader();
      reader.onload = function(e) { base64NidString = e.target.result; applyNidToPreviewUi(base64NidString); };
      reader.readAsDataURL(input.files[0]);
    }
  }

  function applyNidToPreviewUi(base64Data) {
    document.getElementById('nid-upload-ui-box').classList.add('hidden');
    const previewImg = document.getElementById('nid-preview-img');
    previewImg.src = base64Data; previewImg.classList.remove('hidden');
  }

  // ============================================================
  // ✅ লোকেশন ও ম্যাপ
  // ============================================================
  function fetchLiveLocation() {
    const statusText = document.getElementById('geo-status');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        lastTrackedLat = position.coords.latitude;
        lastTrackedLng = position.coords.longitude;
        updateGoogleMapIframe(lastTrackedLat, lastTrackedLng);
        const mapUrl = `http://maps.google.com/?q=${lastTrackedLat},${lastTrackedLng}`;
        let curAddr = document.getElementById('profile-address').value.replace(/📍 লাইভ লোকেশন ম্যাপ লিংক: .*/g, '').trim();
        document.getElementById('profile-address').value = (curAddr ? curAddr + "\n" : "") + `📍 লাইভ লোকেশন ম্যাপ লিংক: ${mapUrl}`;
        statusText.innerText = "লোকেশন সনাক্ত হয়েছে ✅";
      },
      () => { alert('GPS অন করুন!'); }
    );
  }

  function updateGoogleMapIframe(lat, lng) {
    const iframe = document.getElementById('google-map-iframe');
    if (iframe) iframe.src = `https://maps.google.com/maps?q=${lat},${lng}&t=&z=16&ie=UTF8&iwloc=&output=embed`;
  }

  // ============================================================
  // ✅ সেলফি ক্যামেরা
  // ============================================================
  function initiateCameraStream() {
    const video = document.getElementById('webcam-video');
    const container = document.getElementById('camera-stream-container');
    const startBtn = document.getElementById('start-camera-btn');
    navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } })
      .then((stream) => {
        localVideoStreamObject = stream;
        video.srcObject = stream;
        container.classList.remove('hidden');
        startBtn.classList.add('hidden');
      })
      .catch(() => { alert('ক্যামেরা পারমিশন দিন!'); });
  }

  function captureSelfiePhoto() {
    const video = document.getElementById('webcam-video');
    const canvas = document.getElementById('selfie-canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = video.videoWidth || 320;
    canvas.height = video.videoHeight || 240;
    ctx.translate(canvas.width, 0); ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    base64SelfieString = canvas.toDataURL('image/jpeg', 0.7);
    applySelfieToAvatarUi(base64SelfieString);
    stopCameraHardwareStream();
    alert('সেলফি ক্যাপচার হয়েছে!');
  }

  function stopCameraHardwareStream() {
    if (localVideoStreamObject) { localVideoStreamObject.getTracks().forEach(t => t.stop()); localVideoStreamObject = null; }
    const container = document.getElementById('camera-stream-container');
    const startBtn = document.getElementById('start-camera-btn');
    if (container) container.classList.add('hidden');
    if (startBtn) startBtn.classList.remove('hidden');
  }

  // ============================================================
  // ✅ অর্ডার ট্র্যাকিং — Firestore
  // ============================================================
  // ============================================================
  // ✅ [FIX #4] অর্ডার ট্র্যাকিং — ফোন নম্বর mask + লগইন ছাড়া সীমিত তথ্য
  // ============================================================
  // ✅ NEW: "সাম্প্রতিক অর্ডার" — লগইন করা কাস্টমারের নিজের সব অর্ডার লিস্ট আকারে দেখানো,
  // ট্যাপ করলে সরাসরি সেই অর্ডারের টাইমলাইন দেখা যাবে (আইডি হাতে টাইপ করতে হবে না)
  async function loadMyOrdersList() {
    const listDiv = document.getElementById('my-orders-list');
    if (!listDiv) return;

    if (!currentUser) {
      listDiv.innerHTML = `<div class='text-center py-4 text-slate-400 text-xs'><i class='fas fa-lock mr-1'></i> অর্ডার দেখতে আগে লগইন করুন</div>`;
      return;
    }

    listDiv.innerHTML = `<div class='text-center py-4 text-slate-400 text-xs'><i class='fas fa-spinner fa-spin mr-1'></i> লোড হচ্ছে...</div>`;
    try {
      const snap = await firestore.collection('orders')
        .where('customerUid', '==', currentUser.uid)
        .limit(30)
        .get();

      if (snap.empty) {
        listDiv.innerHTML = `<div class='text-center py-4 text-slate-400 text-xs'><i class='fas fa-box-open text-lg text-slate-200 mb-1 block'></i>এখনো কোনো অর্ডার করেননি</div>`;
        return;
      }

      // ✅ Firestore composite index এড়াতে ক্লায়েন্ট-সাইডে সময়ানুযায়ী সাজানো হচ্ছে (নতুন আগে)
      const orders = snap.docs.map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));

      listDiv.innerHTML = orders.map(order => {
        const statusStyle = STATUS_STYLE[order.status] || 'bg-slate-50 text-slate-600 border-slate-200';
        const date = order.createdAt
          ? new Date(order.createdAt.seconds * 1000).toLocaleDateString('bn-BD', { day: 'numeric', month: 'short', year: 'numeric' })
          : 'অজানা';
        const itemCount = (order.items || []).length;
        return `
          <button onclick="viewMyOrderDetail('${order.id}')" class="w-full text-left border border-slate-100 rounded-2xl px-3 py-2.5 flex items-center justify-between gap-2 hover:bg-slate-50 active:scale-[0.98] transition">
            <div class="min-w-0">
              <p class="text-[11px] font-black text-slate-800 truncate">📦 ${itemCount} টি পণ্য · ৳${order.totalAmount}</p>
              <p class="text-[9px] text-slate-400 font-medium mt-0.5">${date}</p>
            </div>
            <span class="shrink-0 text-[9px] font-black px-2 py-1 rounded-full border ${statusStyle}">${order.status}</span>
          </button>`;
      }).join('');
    } catch (e) {
      console.error('loadMyOrdersList error:', e);
      listDiv.innerHTML = `<div class='text-center py-4 text-red-400 text-xs'>অর্ডার লোড করা যায়নি</div>`;
    }
  }

  // ✅ NEW: লিস্ট থেকে অর্ডার ট্যাপ করলে সরাসরি তার টাইমলাইন দেখানো
  function viewMyOrderDetail(orderId) {
    document.getElementById('tracking-id').value = orderId;
    checkOrderStatus();
    document.getElementById('order-status-result')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  async function checkOrderStatus() {
    const trackId   = document.getElementById('tracking-id').value.trim();
    const resultDiv = document.getElementById('order-status-result');
    if (!trackId) { resultDiv.innerHTML = `<span class="text-red-500">দয়া করে একটি অর্ডার বা বুকিং আইডি দিন!</span>`; return; }

    // ✅ Firestore rules অনুযায়ী orders ও service_bookings উভয়েই
    // পড়ার জন্য লগইন বাধ্যতামূলক, তাই লগইন না থাকলে আগেই জানিয়ে দাও
    if (!currentUser) {
      resultDiv.innerHTML = `<span class="text-red-500 font-bold"><i class="fas fa-lock mr-1"></i> অর্ডার বা বুকিং দেখতে আগে লগইন করুন!</span>`;
      return;
    }

    resultDiv.innerHTML = `<span class="text-slate-400"><i class="fas fa-spinner fa-spin mr-1"></i> খোঁজা হচ্ছে...</span>`;
    try {
      // ✅ প্রথমে orders কালেকশনে খোঁজো
      const orderDoc = await firebase.firestore().collection("orders").doc(trackId).get();
      if (orderDoc.exists) {
        renderOrderTrackResult(orderDoc.data());
        return;
      }
    } catch (error) {
      // ✅ rules অনুযায়ী নিজের না হলে permission-denied আসবে — সাইলেন্টলি বুকিং চেক করতে যাও
      if (error.code !== 'permission-denied') {
        resultDiv.innerHTML = `<span class="text-red-500">সার্ভার এরর! আবার চেষ্টা করুন।</span>`;
        console.error("Tracking error (orders):", error);
        return;
      }
    }

    try {
      // ✅ orders-এ না পেলে (বা অ্যাক্সেস না থাকলে) service_bookings কালেকশনে খোঁজো
      const bookingDoc = await firebase.firestore().collection("service_bookings").doc(trackId).get();
      if (bookingDoc.exists) {
        renderBookingTrackResult(bookingDoc.data());
        return;
      }
      resultDiv.innerHTML = `<span class="text-red-500 font-bold">❌ এই ID-তে আপনার কোনো অর্ডার বা বুকিং পাওয়া যায়নি!</span>`;
    } catch (error) {
      if (error.code === 'permission-denied') {
        // ✅ ডকুমেন্ট থাকলেও এটা আপনার নিজের নয়
        resultDiv.innerHTML = `<span class="text-red-500 font-bold">❌ এই ID আপনার অ্যাকাউন্টের সাথে মিলছে না!</span>`;
      } else {
        resultDiv.innerHTML = `<span class="text-red-500">সার্ভার এরর! আবার চেষ্টা করুন।</span>`;
        console.error("Tracking error (bookings):", error);
      }
    }
  }

  // ✅ Feature-28: Order Timeline — redesigned (ছবির স্টাইল)
  function _buildOrderTimeline(status, statusHistory) {
    const steps = [
      { key: 'পেন্ডিং 🕐',  icon: 'fa-clock',         label: 'অর্ডার কনফার্মড',  desc: 'আপনার অর্ডার পাওয়া গেছে' },
      { key: 'প্রসেসিং 🔄', icon: 'fa-box',            label: 'প্যাক ও লেবেল',    desc: 'পণ্য প্যাক করা হচ্ছে' },
      { key: 'শিপড 🚚',      icon: 'fa-person-biking',  label: 'আউট ফর ডেলিভারি', desc: 'রাইডার নিয়ে যাচ্ছেন' },
      { key: 'ডেলিভারড ✅', icon: 'fa-house-circle-check', label: 'ডেলিভারড',     desc: 'আপনার ঠিকানায় পৌঁছে গেছে' },
    ];
    const cancelStep = { key: 'বাতিল ❌', icon: 'fa-circle-xmark', label: 'বাতিল', desc: 'অর্ডার বাতিল হয়েছে' };
    const isCancelled = status === 'বাতিল ❌';
    const displaySteps = isCancelled ? [...steps.slice(0,1), cancelStep] : steps;
    const stepKeys = steps.map(s => s.key);
    const currIdx  = isCancelled ? 1 : Math.max(0, stepKeys.indexOf(status));

    // "Out for delivery" হলে রাইডারের নাম দেখানো
    const shipEntry = (statusHistory || []).find(h => h.status === 'শিপড 🚚');
    const riderName = shipEntry?.rider || null;

    const html = displaySteps.map((step, i) => {
      const done    = isCancelled ? (i === 0) : i < currIdx;
      const active  = isCancelled ? (i === 1) : i === currIdx;
      const isLastDelivered = (!isCancelled) && i === 3;
      const isLastStep = i === displaySteps.length - 1;

      // circle style
      const circleClass = done    ? 'w-8 h-8 rounded-full bg-slate-900 border-2 border-slate-900 flex items-center justify-center shadow-md'
                        : active  ? (isCancelled
                            ? 'w-8 h-8 rounded-full bg-red-500 border-2 border-red-500 flex items-center justify-center shadow-md'
                            : 'w-8 h-8 rounded-full border-[3px] border-slate-900 bg-white flex items-center justify-center shadow-md')
                        :           'w-8 h-8 rounded-full border-2 border-slate-200 bg-white flex items-center justify-center';
      const iconClass  = done ? 'fas fa-check text-white text-[10px]'
                       : active ? (isCancelled ? `fas ${step.icon} text-white text-[10px]` : `fas ${step.icon} text-slate-900 text-[10px]`)
                       : `fas ${step.icon} text-slate-300 text-[10px]`;
      const lineClass  = done ? 'w-0.5 h-8 mt-1 bg-slate-900'
                       : active && !isCancelled && !isLastDelivered ? 'w-0.5 h-8 mt-1 bg-slate-200'
                       : 'w-0.5 h-8 mt-1 bg-slate-100';
      const labelClass = active ? (isCancelled ? 'text-red-600 font-black text-sm' : 'text-slate-900 font-black text-sm')
                       : done ? 'text-slate-700 font-bold text-sm' : 'text-slate-300 text-sm font-semibold';
      const descClass  = active ? 'text-slate-500 text-[11px]' : done ? 'text-slate-400 text-[11px]' : 'text-slate-200 text-[11px]';

      const histEntry = (statusHistory || []).find(h => h.status === step.key);
      const timeStr   = histEntry
        ? new Date(histEntry.at?.seconds * 1000).toLocaleTimeString('bn-BD', {hour:'2-digit', minute:'2-digit'})
        : '';
      const dateStr   = histEntry
        ? new Date(histEntry.at?.seconds * 1000).toLocaleDateString('bn-BD', {day:'numeric', month:'short'})
        : '';

      // রাইডার নাম শুধু শিপড স্টেপে
      const riderTag = (step.key === 'শিপড 🚚' && riderName && (done || active))
        ? `<span class='text-[10px] text-slate-400 mt-0.5 block'>রাইডার: ${escapeHtml(riderName)}</span>` : '';

      // শেষ ডেলিভারড স্টেপে ফটো বক্স (pending state)
      const photoBox = isLastDelivered && !done
        ? `<div class='mt-2 border border-dashed border-slate-200 rounded-xl p-3 text-center'>
            <i class='fas fa-camera text-slate-200 text-lg mb-1 block'></i>
            <p class='text-[9px] text-slate-300'>পণ্য হস্তান্তরের পর ডেলিভারি ফটো এখানে দেখা যাবে</p>
          </div>` : '';

      return `<div class="flex items-start gap-4">
        <div class="flex flex-col items-center shrink-0">
          <div class="${circleClass}">
            <i class="${iconClass}"></i>
          </div>
          ${!isLastStep ? `<div class="${lineClass}"></div>` : ''}
        </div>
        <div class="pb-5 flex-1 min-w-0">
          <div class="flex items-baseline justify-between gap-2">
            <p class="${labelClass}">${step.label}</p>
            ${timeStr ? `<span class='text-[10px] text-slate-400 font-medium shrink-0'>${timeStr}</span>` : ''}
          </div>
          ${step.key !== 'ডেলিভারড ✅' || done ? `<p class="${descClass} mt-0.5">${step.desc}</p>` : ''}
          ${riderTag}
          ${dateStr && (done || active) ? `<p class='text-[9px] text-slate-300 mt-0.5'>${dateStr}</p>` : ''}
          ${photoBox}
        </div>
      </div>`;
    }).join('');

    return `<div class="py-2">${html}</div>`;
  }

  // ✅ অর্ডার ট্র্যাকিং রেজাল্ট রেন্ডার — Feature-28 redesign
  function renderOrderTrackResult(data) {
    const resultDiv = document.getElementById('order-status-result');
    const createdDate = data.createdAt
      ? new Date(data.createdAt.seconds * 1000).toLocaleDateString('bn-BD', {day:'numeric', month:'short', year:'numeric'})
      : 'অজানা';

    const rawPhone = data.customerPhone || '';
    const maskedPhone = rawPhone.length > 4
      ? rawPhone.slice(0, 3) + '****' + rawPhone.slice(-4) : '***';

    // "Arriving today" এস্টিমেট — শিপড হলে দেখাই
    const isShipped    = data.status === 'শিপড 🚚';
    const isDelivered  = data.status === 'ডেলিভারড ✅';
    const isCancelled  = data.status === 'বাতিল ❌';

    const shipEntry = (data.statusHistory || []).find(h => h.status === 'শিপড 🚚');
    const riderName = shipEntry?.rider || null;

    const arrivingBanner = isShipped ? `
      <div class='bg-slate-900 rounded-2xl px-4 py-3 mb-5 flex items-center justify-between'>
        <div>
          <p class='text-slate-400 text-[10px] font-bold uppercase tracking-wide'>আজকেই পৌঁছাবে</p>
          <p class='text-white font-black text-lg mt-0.5'>ডেলিভারি চলছে <span class='text-orange-400'>🚴</span></p>
        </div>
        <div class='w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center'>
          <i class='fas fa-person-biking text-white text-lg'></i>
        </div>
      </div>` : isDelivered ? `
      <div class='bg-emerald-600 rounded-2xl px-4 py-3 mb-5 flex items-center justify-between'>
        <div>
          <p class='text-emerald-200 text-[10px] font-bold uppercase tracking-wide'>ডেলিভারি সম্পন্ন</p>
          <p class='text-white font-black text-base mt-0.5'>পণ্য পৌঁছে গেছে ✅</p>
        </div>
        <div class='w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center'>
          <i class='fas fa-house-circle-check text-white text-lg'></i>
        </div>
      </div>` : isCancelled ? `
      <div class='bg-red-500 rounded-2xl px-4 py-3 mb-5 flex items-center justify-between'>
        <div>
          <p class='text-red-100 text-[10px] font-bold uppercase tracking-wide'>অর্ডার বাতিল</p>
          <p class='text-white font-black text-base mt-0.5'>এই অর্ডারটি বাতিল হয়েছে ❌</p>
        </div>
        <div class='w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center'>
          <i class='fas fa-circle-xmark text-white text-lg'></i>
        </div>
      </div>` : `
      <div class='bg-slate-100 rounded-2xl px-4 py-3 mb-5 flex items-center justify-between'>
        <div>
          <p class='text-slate-400 text-[10px] font-bold uppercase tracking-wide'>অর্ডার আইডি</p>
          <p class='text-slate-800 font-black text-base mt-0.5'>#${(data.id||'').substring(0,10)}</p>
        </div>
        <div class='w-10 h-10 bg-slate-200 rounded-xl flex items-center justify-center'>
          <i class='fas fa-box text-slate-500 text-lg'></i>
        </div>
      </div>`;

    const timeline = _buildOrderTimeline(data.status, data.statusHistory || []);

    const contactBtn = (isShipped && riderName)
      ? `<button onclick='alert("রাইডার: ${escapeHtml(riderName)}")' class='w-full mt-4 bg-slate-900 text-white font-black text-sm py-3.5 rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition'>
          <i class='fas fa-phone'></i> কুরিয়ারের সাথে যোগাযোগ
        </button>` : '';

    resultDiv.innerHTML = `
      <div class="bg-white border border-slate-100 rounded-3xl p-5 mt-1 shadow-sm overflow-hidden">

        ${arrivingBanner}

        <!-- অর্ডার মেটা -->
        <div class='grid grid-cols-2 gap-x-4 gap-y-2 mb-5 pb-4 border-b border-slate-100'>
          <div><p class='text-[9px] text-slate-400 uppercase tracking-wide'>কাস্টমার</p><p class='text-xs font-black text-slate-800'>${escapeHtml(data.customerName)}</p></div>
          <div><p class='text-[9px] text-slate-400 uppercase tracking-wide'>ফোন</p><p class='text-xs font-black text-slate-800'>${escapeHtml(maskedPhone)}</p></div>
          <div><p class='text-[9px] text-slate-400 uppercase tracking-wide'>তারিখ</p><p class='text-xs font-black text-slate-800'>${createdDate}</p></div>
          <div><p class='text-[9px] text-slate-400 uppercase tracking-wide'>মোট</p><p class='text-xs font-black text-orange-500'>৳${data.totalAmount}</p></div>
        </div>

        <!-- টাইমলাইন -->
        <p class='text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3'>ডেলিভারি অগ্রগতি</p>
        ${timeline}

        ${contactBtn}
      </div>`;
  }
  // ✅ বুকিং ট্র্যাকিং রেজাল্ট রেন্ডার
  function renderBookingTrackResult(data) {
    const resultDiv = document.getElementById('order-status-result');
    const createdDate = data.createdAt ? new Date(data.createdAt.seconds * 1000).toLocaleDateString('bn-BD') : 'অজানা';

    const rawPhone = data.customerPhone || '';
    const maskedPhone = rawPhone.length > 4
      ? rawPhone.slice(0, 3) + '****' + rawPhone.slice(-4)
      : '***';

    const typeIcons = { taxi:'fa-taxi', bike:'fa-motorcycle', airbus:'fa-bus', ticket:'fa-ticket', helicopter:'fa-helicopter', airticket:'fa-plane-departure', tourguide:'fa-map-marked-alt', hotel:'fa-hotel', hajj:'fa-kaaba', mobile_repair:'fa-mobile-screen-button', car_repair:'fa-screwdriver-wrench' };
    const icon = typeIcons[data.serviceType] || 'fa-ticket';

    // ✅ Firestore rules অনুযায়ী এখানে পৌঁছানো মানেই ইউজার মালিক/সেলার/অ্যাডমিন,
    // তাই সবসময় সম্পূর্ণ তথ্য দেখানো নিরাপদ
    resultDiv.innerHTML = `
      <div class="bg-white border border-slate-200 rounded-xl p-3 mt-1 text-left space-y-1.5 shadow-sm">
        <p class="text-[11px] font-bold text-slate-700 flex items-center gap-1.5"><i class="fas ${icon} text-blue-500"></i> বুকিং তথ্য — ${escapeHtml(data.serviceName || '')}</p>
        <div class="text-[11px] space-y-1 text-slate-600">
          <p>👤 <span class="font-bold">${escapeHtml(data.customerName)}</span></p>
          <p>📞 ${escapeHtml(maskedPhone)}</p>
          ${data.from && data.to ? `<p>📍 ${escapeHtml(data.from)} → ${escapeHtml(data.to)}</p>` : ''}
          ${data.pickup ? `<p>📍 পিকআপ: ${escapeHtml(data.pickup)}</p>` : ''}
          ${data.destination ? `<p>🎯 গন্তব্য: ${escapeHtml(data.destination)}</p>` : ''}
          ${data.date ? `<p>📅 তারিখ: ${escapeHtml(data.date)} ${escapeHtml(data.time || '')}</p>` : `<p>📅 বুক করা হয়েছে: ${createdDate}</p>`}
          ${data.vehicle ? `<p>🚗 ${escapeHtml(data.vehicle)}</p>` : ''}
          ${data.advanceAmount ? `<p>💰 অ্যাডভান্স: <span class="font-black text-orange-600">৳${data.advanceAmount}</span></p>` : ''}
          ${data.txid ? `<p>🔢 TxID: <span class="font-bold text-emerald-600 select-all">${escapeHtml(data.txid)}</span></p>` : ''}
          <p>স্ট্যাটাস: <span class="font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">${escapeHtml(data.status)}</span></p>
        </div>
      </div>`;
  }

  // ============================================================
  // ✅ সাইড মেনু
  // ============================================================
  function openSideMenu() {
    const o = document.getElementById('side-menu-overlay');
    const m = document.getElementById('side-menu');
    if (o && m) { o.classList.remove('hidden'); setTimeout(() => { m.classList.add('side-menu-open'); }, 10); }
  }

  function closeSideMenu() {
    const o = document.getElementById('side-menu-overlay');
    const m = document.getElementById('side-menu');
    if (o && m) { m.classList.remove('side-menu-open'); setTimeout(() => { o.classList.add('hidden'); }, 350); }
  }

  // ============================================================
  // ✅ টাইপরাইটার
  // ============================================================
  function startTypewriter() {
    const textElement = document.getElementById('typewriter');
    if (!textElement) return;
    // ✅ বাগ ফিক্স: আগে startTypewriter() দুইবার কল হলে (একবার applyLanguage() থেকে,
    // ৫০ms পরে আবার window.onload থেকে) দুইটা আলাদা টাইপিং লুপ একই এলিমেন্টে
    // একসাথে লেখালেখি করতো — তাই টেক্সট অস্বাভাবিক দ্রুত "লাফাচ্ছিল" দেখাতো।
    // এখন নতুন লুপ শুরুর আগে পুরোনোটা ক্লিয়ার করে দেওয়া হচ্ছে।
    if (window._typewriterTimer) { clearTimeout(window._typewriterTimer); window._typewriterTimer = null; }
    textElement.innerText = '';
    // ✅ ভাষা অনুযায়ী phrases নির্বাচন
    const phrases = t('typewriterPhrases') || ["Premium Quality", "Best Price", "Fast Delivery", "Original Products"];
    let phraseIndex = 0, charIndex = 0, isDeleting = false;
    function type() {
      const currentPhrase = phrases[phraseIndex];
      if (isDeleting) { textElement.innerText = currentPhrase.substring(0, charIndex - 1); charIndex--; }
      else { textElement.innerText = currentPhrase.substring(0, charIndex + 1); charIndex++; }
      let typeSpeed = isDeleting ? 50 : 100;
      if (!isDeleting && charIndex === currentPhrase.length) { typeSpeed = 2000; isDeleting = true; }
      else if (isDeleting && charIndex === 0) { isDeleting = false; phraseIndex = (phraseIndex + 1) % phrases.length; }
      window._typewriterTimer = setTimeout(type, typeSpeed);
    }
    type();
  }

  // ============================================================
  // ✅ কাউন্টডাউন টাইমার
  // ============================================================
  function startTimer() {
    const hoursEl = document.getElementById('hours');
    const minutesEl = document.getElementById('minutes');
    const secondsEl = document.getElementById('seconds');
    if (!hoursEl || !minutesEl || !secondsEl) return;
    let expiryTime = localStorage.getItem('expiryTime');
    if (!expiryTime || expiryTime < new Date().getTime()) {
      expiryTime = new Date().getTime() + (24 * 60 * 60 * 1000);
      localStorage.setItem('expiryTime', expiryTime);
    }
    const timer = setInterval(() => {
      const now = new Date().getTime();
      const distance = expiryTime - now;
      if (distance <= 0) {
        clearInterval(timer); localStorage.removeItem('expiryTime');
        hoursEl.innerText = minutesEl.innerText = secondsEl.innerText = "00"; return;
      }
      hoursEl.innerText = String(Math.floor((distance % (1000*60*60*24)) / (1000*60*60))).padStart(2,'0');
      minutesEl.innerText = String(Math.floor((distance % (1000*60*60)) / (1000*60))).padStart(2,'0');
      secondsEl.innerText = String(Math.floor((distance % (1000*60)) / 1000)).padStart(2,'0');
    }, 1000);
  }

  // ============================================================
  // ✅ সেলার অর্ডার ম্যানেজমেন্ট — Firestore রিয়েল-টাইম
  // ============================================================
  let allOrdersCache = [];
  let currentOrderFilter = 'all';

  const STATUS_STYLE = {
    'পেন্ডিং 🕐':   'bg-amber-50 text-amber-700 border-amber-200',
    'প্রসেসিং 🔄':  'bg-blue-50 text-blue-700 border-blue-200',
    'ডেলিভারড ✅':  'bg-emerald-50 text-emerald-700 border-emerald-200',
    'বাতিল ❌':     'bg-red-50 text-red-700 border-red-200'
  };

  function updateFilterTabsUi(activeFilter) {
    ['all','pending','processing','delivered'].forEach(f => {
      const btn = document.getElementById('filter-' + f);
      if (!btn) return;
      btn.className = f === activeFilter
        ? 'flex-1 text-[10px] font-bold py-1.5 rounded-lg bg-white text-slate-800 shadow transition'
        : 'flex-1 text-[10px] font-bold py-1.5 rounded-lg text-slate-500 transition';
    });
  }

  function renderSellerOrders(orders) {
    const container = document.getElementById('seller-order-list');
    if (!container) return;
    if (orders.length === 0) {
      container.innerHTML = `<div class="text-center py-8 text-slate-400 text-xs font-medium"><i class="fas fa-clipboard-list text-2xl text-slate-200 mb-2 block"></i>কোনো অর্ডার পাওয়া যায়নি!</div>`;
      return;
    }
    container.innerHTML = orders.map(order => {
      const statusStyle = STATUS_STYLE[order.status] || 'bg-slate-50 text-slate-600 border-slate-200';
      const date = order.createdAt ? new Date(order.createdAt.seconds * 1000).toLocaleDateString('bn-BD', { day:'numeric', month:'short', year:'numeric' }) : 'অজানা';
      const itemsSummary = order.items ? order.items.map(i => `${i.name} [${i.size}] ×${i.quantity}`).join(', ') : '—';
      return `
        <div class="border border-slate-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition">
          <div class="bg-slate-50 px-3 py-2 flex items-center justify-between">
            <div>
              <p class="text-[10px] font-black text-slate-800">📋 ${order.id.substring(0,10)}...</p>
              <p class="text-[9px] text-slate-400 font-medium">📅 ${date}</p>
            </div>
            <span class="text-[9px] font-black px-2 py-1 rounded-full border ${statusStyle}">${order.status}</span>
          </div>
          <div class="px-3 py-2 space-y-1 border-b border-slate-100">
            <p class="text-[11px] font-bold text-slate-800 flex items-center gap-1.5">
              <i class="fas fa-user text-orange-400 text-[9px]"></i> ${order.customerName}
              ${order.isVerified ? '<span class="text-emerald-600 text-[9px]">✅ ভেরিফাইড</span>' : '<span class="text-slate-400 text-[9px]">⚠️ আন-ভেরিফাইড</span>'}
            </p>
            <p class="text-[10px] text-slate-500 flex items-center gap-1.5"><i class="fas fa-phone text-slate-300 text-[9px]"></i> ${order.customerPhone}</p>
            <p class="text-[10px] text-slate-500 flex items-start gap-1.5"><i class="fas fa-location-dot text-slate-300 text-[9px] mt-0.5"></i><span class="line-clamp-2">${order.customerAddress}</span></p>
          </div>
          <div class="px-3 py-2 border-b border-slate-100">
            <p class="text-[9px] text-slate-400 font-bold uppercase tracking-wide mb-1">পণ্যসমূহ</p>
            <p class="text-[10px] text-slate-600 font-medium line-clamp-2">${itemsSummary}</p>
          </div>
          <div class="px-3 py-2 flex items-center justify-between">
            <div>
              <p class="text-[9px] text-slate-400 font-medium">পেমেন্ট: <span class="font-bold text-slate-700">${ {bkash:'বিকাশ', nagad:'নগদ', rocket:'রকেট', qr:'QR কোড', emi:'EMI / কিস্তি', cod:'ক্যাশ অন ডেলিভারি'}[order.paymentMethod] || 'ক্যাশ অন ডেলিভারি' }</span></p>
              ${order.txId ? `<p class="text-[9px] text-pink-600 font-bold">TX: ${order.txId}</p>` : ''}
              ${order.emiProvider ? `<p class="text-[9px] text-amber-600 font-bold">EMI: ${order.emiProvider}${order.emiCardNumber ? ' (' + order.emiCardNumber + ')' : ''}</p>` : ''}
            </div>
            <p class="text-sm font-black text-orange-600">৳${order.totalAmount}</p>
          </div>
          <div class="px-3 pb-3 pt-1 flex gap-1.5 flex-wrap">
            <button onclick="updateOrderStatus('${order.id}', 'প্রসেসিং 🔄')" class="text-[9px] font-bold px-2.5 py-1.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition active:scale-95">🔄 প্রসেসিং</button>
            <button onclick="updateOrderStatus('${order.id}', 'ডেলিভারড ✅')" class="text-[9px] font-bold px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition active:scale-95">✅ ডেলিভারড</button>
            <button onclick="updateOrderStatus('${order.id}', 'বাতিল ❌')" class="text-[9px] font-bold px-2.5 py-1.5 rounded-lg bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 transition active:scale-95">❌ বাতিল</button>
          </div>
        </div>`;
    }).join('');
  }

  function initSellerOrderListener() {
    if (!currentUser) return;
    // ✅ FIX (feature-48): আগে 'sellerUid' (single) ফিল্ড দিয়ে কোয়েরি হতো যা অর্ডারে কখনো সেভই হতো না —
    // ফলে সেলার ড্যাশবোর্ডে কোনো অর্ডার দেখাতই না। এখন নতুন 'sellerUids' (array) ফিল্ড দিয়ে কোয়েরি করা হচ্ছে।
    const query = currentUserRole === 'seller' && !ADMIN_EMAILS.includes(currentUser.email)
      ? firebase.firestore().collection("orders").where("sellerUids","array-contains",currentUser.uid)
      : firebase.firestore().collection("orders");
    query.onSnapshot((snapshot) => {
      allOrdersCache = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const pendingCount = allOrdersCache.filter(o => o.status === 'পেন্ডিং 🕐').length;
      const badge = document.getElementById('seller-pending-count');
      if (badge) badge.innerText = pendingCount + ' টি পেন্ডিং';
      applyOrderFilter(currentOrderFilter);
    }, (error) => {
      console.error("Order listener error:", error);
      const container = document.getElementById('seller-order-list');
      if (container) container.innerHTML = `<div class="text-center py-6 text-red-400 text-xs font-medium"><i class="fas fa-exclamation-triangle mb-1 block text-lg"></i>Firebase Rules চেক করুন!</div>`;
    });
  }

  function applyOrderFilter(filter) {
    currentOrderFilter = filter;
    let filtered = allOrdersCache;
    if (filter === 'pending')    filtered = allOrdersCache.filter(o => o.status === 'পেন্ডিং 🕐');
    if (filter === 'processing') filtered = allOrdersCache.filter(o => o.status === 'প্রসেসিং 🔄');
    if (filter === 'delivered')  filtered = allOrdersCache.filter(o => o.status === 'ডেলিভারড ✅');
    renderSellerOrders(filtered);
  }

  function loadSellerOrders(filter) { updateFilterTabsUi(filter); applyOrderFilter(filter); }

  async function updateOrderStatus(orderId, newStatus) {
    try {
      // ✅ NEW (feature-19): statusHistory array — timeline-এ timestamp দেখানোর জন্য
      await firebase.firestore().collection("orders").doc(orderId).update({
        status: newStatus,
        statusHistory: firebase.firestore.FieldValue.arrayUnion({
          status: newStatus,
          at: firebase.firestore.Timestamp.now()
        })
      });

      // ✅ ডেলিভারড হলে কাস্টমারকে লয়ালটি পয়েন্ট দাও (১০০ টাকায় ১ পয়েন্ট)
      if (newStatus === 'ডেলিভারড ✅') {
        const order = allOrdersCache.find(o => o.id === orderId);
        if (order && order.customerUid && !order.pointsAwarded) {
          const earnedPoints = Math.floor((order.totalAmount || 0) / 100);
          if (earnedPoints > 0) {
            await firestore.collection('users').doc(order.customerUid).set({
              loyaltyPoints: firebase.firestore.FieldValue.increment(earnedPoints)
            }, { merge: true });
            await firestore.collection('orders').doc(orderId).set({ pointsAwarded: true }, { merge: true });
            if (currentUser && currentUser.uid === order.customerUid) {
              userLoyaltyPoints += earnedPoints;
              updateLoyaltyAndReferralUI();
            }
          }
        }

        // ✅ FIX (feature-48): আগের কোডে order.sellerUid (যা কখনো সেভ হতো না) চেক করা হতো, তাই
        // সেলারের ব্যালেন্স কখনোই বাড়ত না। এখন order.items থেকে প্রতিটা সেলারের নিজের
        // আইটেমের সাবটোটাল হিসাব করে প্রত্যেককে আলাদাভাবে ক্রেডিট করা হচ্ছে (মাল্টি-ভেন্ডর সাপোর্ট)।
        if (order && Array.isArray(order.items) && !order.sellerBalanceCredited) {
          const perSellerAmount = {}; // { sellerUid: subtotal }
          order.items.forEach(it => {
            const sUid = it.sellerUid;
            if (!sUid || sUid === 'default') return; // ডিফল্ট ক্যাটালগ পণ্যের কোনো রিয়েল সেলার একাউন্ট নেই
            const lineTotal = (it.price || 0) * (it.quantity || 1);
            perSellerAmount[sUid] = (perSellerAmount[sUid] || 0) + lineTotal;
          });
          const sellersToCredit = Object.keys(perSellerAmount);
          const db = firebase.firestore();
          if (sellersToCredit.length > 0) {
            const batch = db.batch();
            sellersToCredit.forEach(sUid => {
              batch.set(db.collection('users').doc(sUid), {
                balance: firebase.firestore.FieldValue.increment(perSellerAmount[sUid])
              }, { merge: true });
            });
            batch.update(db.collection('orders').doc(orderId), { sellerBalanceCredited: true });
            await batch.commit();
            if (currentUser && perSellerAmount[currentUser.uid]) {
              userBalance += perSellerAmount[currentUser.uid];
              updateBalanceUI();
            }
          } else {
            // সব আইটেম ডিফল্ট ক্যাটালগের — কাউকে ক্রেডিট করার নেই, শুধু ফ্ল্যাগ সেট করো যাতে বারবার চেক না হয়
            await db.collection('orders').doc(orderId).set({ sellerBalanceCredited: true }, { merge: true });
          }
        }
      }

      // ✅ NEW (feature-45): অর্ডার বাতিল হলে কাস্টমারের টাকা ব্যালেন্সে ফেরত দাও
      if (newStatus === 'বাতিল ❌') {
        const order = allOrdersCache.find(o => o.id === orderId);
        if (order && order.customerUid && !order.balanceRefunded) {
          const refundAmount = order.totalAmount || 0;
          if (refundAmount > 0) {
            await firestore.collection('users').doc(order.customerUid).set({
              balance: firebase.firestore.FieldValue.increment(refundAmount)
            }, { merge: true });
            await firestore.collection('orders').doc(orderId).set({ balanceRefunded: true }, { merge: true });
            if (currentUser && currentUser.uid === order.customerUid) {
              userBalance += refundAmount;
              updateBalanceUI();
            }
          }
        }
      }
    } catch (error) {
      alert('স্ট্যাটাস আপডেট হয়নি! Firebase Rules চেক করুন।');
      console.error(error);
    }
  }

  // ============================================================
  // ✅ Admin — কুপন ম্যানেজমেন্ট
  // ============================================================
  async function createCoupon() {
    const code           = document.getElementById('new-coupon-code').value.trim().toUpperCase();
    const type           = document.getElementById('new-coupon-type').value;
    const value          = parseFloat(document.getElementById('new-coupon-value').value);
    const minOrderAmount = parseFloat(document.getElementById('new-coupon-min').value) || 0;
    const expiryDate     = document.getElementById('new-coupon-expiry').value || null;
    const usageLimitVal  = document.getElementById('new-coupon-limit').value;
    const usageLimit     = usageLimitVal ? parseInt(usageLimitVal) : null;

    if (!code) { alert('কুপন কোড দিন!'); return; }
    if (!value || isNaN(value) || value <= 0) { alert('সঠিক মূল্য দিন!'); return; }
    if (type === 'percent' && value > 100) { alert('শতাংশ ছাড় ১০০-এর বেশি হতে পারে না!'); return; }

    try {
      await firestore.collection('coupons').doc(code).set({
        code, type, value, minOrderAmount, expiryDate, usageLimit,
        usedCount: 0, isActive: true,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      alert(`✅ কুপন "${code}" তৈরি হয়েছে!`);
      document.getElementById('new-coupon-code').value = '';
      document.getElementById('new-coupon-value').value = '';
      document.getElementById('new-coupon-min').value = '';
      document.getElementById('new-coupon-expiry').value = '';
      document.getElementById('new-coupon-limit').value = '';
      loadAdminCoupons();
    } catch (e) {
      alert('কুপন তৈরি ব্যর্থ হয়েছে: ' + e.message);
      console.error(e);
    }
  }

  async function loadAdminCoupons() {
    const list = document.getElementById('admin-coupon-list');
    if (!list) return;
    list.innerHTML = `<div class='text-center py-3 text-slate-400 text-[10px]'><i class='fas fa-spinner fa-spin mr-1'></i> লোড হচ্ছে...</div>`;
    try {
      const snap = await firestore.collection('coupons').orderBy('createdAt', 'desc').limit(20).get();
      if (snap.empty) {
        list.innerHTML = `<p class='text-[10px] text-slate-400 text-center py-2'>কোনো কুপন তৈরি হয়নি</p>`;
        return;
      }
      list.innerHTML = snap.docs.map(doc => {
        const c = doc.data();
        const valText = c.type === 'percent' ? `${c.value}%` : `৳${c.value}`;
        const isActive = c.isActive !== false;
        return `
          <div class='flex items-center justify-between bg-slate-50 border border-slate-100 rounded-lg px-2.5 py-1.5'>
            <div class='min-w-0'>
              <span class='text-[11px] font-black text-slate-800'>${c.code}</span>
              <span class='text-[10px] text-emerald-600 font-bold ml-1.5'>${valText} ছাড়</span>
              <span class='text-[9px] text-slate-400 ml-1.5 block'>ব্যবহার: ${c.usedCount || 0}${c.usageLimit ? '/' + c.usageLimit : ''}${c.minOrderAmount ? ' • মিনি ৳' + c.minOrderAmount : ''}</span>
            </div>
            <button onclick="toggleCouponActive('${doc.id}', ${!isActive})" class="shrink-0 text-[9px] font-bold px-2 py-1 rounded-lg ${isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'}">${isActive ? 'চালু' : 'বন্ধ'}</button>
          </div>`;
      }).join('');
    } catch (e) {
      list.innerHTML = `<p class='text-[10px] text-red-400 text-center py-2'>কুপন লোড হয়নি</p>`;
      console.error(e);
    }
  }

  async function toggleCouponActive(couponId, newState) {
    try {
      await firestore.collection('coupons').doc(couponId).set({ isActive: newState }, { merge: true });
      loadAdminCoupons();
    } catch (e) {
      alert('আপডেট ব্যর্থ হয়েছে: ' + e.message);
    }
  }


  // ============================================================
  // ✅ সার্ভিস সিস্টেম — ট্যাক্সি, বাইক, এয়ারবাস, টিকিট
  // ============================================================

  let currentServiceType = null;

  // ✅ লাইভ ম্যাপ ও প্রোভাইডার বুকিং সংক্রান্ত স্টেট
  let selectedProvider = null;       // { uid, name, phone, type, distanceKm } — ম্যাপ/তালিকা থেকে বুকিং-এর জন্য বাছাই করা প্রোভাইডার
  let nearbyProvidersUnsub = null;   // রিয়েল-টাইম লিসেনারের unsubscribe ফাংশন
  let customerLiveLocation = null;   // { lat, lng } — কাস্টমারের শেষবার জানা লোকেশন
  let providerListCache = [];        // সর্বশেষ পাওয়া অনলাইন প্রোভাইডারদের ক্যাশে
  let providerWatchId = null;        // সেলার/প্রোভাইডার নিজের লোকেশন ব্রডকাস্ট করার watchPosition id

  const PROVIDER_TYPE_META = {
    taxi:       { icon: 'fa-taxi',            color: 'bg-orange-500' },
    bike:       { icon: 'fa-motorcycle',      color: 'bg-blue-600'   },
    airbus:     { icon: 'fa-bus',             color: 'bg-emerald-600'},
    helicopter: { icon: 'fa-helicopter',      color: 'bg-sky-500'    },
    airticket:  { icon: 'fa-plane-departure', color: 'bg-indigo-600' },
    tourguide:  { icon: 'fa-map-marked-alt',  color: 'bg-green-600'  },
    hotel:      { icon: 'fa-hotel',           color: 'bg-amber-600'  }
  };

  const SERVICE_CONFIG = {
    taxi: {
      title:    'ট্যাক্সি সার্ভিস',
      subtitle: 'AC/Non-AC কার বুকিং',
      icon:     'fas fa-taxi',
      color:    'bg-gradient-to-br from-yellow-400 to-orange-500',
      btnColor: 'bg-gradient-to-r from-yellow-500 to-orange-500 shadow-orange-400/30',
      advanceAmount: 100,
    },
    bike: {
      title:    'বাইক রাইড',
      subtitle: 'দ্রুত ও সাশ্রয়ী যাত্রা',
      icon:     'fas fa-motorcycle',
      color:    'bg-gradient-to-br from-blue-500 to-indigo-600',
      btnColor: 'bg-gradient-to-r from-blue-500 to-indigo-600 shadow-blue-400/30',
      advanceAmount: 50,
    },
    airbus: {
      title:    'এয়ারবাস সার্ভিস',
      subtitle: 'AC বাস • আন্তঃজেলা রুট',
      icon:     'fas fa-bus',
      color:    'bg-gradient-to-br from-emerald-500 to-teal-600',
      btnColor: 'bg-gradient-to-r from-emerald-500 to-teal-600 shadow-emerald-400/30',
      advanceAmount: 150,
    },
    ticket: {
      title:    'টিকিট সার্ভিস',
      subtitle: 'ট্রেন • বাস • লঞ্চ টিকিট',
      icon:     'fas fa-ticket',
      color:    'bg-gradient-to-br from-violet-500 to-purple-700',
      btnColor: 'bg-gradient-to-r from-violet-500 to-purple-700 shadow-violet-400/30',
      advanceAmount: 100,
    },
    helicopter: {
      title:    'চপার / হেলিকপ্টার সার্ভিস',
      subtitle: 'VIP • মেডিকেল • কর্পোরেট ট্রান্সফার',
      icon:     'fas fa-helicopter',
      color:    'bg-gradient-to-br from-sky-400 to-cyan-600',
      btnColor: 'bg-gradient-to-r from-sky-400 to-cyan-600 shadow-sky-400/30',
      advanceAmount: 5000,
    },
    airticket: {
      title:    'বিমানের টিকিট বুকিং',
      subtitle: 'দেশীয় ও আন্তর্জাতিক ফ্লাইট',
      icon:     'fas fa-plane-departure',
      color:    'bg-gradient-to-br from-blue-500 to-indigo-700',
      btnColor: 'bg-gradient-to-r from-blue-500 to-indigo-700 shadow-blue-400/30',
      advanceAmount: 1000,
    },
    tourguide: {
      title:    'ট্যুর গাইড সার্ভিস',
      subtitle: 'কাস্টম প্যাকেজ • দেশ-বিদেশ',
      icon:     'fas fa-map-marked-alt',
      color:    'bg-gradient-to-br from-emerald-400 to-green-600',
      btnColor: 'bg-gradient-to-r from-emerald-400 to-green-600 shadow-emerald-400/30',
      advanceAmount: 500,
    },
    hotel: {
      title:    'হোটেল বুকিং',
      subtitle: 'দেশ-বিদেশে সেরা হোটেল',
      icon:     'fas fa-hotel',
      color:    'bg-gradient-to-br from-amber-500 to-orange-600',
      btnColor: 'bg-gradient-to-r from-amber-500 to-orange-600 shadow-amber-400/30',
      advanceAmount: 500,
    },
    hajj: {
      title:    'হজ্ব ও ওমরাহ সার্ভিস',
      subtitle: 'প্যাকেজ • ভিসা • গাইড',
      icon:     'fas fa-kaaba',
      color:    'bg-gradient-to-br from-teal-500 to-green-700',
      btnColor: 'bg-gradient-to-r from-teal-500 to-green-700 shadow-teal-400/30',
      advanceAmount: 2000,
    },
    mobile_repair: {
      title:    'মোবাইল সার্ভিসিং',
      subtitle: 'স্ক্রিন • ব্যাটারি • যেকোনো মেরামত',
      icon:     'fas fa-mobile-screen-button',
      color:    'bg-gradient-to-br from-rose-500 to-pink-700',
      btnColor: 'bg-gradient-to-r from-rose-500 to-pink-700 shadow-rose-400/30',
      advanceAmount: 100,
    },
    car_repair: {
      title:    'গাড়ি সার্ভিসিং',
      subtitle: 'ইঞ্জিন • তেল পরিবর্তন • যেকোনো মেরামত',
      icon:     'fas fa-screwdriver-wrench',
      color:    'bg-gradient-to-br from-slate-600 to-slate-800',
      btnColor: 'bg-gradient-to-r from-slate-600 to-slate-800 shadow-slate-600/30',
      advanceAmount: 200,
    },
  };

  // বাংলাদেশের জেলাসমূহ
  const BD_DISTRICTS = ['ঢাকা','চট্টগ্রাম','সিলেট','রাজশাহী','খুলনা','বরিশাল','ময়মনসিংহ','রংপুর','কুমিল্লা','নারায়ণগঞ্জ','গাজীপুর','টাঙ্গাইল','ফরিদপুর','যশোর','নোয়াখালী','বগুড়া','পাবনা','দিনাজপুর','কক্সবাজার','সাভার'];

  const districtOptions = BD_DISTRICTS.map(d => `<option value="${d}">${d}</option>`).join('');

  // ✅ মূল্য ও অ্যাডভান্স পেমেন্ট সেকশন — সব সার্ভিসে যোগ হবে
  const SERVICE_PRICING = {
    taxi:       { range: '৳৩০০ – ৳১,৫০০',  note: 'দূরত্ব ও গাড়ির ধরনের উপর নির্ভর করে' },
    bike:       { range: '৳৫০ – ৳৩০০',    note: 'দূরত্ব ও সময়ের উপর নির্ভর করে' },
    airbus:     { range: '৳৩০০ – ৳৮০০',   note: 'রুট ও আসন শ্রেণী অনুযায়ী' },
    ticket:     { range: '৳১৫০ – ৳১,২০০', note: 'মাধ্যম ও শ্রেণী অনুযায়ী' },
    helicopter: { range: '৳৮,০০০+',       note: 'রুট, উদ্দেশ্য ও সময় অনুযায়ী কোটেশন দেওয়া হবে' },
    airticket:  { range: '৳৪,৫০০ – ৳৮০,০০০', note: 'গন্তব্য, ক্লাস ও তারিখ অনুযায়ী' },
    tourguide:  { range: '৳২,৫০০ – ৳৩০,০০০', note: 'গন্তব্য, দিন ও যাত্রী সংখ্যা অনুযায়ী' },
    hotel:      { range: '৳৮০০ – ৳১৫,০০০', note: 'শহর, রুমের ধরন ও রাত সংখ্যা অনুযায়ী' },
    hajj:       { range: '৳৮০,০০০ – ৳২,৫০,০০০', note: 'প্যাকেজ ও যাত্রী সংখ্যা অনুযায়ী' },
    mobile_repair: { range: '৳১৫০ – ৳৩,০০০',   note: 'মডেল ও সমস্যার ধরন অনুযায়ী চার্জ নির্ধারিত হবে' },
    car_repair:    { range: '৳৫০০ – ৳১৫,০০০',  note: 'গাড়ির ধরন ও সমস্যার ধরন অনুযায়ী চার্জ নির্ধারিত হবে' },
  };

  function getPricingSection(type) {
    const cfg     = SERVICE_CONFIG[type];
    const pricing = SERVICE_PRICING[type] || { range: 'যোগাযোগ করুন', note: 'বিস্তারিত জানতে কল করুন' };
    const bkash   = PAYMENT_CONFIG?.bkash?.number  || '';
    const nagad   = PAYMENT_CONFIG?.nagad?.number  || '';
    const rocket  = PAYMENT_CONFIG?.rocket?.number || '';
    const advance = cfg?.advanceAmount || 0;

    return `
      <!-- ✅ মূল্য ইনফো কার্ড -->
      <div class='bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-4 space-y-2'>
        <p class='text-[10px] font-black text-slate-400 uppercase tracking-wide'>💰 আনুমানিক মূল্য</p>
        <p class='text-xl font-black text-white'>${pricing.range}</p>
        <p class='text-[10px] text-slate-400'>${pricing.note}</p>
        <div class='border-t border-white/10 pt-2 mt-1'>
          <p class='text-[10px] text-amber-400 font-bold'>⚠️ বুকিং নিশ্চিত করতে ৳${advance} অ্যাডভান্স পাঠান</p>
          <p class='text-[10px] text-slate-400 mt-0.5'>বাকি টাকা সার্ভিস প্রদানের সময় পরিশোধ করুন</p>
        </div>
      </div>

      <!-- ✅ পেমেন্ট সেকশন -->
      <div class='bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3'>
        <p class='text-[10px] font-black text-slate-500 uppercase tracking-wide'>💳 অ্যাডভান্স পেমেন্ট পাঠান</p>

        <!-- bKash -->
        <div class='bg-pink-50 border border-pink-100 rounded-xl p-3 space-y-1.5'>
          <p class='text-xs font-bold text-pink-600 flex items-center gap-1.5'>🟣 বিকাশ (bKash) — Send Money</p>
          <p class='text-base font-black text-pink-700 select-all tracking-wider'>${bkash}</p>
          <p class='text-[10px] text-pink-500'>পরিমাণ: <span class='font-bold'>৳${advance}</span> • রেফারেন্স: আপনার নাম</p>
        </div>

        <!-- Nagad -->
        <div class='bg-orange-50 border border-orange-100 rounded-xl p-3 space-y-1.5'>
          <p class='text-xs font-bold text-orange-600 flex items-center gap-1.5'>🟠 নগদ (Nagad) — Send Money</p>
          <p class='text-base font-black text-orange-700 select-all tracking-wider'>${nagad}</p>
          <p class='text-[10px] text-orange-500'>পরিমাণ: <span class='font-bold'>৳${advance}</span> • রেফারেন্স: আপনার নাম</p>
        </div>

        <!-- Rocket -->
        <div class='bg-blue-50 border border-blue-100 rounded-xl p-3 space-y-1.5'>
          <p class='text-xs font-bold text-blue-600 flex items-center gap-1.5'>🔵 রকেট (Rocket) — Send Money</p>
          <p class='text-base font-black text-blue-700 select-all tracking-wider'>${rocket}</p>
          <p class='text-[10px] text-blue-500'>পরিমাণ: <span class='font-bold'>৳${advance}</span> • রেফারেন্স: আপনার নাম</p>
        </div>

        <!-- ট্রানজেকশন ID ইনপুট -->
        <div>
          <label class='text-xs font-bold text-slate-600 block mb-1'>🔢 ট্রানজেকশন আইডি *</label>
          <input id='svc-txid' class='w-full border border-slate-200 bg-white rounded-xl p-2.5 text-xs focus:outline-none focus:border-orange-500 uppercase tracking-wider font-bold' placeholder='bKash/Nagad/Rocket Transaction ID'/>
          <p class='text-[10px] text-slate-400 mt-1'>পেমেন্ট পাঠানোর পর ট্রানজেকশন ID এখানে লিখুন</p>
        </div>
      </div>`;
  }

  // ✅ ফর্ম টেমপ্লেট
  function getServiceForm(type) {
    const locationSection = `
      <div class='space-y-1'>
        <label class='text-xs font-bold text-slate-600'>📍 পিকআপ লোকেশন *</label>
        <div class='flex gap-2'>
          <input id='svc-pickup' class='flex-1 border border-slate-200 bg-slate-50 rounded-xl p-2.5 text-xs focus:outline-none focus:border-orange-500' placeholder='পিকআপ ঠিকানা লিখুন'/>
          <button onclick='fetchServiceLocation("pickup")' class='bg-slate-900 text-white text-[10px] font-bold px-3 rounded-xl'>
            <i class='fas fa-location-crosshairs'></i>
          </button>
        </div>
      </div>
      <div class='w-full h-28 rounded-xl overflow-hidden border border-slate-200'>
        <iframe id='svc-map' class='w-full h-full border-0' src='https://maps.google.com/maps?q=Dhaka+Bangladesh&t=&z=12&ie=UTF8&iwloc=&output=embed'></iframe>
      </div>`;

    if (type === 'taxi' || type === 'bike') {
      return `
        <div class='bg-slate-50 border border-slate-200 rounded-2xl p-3 space-y-3'>
          <p class='text-[10px] font-bold text-slate-500 uppercase tracking-wide'>${type === 'taxi' ? '🚕 গাড়ির ধরন' : '🏍️ রাইড তথ্য'}</p>
          ${type === 'taxi' ? `
          <div class='grid grid-cols-2 gap-2'>
            <button onclick='selectVehicle(this,"ac")' class='vehicle-btn border-2 border-slate-200 rounded-xl p-2.5 text-center text-xs font-bold text-slate-600 hover:border-orange-400 transition'>
              <i class='fas fa-snowflake text-blue-400 block mb-1'></i> AC কার
            </button>
            <button onclick='selectVehicle(this,"nonac")' class='vehicle-btn border-2 border-slate-200 rounded-xl p-2.5 text-center text-xs font-bold text-slate-600 hover:border-orange-400 transition'>
              <i class='fas fa-car text-slate-500 block mb-1'></i> Non-AC কার
            </button>
            <button onclick='selectVehicle(this,"microbus")' class='vehicle-btn border-2 border-slate-200 rounded-xl p-2.5 text-center text-xs font-bold text-slate-600 hover:border-orange-400 transition'>
              <i class='fas fa-van-shuttle text-slate-500 block mb-1'></i> মাইক্রোবাস
            </button>
            <button onclick='selectVehicle(this,"suv")' class='vehicle-btn border-2 border-slate-200 rounded-xl p-2.5 text-center text-xs font-bold text-slate-600 hover:border-orange-400 transition'>
              <i class='fas fa-truck-pickup text-slate-500 block mb-1'></i> SUV/জিপ
            </button>
          </div>` : `
          <div class='grid grid-cols-2 gap-2'>
            <button onclick='selectVehicle(this,"bike_normal")' class='vehicle-btn border-2 border-slate-200 rounded-xl p-2.5 text-center text-xs font-bold text-slate-600 hover:border-blue-400 transition'>
              <i class='fas fa-motorcycle text-slate-500 block mb-1'></i> সাধারণ বাইক
            </button>
            <button onclick='selectVehicle(this,"bike_electric")' class='vehicle-btn border-2 border-slate-200 rounded-xl p-2.5 text-center text-xs font-bold text-slate-600 hover:border-blue-400 transition'>
              <i class='fas fa-bolt text-yellow-500 block mb-1'></i> ইলেকট্রিক বাইক
            </button>
          </div>`}
          <input type='hidden' id='svc-vehicle'/>
        </div>
        ${locationSection}
        <div class='space-y-1'>
          <label class='text-xs font-bold text-slate-600'>🏁 গন্তব্য *</label>
          <input id='svc-destination' class='w-full border border-slate-200 bg-slate-50 rounded-xl p-2.5 text-xs focus:outline-none focus:border-orange-500' placeholder='গন্তব্য ঠিকানা লিখুন'/>
        </div>
        <div class='grid grid-cols-2 gap-2'>
          <div>
            <label class='text-xs font-bold text-slate-600 block mb-1'>📅 তারিখ *</label>
            <input id='svc-date' type='date' class='w-full border border-slate-200 bg-slate-50 rounded-xl p-2.5 text-xs focus:outline-none'/>
          </div>
          <div>
            <label class='text-xs font-bold text-slate-600 block mb-1'>🕐 সময় *</label>
            <input id='svc-time' type='time' class='w-full border border-slate-200 bg-slate-50 rounded-xl p-2.5 text-xs focus:outline-none'/>
          </div>
        </div>
        <div>
          <label class='text-xs font-bold text-slate-600 block mb-1'>👤 আপনার নাম *</label>
          <input id='svc-name' class='w-full border border-slate-200 bg-slate-50 rounded-xl p-2.5 text-xs focus:outline-none' placeholder='নাম লিখুন'/>
        </div>
        <div>
          <label class='text-xs font-bold text-slate-600 block mb-1'>📞 মোবাইল নম্বর *</label>
          <input id='svc-phone' type='tel' class='w-full border border-slate-200 bg-slate-50 rounded-xl p-2.5 text-xs focus:outline-none' placeholder='01XXXXXXXXX'/>
        </div>
        ${getPricingSection(type)}`;
    }

    if (type === 'airbus') {
      return `
        <div class='bg-slate-50 border border-slate-200 rounded-2xl p-3 space-y-3'>
          <p class='text-[10px] font-bold text-slate-500 uppercase tracking-wide'>🚌 বাস সার্ভিস তথ্য</p>
          <div>
            <label class='text-xs font-bold text-slate-600 block mb-1'>যাত্রার স্থান *</label>
            <select id='svc-from' class='w-full border border-slate-200 bg-white rounded-xl p-2.5 text-xs focus:outline-none'>
              <option value=''>জেলা সিলেক্ট করুন</option>${districtOptions}
            </select>
          </div>
          <div>
            <label class='text-xs font-bold text-slate-600 block mb-1'>গন্তব্য *</label>
            <select id='svc-to' class='w-full border border-slate-200 bg-white rounded-xl p-2.5 text-xs focus:outline-none'>
              <option value=''>জেলা সিলেক্ট করুন</option>${districtOptions}
            </select>
          </div>
          <div class='grid grid-cols-2 gap-2'>
            <button onclick='selectVehicle(this,"ac_bus")' class='vehicle-btn border-2 border-slate-200 rounded-xl p-2.5 text-center text-xs font-bold text-slate-600 hover:border-emerald-400 transition'>
              <i class='fas fa-snowflake text-blue-400 block mb-1'></i> AC বাস
            </button>
            <button onclick='selectVehicle(this,"sleeper_bus")' class='vehicle-btn border-2 border-slate-200 rounded-xl p-2.5 text-center text-xs font-bold text-slate-600 hover:border-emerald-400 transition'>
              <i class='fas fa-bed text-slate-400 block mb-1'></i> স্লিপার বাস
            </button>
          </div>
          <input type='hidden' id='svc-vehicle'/>
        </div>
        ${locationSection}
        <div class='grid grid-cols-2 gap-2'>
          <div>
            <label class='text-xs font-bold text-slate-600 block mb-1'>📅 যাত্রার তারিখ *</label>
            <input id='svc-date' type='date' class='w-full border border-slate-200 bg-slate-50 rounded-xl p-2.5 text-xs focus:outline-none'/>
          </div>
          <div>
            <label class='text-xs font-bold text-slate-600 block mb-1'>👥 যাত্রী সংখ্যা</label>
            <select id='svc-passengers' class='w-full border border-slate-200 bg-white rounded-xl p-2.5 text-xs focus:outline-none'>
              ${[1,2,3,4,5].map(n=>`<option value='${n}'>${n} জন</option>`).join('')}
            </select>
          </div>
        </div>
        <div>
          <label class='text-xs font-bold text-slate-600 block mb-1'>👤 আপনার নাম *</label>
          <input id='svc-name' class='w-full border border-slate-200 bg-slate-50 rounded-xl p-2.5 text-xs focus:outline-none' placeholder='নাম লিখুন'/>
        </div>
        <div>
          <label class='text-xs font-bold text-slate-600 block mb-1'>📞 মোবাইল নম্বর *</label>
          <input id='svc-phone' type='tel' class='w-full border border-slate-200 bg-slate-50 rounded-xl p-2.5 text-xs focus:outline-none' placeholder='01XXXXXXXXX'/>
        </div>
        ${getPricingSection(type)}`;
    }

    if (type === 'ticket') {
      return `
        <div class='bg-slate-50 border border-slate-200 rounded-2xl p-3 space-y-3'>
          <p class='text-[10px] font-bold text-slate-500 uppercase tracking-wide'>🎫 টিকিটের ধরন</p>
          <div class='grid grid-cols-3 gap-2'>
            <button onclick='selectVehicle(this,"train")' class='vehicle-btn border-2 border-slate-200 rounded-xl p-2.5 text-center text-xs font-bold text-slate-600 hover:border-violet-400 transition'>
              <i class='fas fa-train text-slate-500 block mb-1'></i> ট্রেন
            </button>
            <button onclick='selectVehicle(this,"bus_ticket")' class='vehicle-btn border-2 border-slate-200 rounded-xl p-2.5 text-center text-xs font-bold text-slate-600 hover:border-violet-400 transition'>
              <i class='fas fa-bus text-slate-500 block mb-1'></i> বাস
            </button>
            <button onclick='selectVehicle(this,"launch")' class='vehicle-btn border-2 border-slate-200 rounded-xl p-2.5 text-center text-xs font-bold text-slate-600 hover:border-violet-400 transition'>
              <i class='fas fa-ship text-slate-500 block mb-1'></i> লঞ্চ
            </button>
          </div>
          <input type='hidden' id='svc-vehicle'/>
        </div>
        <div class='grid grid-cols-2 gap-2'>
          <div>
            <label class='text-xs font-bold text-slate-600 block mb-1'>যাত্রার স্থান *</label>
            <select id='svc-from' class='w-full border border-slate-200 bg-white rounded-xl p-2.5 text-xs focus:outline-none'>
              <option value=''>সিলেক্ট করুন</option>${districtOptions}
            </select>
          </div>
          <div>
            <label class='text-xs font-bold text-slate-600 block mb-1'>গন্তব্য *</label>
            <select id='svc-to' class='w-full border border-slate-200 bg-white rounded-xl p-2.5 text-xs focus:outline-none'>
              <option value=''>সিলেক্ট করুন</option>${districtOptions}
            </select>
          </div>
        </div>
        <div class='grid grid-cols-2 gap-2'>
          <div>
            <label class='text-xs font-bold text-slate-600 block mb-1'>📅 যাত্রার তারিখ *</label>
            <input id='svc-date' type='date' class='w-full border border-slate-200 bg-slate-50 rounded-xl p-2.5 text-xs focus:outline-none'/>
          </div>
          <div>
            <label class='text-xs font-bold text-slate-600 block mb-1'>🎟️ টিকিট সংখ্যা</label>
            <select id='svc-passengers' class='w-full border border-slate-200 bg-white rounded-xl p-2.5 text-xs focus:outline-none'>
              ${[1,2,3,4,5].map(n=>`<option value='${n}'>${n} টি</option>`).join('')}
            </select>
          </div>
        </div>
        <div class='grid grid-cols-2 gap-2'>
          <div>
            <label class='text-xs font-bold text-slate-600 block mb-1'>আসনের শ্রেণী</label>
            <select id='svc-class' class='w-full border border-slate-200 bg-white rounded-xl p-2.5 text-xs focus:outline-none'>
              <option value='shuvon'>শুভন চেয়ার</option>
              <option value='ac_chair'>AC চেয়ার</option>
              <option value='snigdha'>স্নিগ্ধা</option>
              <option value='cabin'>কেবিন</option>
            </select>
          </div>
          <div>
            <label class='text-xs font-bold text-slate-600 block mb-1'>ভ্রমণের ধরন</label>
            <select id='svc-trip-type' class='w-full border border-slate-200 bg-white rounded-xl p-2.5 text-xs focus:outline-none'>
              <option value='one_way'>এক দিক</option>
              <option value='return'>যাওয়া-আসা</option>
            </select>
          </div>
        </div>
        <div>
          <label class='text-xs font-bold text-slate-600 block mb-1'>👤 আপনার নাম *</label>
          <input id='svc-name' class='w-full border border-slate-200 bg-slate-50 rounded-xl p-2.5 text-xs focus:outline-none' placeholder='নাম লিখুন'/>
        </div>
        <div>
          <label class='text-xs font-bold text-slate-600 block mb-1'>📞 মোবাইল নম্বর *</label>
          <input id='svc-phone' type='tel' class='w-full border border-slate-200 bg-slate-50 rounded-xl p-2.5 text-xs focus:outline-none' placeholder='01XXXXXXXXX'/>
        </div>
        <div>
          <label class='text-xs font-bold text-slate-600 block mb-1'>🪪 NID / পাসপোর্ট নম্বর</label>
          <input id='svc-nid' class='w-full border border-slate-200 bg-slate-50 rounded-xl p-2.5 text-xs focus:outline-none' placeholder='ঐচ্ছিক'/>
        </div>
        ${getPricingSection(type)}`;
    }
    if (type === 'helicopter') {
      return `
        <div class='bg-slate-50 border border-slate-200 rounded-2xl p-3 space-y-3'>
          <p class='text-[10px] font-bold text-slate-500 uppercase tracking-wide'>🚁 সার্ভিসের ধরন</p>
          <div class='grid grid-cols-3 gap-2'>
            <button onclick='selectVehicle(this,"chopper_vip")' class='vehicle-btn border-2 border-slate-200 rounded-xl p-2.5 text-center text-xs font-bold text-slate-600 hover:border-sky-400 transition'>
              <i class='fas fa-crown text-amber-400 block mb-1'></i> VIP
            </button>
            <button onclick='selectVehicle(this,"chopper_medical")' class='vehicle-btn border-2 border-slate-200 rounded-xl p-2.5 text-center text-xs font-bold text-slate-600 hover:border-sky-400 transition'>
              <i class='fas fa-truck-medical text-red-400 block mb-1'></i> মেডিকেল
            </button>
            <button onclick='selectVehicle(this,"chopper_charter")' class='vehicle-btn border-2 border-slate-200 rounded-xl p-2.5 text-center text-xs font-bold text-slate-600 hover:border-sky-400 transition'>
              <i class='fas fa-briefcase text-slate-500 block mb-1'></i> চার্টার
            </button>
          </div>
          <input type='hidden' id='svc-vehicle'/>
        </div>
        ${locationSection}
        <div class='space-y-1'>
          <label class='text-xs font-bold text-slate-600'>🏁 গন্তব্য *</label>
          <input id='svc-destination' class='w-full border border-slate-200 bg-slate-50 rounded-xl p-2.5 text-xs focus:outline-none focus:border-sky-500' placeholder='গন্তব্য ঠিকানা লিখুন'/>
        </div>
        <div class='grid grid-cols-2 gap-2'>
          <div>
            <label class='text-xs font-bold text-slate-600 block mb-1'>📅 তারিখ *</label>
            <input id='svc-date' type='date' class='w-full border border-slate-200 bg-slate-50 rounded-xl p-2.5 text-xs focus:outline-none'/>
          </div>
          <div>
            <label class='text-xs font-bold text-slate-600 block mb-1'>🕐 সময় *</label>
            <input id='svc-time' type='time' class='w-full border border-slate-200 bg-slate-50 rounded-xl p-2.5 text-xs focus:outline-none'/>
          </div>
        </div>
        <div>
          <label class='text-xs font-bold text-slate-600 block mb-1'>👥 যাত্রী সংখ্যা</label>
          <select id='svc-passengers' class='w-full border border-slate-200 bg-white rounded-xl p-2.5 text-xs focus:outline-none'>
            ${[1,2,3,4,5,6].map(n=>`<option value='${n}'>${n} জন</option>`).join('')}
          </select>
        </div>
        <div>
          <label class='text-xs font-bold text-slate-600 block mb-1'>👤 আপনার নাম *</label>
          <input id='svc-name' class='w-full border border-slate-200 bg-slate-50 rounded-xl p-2.5 text-xs focus:outline-none' placeholder='নাম লিখুন'/>
        </div>
        <div>
          <label class='text-xs font-bold text-slate-600 block mb-1'>📞 মোবাইল নম্বর *</label>
          <input id='svc-phone' type='tel' class='w-full border border-slate-200 bg-slate-50 rounded-xl p-2.5 text-xs focus:outline-none' placeholder='01XXXXXXXXX'/>
        </div>
        ${getPricingSection(type)}`;
    }

    if (type === 'airticket') {
      return `
        <div class='bg-slate-50 border border-slate-200 rounded-2xl p-3 space-y-3'>
          <p class='text-[10px] font-bold text-slate-500 uppercase tracking-wide'>✈️ ফ্লাইটের ধরন</p>
          <div class='grid grid-cols-2 gap-2'>
            <button onclick='selectVehicle(this,"domestic_flight")' class='vehicle-btn border-2 border-slate-200 rounded-xl p-2.5 text-center text-xs font-bold text-slate-600 hover:border-indigo-400 transition'>
              <i class='fas fa-plane text-slate-500 block mb-1'></i> দেশীয়
            </button>
            <button onclick='selectVehicle(this,"international_flight")' class='vehicle-btn border-2 border-slate-200 rounded-xl p-2.5 text-center text-xs font-bold text-slate-600 hover:border-indigo-400 transition'>
              <i class='fas fa-globe text-slate-500 block mb-1'></i> আন্তর্জাতিক
            </button>
          </div>
          <input type='hidden' id='svc-vehicle'/>
        </div>
        <div class='grid grid-cols-2 gap-2'>
          <div>
            <label class='text-xs font-bold text-slate-600 block mb-1'>যাত্রার স্থান *</label>
            <input id='svc-from' class='w-full border border-slate-200 bg-slate-50 rounded-xl p-2.5 text-xs focus:outline-none' placeholder='উদা: ঢাকা'/>
          </div>
          <div>
            <label class='text-xs font-bold text-slate-600 block mb-1'>গন্তব্য *</label>
            <input id='svc-to' class='w-full border border-slate-200 bg-slate-50 rounded-xl p-2.5 text-xs focus:outline-none' placeholder='উদা: দুবাই'/>
          </div>
        </div>
        <div class='grid grid-cols-2 gap-2'>
          <div>
            <label class='text-xs font-bold text-slate-600 block mb-1'>📅 যাত্রার তারিখ *</label>
            <input id='svc-date' type='date' class='w-full border border-slate-200 bg-slate-50 rounded-xl p-2.5 text-xs focus:outline-none'/>
          </div>
          <div>
            <label class='text-xs font-bold text-slate-600 block mb-1'>🎟️ যাত্রী সংখ্যা</label>
            <select id='svc-passengers' class='w-full border border-slate-200 bg-white rounded-xl p-2.5 text-xs focus:outline-none'>
              ${[1,2,3,4,5].map(n=>`<option value='${n}'>${n} জন</option>`).join('')}
            </select>
          </div>
        </div>
        <div class='grid grid-cols-2 gap-2'>
          <div>
            <label class='text-xs font-bold text-slate-600 block mb-1'>আসনের শ্রেণী</label>
            <select id='svc-class' class='w-full border border-slate-200 bg-white rounded-xl p-2.5 text-xs focus:outline-none'>
              <option value='economy'>ইকোনমি</option>
              <option value='business'>বিজনেস</option>
              <option value='first'>ফার্স্ট ক্লাস</option>
            </select>
          </div>
          <div>
            <label class='text-xs font-bold text-slate-600 block mb-1'>ভ্রমণের ধরন</label>
            <select id='svc-trip-type' class='w-full border border-slate-200 bg-white rounded-xl p-2.5 text-xs focus:outline-none'>
              <option value='one_way'>এক দিক</option>
              <option value='return'>যাওয়া-আসা</option>
            </select>
          </div>
        </div>
        <div>
          <label class='text-xs font-bold text-slate-600 block mb-1'>👤 আপনার নাম *</label>
          <input id='svc-name' class='w-full border border-slate-200 bg-slate-50 rounded-xl p-2.5 text-xs focus:outline-none' placeholder='নাম লিখুন'/>
        </div>
        <div>
          <label class='text-xs font-bold text-slate-600 block mb-1'>📞 মোবাইল নম্বর *</label>
          <input id='svc-phone' type='tel' class='w-full border border-slate-200 bg-slate-50 rounded-xl p-2.5 text-xs focus:outline-none' placeholder='01XXXXXXXXX'/>
        </div>
        <div>
          <label class='text-xs font-bold text-slate-600 block mb-1'>🪪 NID / পাসপোর্ট নম্বর *</label>
          <input id='svc-nid' class='w-full border border-slate-200 bg-slate-50 rounded-xl p-2.5 text-xs focus:outline-none' placeholder='পাসপোর্ট নম্বর লিখুন'/>
        </div>
        ${getPricingSection(type)}`;
    }

    if (type === 'tourguide') {
      return `
        <div class='bg-slate-50 border border-slate-200 rounded-2xl p-3 space-y-3'>
          <p class='text-[10px] font-bold text-slate-500 uppercase tracking-wide'>🗺️ গন্তব্য সিলেক্ট করুন</p>
          <div class='grid grid-cols-2 gap-2'>
            <button onclick='selectVehicle(this,"coxsbazar")' class='vehicle-btn border-2 border-slate-200 rounded-xl p-2.5 text-center text-xs font-bold text-slate-600 hover:border-emerald-400 transition'>কক্সবাজার</button>
            <button onclick='selectVehicle(this,"sundarban")' class='vehicle-btn border-2 border-slate-200 rounded-xl p-2.5 text-center text-xs font-bold text-slate-600 hover:border-emerald-400 transition'>সুন্দরবন</button>
            <button onclick='selectVehicle(this,"bandarban")' class='vehicle-btn border-2 border-slate-200 rounded-xl p-2.5 text-center text-xs font-bold text-slate-600 hover:border-emerald-400 transition'>বান্দরবান</button>
            <button onclick='selectVehicle(this,"thailand")' class='vehicle-btn border-2 border-slate-200 rounded-xl p-2.5 text-center text-xs font-bold text-slate-600 hover:border-emerald-400 transition'>থাইল্যান্ড</button>
            <button onclick='selectVehicle(this,"dubai")' class='vehicle-btn border-2 border-slate-200 rounded-xl p-2.5 text-center text-xs font-bold text-slate-600 hover:border-emerald-400 transition col-span-2'>দুবাই</button>
          </div>
          <input type='hidden' id='svc-vehicle'/>
        </div>
        <div class='grid grid-cols-2 gap-2'>
          <div>
            <label class='text-xs font-bold text-slate-600 block mb-1'>📅 যাত্রার তারিখ *</label>
            <input id='svc-date' type='date' class='w-full border border-slate-200 bg-slate-50 rounded-xl p-2.5 text-xs focus:outline-none'/>
          </div>
          <div>
            <label class='text-xs font-bold text-slate-600 block mb-1'>👥 যাত্রী সংখ্যা</label>
            <select id='svc-passengers' class='w-full border border-slate-200 bg-white rounded-xl p-2.5 text-xs focus:outline-none'>
              ${[1,2,3,4,5,6,8,10].map(n=>`<option value='${n}'>${n} জন</option>`).join('')}
            </select>
          </div>
        </div>
        <div>
          <label class='text-xs font-bold text-slate-600 block mb-1'>👤 আপনার নাম *</label>
          <input id='svc-name' class='w-full border border-slate-200 bg-slate-50 rounded-xl p-2.5 text-xs focus:outline-none' placeholder='নাম লিখুন'/>
        </div>
        <div>
          <label class='text-xs font-bold text-slate-600 block mb-1'>📞 মোবাইল নম্বর *</label>
          <input id='svc-phone' type='tel' class='w-full border border-slate-200 bg-slate-50 rounded-xl p-2.5 text-xs focus:outline-none' placeholder='01XXXXXXXXX'/>
        </div>
        ${getPricingSection(type)}`;
    }

    if (type === 'hotel') {
      return `
        <div class='bg-slate-50 border border-slate-200 rounded-2xl p-3 space-y-3'>
          <p class='text-[10px] font-bold text-slate-500 uppercase tracking-wide'>🏨 রুমের ধরন</p>
          <div class='grid grid-cols-3 gap-2'>
            <button onclick='selectVehicle(this,"room_standard")' class='vehicle-btn border-2 border-slate-200 rounded-xl p-2.5 text-center text-xs font-bold text-slate-600 hover:border-amber-400 transition'>স্ট্যান্ডার্ড</button>
            <button onclick='selectVehicle(this,"room_deluxe")' class='vehicle-btn border-2 border-slate-200 rounded-xl p-2.5 text-center text-xs font-bold text-slate-600 hover:border-amber-400 transition'>ডিলাক্স</button>
            <button onclick='selectVehicle(this,"room_suite")' class='vehicle-btn border-2 border-slate-200 rounded-xl p-2.5 text-center text-xs font-bold text-slate-600 hover:border-amber-400 transition'>স্যুট</button>
          </div>
          <input type='hidden' id='svc-vehicle'/>
        </div>
        <div>
          <label class='text-xs font-bold text-slate-600 block mb-1'>🏙️ শহর / এলাকা *</label>
          <select id='svc-to' class='w-full border border-slate-200 bg-white rounded-xl p-2.5 text-xs focus:outline-none'>
            <option value=''>সিলেক্ট করুন</option>${districtOptions}
          </select>
        </div>
        <div class='grid grid-cols-2 gap-2'>
          <div>
            <label class='text-xs font-bold text-slate-600 block mb-1'>📅 চেক-ইন *</label>
            <input id='svc-date' type='date' class='w-full border border-slate-200 bg-slate-50 rounded-xl p-2.5 text-xs focus:outline-none'/>
          </div>
          <div>
            <label class='text-xs font-bold text-slate-600 block mb-1'>📅 চেক-আউট *</label>
            <input id='svc-time' type='date' class='w-full border border-slate-200 bg-slate-50 rounded-xl p-2.5 text-xs focus:outline-none'/>
          </div>
        </div>
        <div>
          <label class='text-xs font-bold text-slate-600 block mb-1'>👥 অতিথি সংখ্যা</label>
          <select id='svc-passengers' class='w-full border border-slate-200 bg-white rounded-xl p-2.5 text-xs focus:outline-none'>
            ${[1,2,3,4,5,6].map(n=>`<option value='${n}'>${n} জন</option>`).join('')}
          </select>
        </div>
        <div>
          <label class='text-xs font-bold text-slate-600 block mb-1'>👤 আপনার নাম *</label>
          <input id='svc-name' class='w-full border border-slate-200 bg-slate-50 rounded-xl p-2.5 text-xs focus:outline-none' placeholder='নাম লিখুন'/>
        </div>
        <div>
          <label class='text-xs font-bold text-slate-600 block mb-1'>📞 মোবাইল নম্বর *</label>
          <input id='svc-phone' type='tel' class='w-full border border-slate-200 bg-slate-50 rounded-xl p-2.5 text-xs focus:outline-none' placeholder='01XXXXXXXXX'/>
        </div>
        ${getPricingSection(type)}`;
    }

    if (type === 'hajj') {
      return `
        <div class='bg-slate-50 border border-slate-200 rounded-2xl p-3 space-y-3'>
          <p class='text-[10px] font-bold text-slate-500 uppercase tracking-wide'>🕋 প্যাকেজের ধরন</p>
          <div class='grid grid-cols-2 gap-2'>
            <button onclick='selectVehicle(this,"umrah_package")' class='vehicle-btn border-2 border-slate-200 rounded-xl p-2.5 text-center text-xs font-bold text-slate-600 hover:border-teal-400 transition'>ওমরাহ প্যাকেজ</button>
            <button onclick='selectVehicle(this,"hajj_package")' class='vehicle-btn border-2 border-slate-200 rounded-xl p-2.5 text-center text-xs font-bold text-slate-600 hover:border-teal-400 transition'>হজ্ব প্যাকেজ</button>
          </div>
          <input type='hidden' id='svc-vehicle'/>
        </div>
        <div class='grid grid-cols-2 gap-2'>
          <div>
            <label class='text-xs font-bold text-slate-600 block mb-1'>📅 যাত্রার তারিখ *</label>
            <input id='svc-date' type='date' class='w-full border border-slate-200 bg-slate-50 rounded-xl p-2.5 text-xs focus:outline-none'/>
          </div>
          <div>
            <label class='text-xs font-bold text-slate-600 block mb-1'>👥 যাত্রী সংখ্যা</label>
            <select id='svc-passengers' class='w-full border border-slate-200 bg-white rounded-xl p-2.5 text-xs focus:outline-none'>
              ${[1,2,3,4,5,6,8,10].map(n=>`<option value='${n}'>${n} জন</option>`).join('')}
            </select>
          </div>
        </div>
        <div>
          <label class='text-xs font-bold text-slate-600 block mb-1'>👤 আপনার নাম *</label>
          <input id='svc-name' class='w-full border border-slate-200 bg-slate-50 rounded-xl p-2.5 text-xs focus:outline-none' placeholder='নাম লিখুন'/>
        </div>
        <div>
          <label class='text-xs font-bold text-slate-600 block mb-1'>📞 মোবাইল নম্বর *</label>
          <input id='svc-phone' type='tel' class='w-full border border-slate-200 bg-slate-50 rounded-xl p-2.5 text-xs focus:outline-none' placeholder='01XXXXXXXXX'/>
        </div>
        <div>
          <label class='text-xs font-bold text-slate-600 block mb-1'>🪪 NID / পাসপোর্ট নম্বর *</label>
          <input id='svc-nid' class='w-full border border-slate-200 bg-slate-50 rounded-xl p-2.5 text-xs focus:outline-none' placeholder='পাসপোর্ট নম্বর লিখুন'/>
        </div>
        ${getPricingSection(type)}`;
    }

    if (type === 'mobile_repair') {
      return `
        <div class='bg-slate-50 border border-slate-200 rounded-2xl p-3 space-y-3'>
          <p class='text-[10px] font-bold text-slate-500 uppercase tracking-wide'>📱 সমস্যার ধরন</p>
          <div class='grid grid-cols-2 gap-2'>
            <button onclick='selectVehicle(this,"screen")' class='vehicle-btn border-2 border-slate-200 rounded-xl p-2.5 text-center text-xs font-bold text-slate-600 hover:border-rose-400 transition'>
              <i class='fas fa-mobile-screen text-rose-400 block mb-1'></i> স্ক্রিন নষ্ট
            </button>
            <button onclick='selectVehicle(this,"battery")' class='vehicle-btn border-2 border-slate-200 rounded-xl p-2.5 text-center text-xs font-bold text-slate-600 hover:border-rose-400 transition'>
              <i class='fas fa-battery-empty text-rose-400 block mb-1'></i> ব্যাটারি সমস্যা
            </button>
            <button onclick='selectVehicle(this,"charging")' class='vehicle-btn border-2 border-slate-200 rounded-xl p-2.5 text-center text-xs font-bold text-slate-600 hover:border-rose-400 transition'>
              <i class='fas fa-plug text-rose-400 block mb-1'></i> চার্জিং সমস্যা
            </button>
            <button onclick='selectVehicle(this,"software")' class='vehicle-btn border-2 border-slate-200 rounded-xl p-2.5 text-center text-xs font-bold text-slate-600 hover:border-rose-400 transition'>
              <i class='fas fa-microchip text-rose-400 block mb-1'></i> সফটওয়্যার সমস্যা
            </button>
          </div>
          <input type='hidden' id='svc-vehicle'/>
        </div>
        <div>
          <label class='text-xs font-bold text-slate-600 block mb-1'>📱 মোবাইলের মডেল *</label>
          <input id='svc-mobile-model' class='w-full border border-slate-200 bg-slate-50 rounded-xl p-2.5 text-xs focus:outline-none' placeholder='যেমন: Samsung A54, iPhone 13...' />
        </div>
        <div>
          <label class='text-xs font-bold text-slate-600 block mb-1'>🔧 বিস্তারিত সমস্যা</label>
          <textarea id='svc-problem-detail' rows='3' class='w-full border border-slate-200 bg-slate-50 rounded-xl p-2.5 text-xs focus:outline-none resize-none' placeholder='সমস্যাটি বিস্তারিত বলুন...'></textarea>
        </div>
        <div>
          <label class='text-xs font-bold text-slate-600 block mb-1'>👤 আপনার নাম *</label>
          <input id='svc-name' class='w-full border border-slate-200 bg-slate-50 rounded-xl p-2.5 text-xs focus:outline-none' placeholder='নাম লিখুন'/>
        </div>
        <div>
          <label class='text-xs font-bold text-slate-600 block mb-1'>📞 মোবাইল নম্বর *</label>
          <input id='svc-phone' type='tel' class='w-full border border-slate-200 bg-slate-50 rounded-xl p-2.5 text-xs focus:outline-none' placeholder='01XXXXXXXXX'/>
        </div>
        <div>
          <label class='text-xs font-bold text-slate-600 block mb-1'>📍 ঠিকানা / এলাকা *</label>
          <input id='svc-pickup' class='w-full border border-slate-200 bg-slate-50 rounded-xl p-2.5 text-xs focus:outline-none' placeholder='আপনার ঠিকানা বা এলাকা লিখুন'/>
        </div>
        ${getPricingSection(type)}`;
    }

    if (type === 'car_repair') {
      return `
        <div class='bg-slate-50 border border-slate-200 rounded-2xl p-3 space-y-3'>
          <p class='text-[10px] font-bold text-slate-500 uppercase tracking-wide'>🚗 গাড়ির সমস্যার ধরন</p>
          <div class='grid grid-cols-2 gap-2'>
            <button onclick='selectVehicle(this,"engine")' class='vehicle-btn border-2 border-slate-200 rounded-xl p-2.5 text-center text-xs font-bold text-slate-600 hover:border-slate-500 transition'>
              <i class='fas fa-cog text-slate-500 block mb-1'></i> ইঞ্জিন সমস্যা
            </button>
            <button onclick='selectVehicle(this,"oil_change")' class='vehicle-btn border-2 border-slate-200 rounded-xl p-2.5 text-center text-xs font-bold text-slate-600 hover:border-slate-500 transition'>
              <i class='fas fa-oil-can text-slate-500 block mb-1'></i> তেল পরিবর্তন
            </button>
            <button onclick='selectVehicle(this,"tyre")' class='vehicle-btn border-2 border-slate-200 rounded-xl p-2.5 text-center text-xs font-bold text-slate-600 hover:border-slate-500 transition'>
              <i class='fas fa-circle-dot text-slate-500 block mb-1'></i> টায়ার / ব্রেক
            </button>
            <button onclick='selectVehicle(this,"electrical")' class='vehicle-btn border-2 border-slate-200 rounded-xl p-2.5 text-center text-xs font-bold text-slate-600 hover:border-slate-500 transition'>
              <i class='fas fa-bolt text-slate-500 block mb-1'></i> ইলেকট্রিক্যাল
            </button>
          </div>
          <input type='hidden' id='svc-vehicle'/>
        </div>
        <div>
          <label class='text-xs font-bold text-slate-600 block mb-1'>🚗 গাড়ির মডেল / নম্বর *</label>
          <input id='svc-car-model' class='w-full border border-slate-200 bg-slate-50 rounded-xl p-2.5 text-xs focus:outline-none' placeholder='যেমন: Toyota Corolla, ঢাকা মেট্রো গ ১২-৩৪৫৬...'/>
        </div>
        <div>
          <label class='text-xs font-bold text-slate-600 block mb-1'>🔧 বিস্তারিত সমস্যা</label>
          <textarea id='svc-problem-detail' rows='3' class='w-full border border-slate-200 bg-slate-50 rounded-xl p-2.5 text-xs focus:outline-none resize-none' placeholder='সমস্যাটি বিস্তারিত বলুন...'></textarea>
        </div>
        <div>
          <label class='text-xs font-bold text-slate-600 block mb-1'>👤 আপনার নাম *</label>
          <input id='svc-name' class='w-full border border-slate-200 bg-slate-50 rounded-xl p-2.5 text-xs focus:outline-none' placeholder='নাম লিখুন'/>
        </div>
        <div>
          <label class='text-xs font-bold text-slate-600 block mb-1'>📞 মোবাইল নম্বর *</label>
          <input id='svc-phone' type='tel' class='w-full border border-slate-200 bg-slate-50 rounded-xl p-2.5 text-xs focus:outline-none' placeholder='01XXXXXXXXX'/>
        </div>
        <div>
          <label class='text-xs font-bold text-slate-600 block mb-1'>📍 গাড়ির বর্তমান অবস্থান *</label>
          <div class='flex gap-2'>
            <input id='svc-pickup' class='flex-1 border border-slate-200 bg-slate-50 rounded-xl p-2.5 text-xs focus:outline-none' placeholder='ঠিকানা বা এলাকা লিখুন'/>
            <button onclick='fetchServiceLocation("pickup")' class='bg-slate-900 text-white text-[10px] font-bold px-3 rounded-xl'>
              <i class='fas fa-location-crosshairs'></i>
            </button>
          </div>
        </div>
        ${getPricingSection(type)}`;
    }

    return '';
  }

  // ✅ সার্ভিস মডাল খোলো
  // ============================================================
  // ✅ জীবন — অসুস্থ কাস্টমার/সেলারের আর্থিক সাহায্যের আবেদন
  // ============================================================
  let jibonDocs = { medical: null, chairman: null, nid: null };

  function openJibonModal() {
    if (!currentUser) {
      alert('আবেদন করতে আগে Google দিয়ে লগইন করুন!');
      return;
    }
    document.getElementById('jibon-name').value = currentUser.displayName || '';
    const saved = safeJSONParse(localStorage.getItem('user_profile_data'), {});
    if (saved.phone) document.getElementById('jibon-phone').value = saved.phone;
    if (saved.address) document.getElementById('jibon-address').value = saved.address;

    document.getElementById('jibon-modal').classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }

  function closeJibonModal() {
    document.getElementById('jibon-modal').classList.add('hidden');
    document.body.style.overflow = 'auto';
  }

  function previewJibonDoc(input, type) {
    if (!input.files || !input.files[0]) return;
    const reader = new FileReader();
    reader.onload = function(e) {
      jibonDocs[type] = e.target.result;
      const preview = document.getElementById(`${type}-preview`);
      const uploadBox = document.getElementById(`${type}-upload-box`);
      const okLabel = document.getElementById(`${type}-ok`);
      preview.src = jibonDocs[type];
      preview.classList.remove('hidden');
      uploadBox.classList.add('hidden');
      okLabel.classList.remove('hidden');
    };
    reader.readAsDataURL(input.files[0]);
  }

  async function submitJibonApplication() {
    const name    = document.getElementById('jibon-name').value.trim();
    const phone   = document.getElementById('jibon-phone').value.trim();
    const address = document.getElementById('jibon-address').value.trim();
    const disease = document.getElementById('jibon-disease').value.trim();
    const amount  = document.getElementById('jibon-amount').value.trim();

    if (!name)    { alert('আপনার পূর্ণ নাম লিখুন!'); return; }
    if (!phone)   { alert('মোবাইল নম্বর দিন!'); return; }
    if (!address) { alert('ঠিকানা দিন!'); return; }
    if (!disease) { alert('রোগের বিবরণ লিখুন!'); return; }
    if (!jibonDocs.medical)  { alert('মেডিকেল রিপোর্টের ছবি আপলোড করুন (ডাক্তারের স্বাক্ষরসহ)!'); return; }
    if (!jibonDocs.chairman) { alert('চেয়ারম্যানের সার্টিফিকেট আপলোড করুন (স্বাক্ষরসহ)!'); return; }
    if (!jibonDocs.nid)      { alert('জাতীয় পরিচয়পত্র / পাসপোর্টের ছবি আপলোড করুন!'); return; }

    const btn = document.getElementById('jibon-submit-btn');
    if (btn) { btn.disabled = true; btn.innerHTML = `<i class="fas fa-spinner fa-spin mr-2"></i> জমা হচ্ছে...`; }

    const applicationData = {
      applicantName: name,
      applicantPhone: phone,
      applicantAddress: address,
      diseaseDetails: disease,
      requestedAmount: amount || null,
      applicantRole: currentUserRole || 'customer',
      applicantUid: currentUser ? currentUser.uid : null,
      medicalReport: jibonDocs.medical,
      chairmanCertificate: jibonDocs.chairman,
      nidOrPassport: jibonDocs.nid,
      status: 'পেন্ডিং 🕐',
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    try {
      const docRef = await firestore.collection('jibon_applications').add(applicationData);

      // Admin নোটিফিকেশন
      await firestore.collection('admin_notifications').add({
        type: 'jibon_application',
        applicantName: name,
        applicantPhone: phone,
        message: `${name} — জীবন (আর্থিক সাহায্য) আবেদন করেছেন।`,
        applicationId: docRef.id,
        isRead: false,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });

      closeJibonModal();

      // সাফল্যের বার্তা
      const successDiv = document.createElement('div');
      successDiv.className = 'fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-[70] flex items-center justify-center p-4';
      successDiv.innerHTML = `
        <div class="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl text-center space-y-4">
          <div class="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
            <i class="fas fa-hand-holding-heart text-emerald-500 text-2xl"></i>
          </div>
          <h3 class="text-lg font-black text-slate-800">আবেদন জমা হয়েছে! 🤲</h3>
          <p class="text-xs text-slate-500 leading-relaxed">আপনার আবেদনটি যাচাইয়ের জন্য জমা হয়েছে। ৭২ ঘণ্টার মধ্যে <span class="font-bold">${phone}</span> নম্বরে যোগাযোগ করা হবে।</p>
          <p class="text-[10px] text-slate-400">আবেদন ID: <span class="font-bold select-all">${docRef.id.substring(0,12)}</span></p>
          <button onclick="this.closest('.fixed').remove()" class="w-full bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold text-sm py-3 rounded-2xl active:scale-95 transition">ঠিক আছে!</button>
        </div>`;
      document.body.appendChild(successDiv);

      // ফর্ম রিসেট
      jibonDocs = { medical: null, chairman: null, nid: null };
      ['medical','chairman','nid'].forEach(type => {
        document.getElementById(`${type}-preview`).classList.add('hidden');
        document.getElementById(`${type}-upload-box`).classList.remove('hidden');
        document.getElementById(`${type}-ok`).classList.add('hidden');
      });
      document.getElementById('jibon-disease').value = '';
      document.getElementById('jibon-amount').value = '';

    } catch (e) {
      alert('আবেদন জমা হয়নি: ' + e.message);
      console.error(e);
    } finally {
      if (btn) { btn.disabled = false; btn.innerHTML = `<i class="fas fa-paper-plane"></i> আবেদন জমা দিন`; }
    }
  }

  function openServicesModal() {
    document.getElementById('services-modal').classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    startNearbyProvidersListener();
  }

  function closeServicesModal() {
    document.getElementById('services-modal').classList.add('hidden');
    document.body.style.overflow = 'auto';
    stopNearbyProvidersListener();
  }

  // ✅ দুটি GPS পয়েন্টের মধ্যে দূরত্ব (কিমি) — Haversine ফর্মুলা
  function calcDistanceKm(lat1, lng1, lat2, lng2) {
    if ([lat1, lng1, lat2, lng2].some(v => typeof v !== 'number' || isNaN(v))) return null;
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2
      + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  // ✅ কাস্টমারের লাইভ লোকেশন বের করা (GPS না পেলে ঢাকাকে ডিফল্ট ধরা হয়)
  function getCustomerLocation() {
    return new Promise((resolve) => {
      if (customerLiveLocation) return resolve(customerLiveLocation);
      if (!navigator.geolocation) return resolve({ lat: 23.8103, lng: 90.4125, fallback: true });
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          customerLiveLocation = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          resolve(customerLiveLocation);
        },
        () => resolve({ lat: 23.8103, lng: 90.4125, fallback: true }),
        { timeout: 6000, maximumAge: 30000 }
      );
    });
  }

  // ✅ রিয়েল-টাইমে অনলাইন প্রোভাইডারদের শোনা শুরু (লাইভ ম্যাপের জন্য)
  async function startNearbyProvidersListener() {
    const loc = await getCustomerLocation();
    stopNearbyProvidersListener();
    const countEl = document.getElementById('nearby-provider-count');
    try {
      nearbyProvidersUnsub = firestore.collection('service_providers')
        .where('isOnline', '==', true)
        .onSnapshot((snapshot) => {
          const list = snapshot.docs
            .map(d => ({ id: d.id, ...d.data() }))
            .filter(p => typeof p.lat === 'number' && typeof p.lng === 'number')
            .map(p => ({ ...p, distanceKm: calcDistanceKm(loc.lat, loc.lng, p.lat, p.lng) }))
            .sort((a, b) => (a.distanceKm ?? 999) - (b.distanceKm ?? 999));
          providerListCache = list;
          if (countEl) {
            countEl.dataset.searching = 'false';
            countEl.innerText = list.length > 0
              ? (currentLang === 'bn' ? `${list.length} জন অনলাইনে আছে` : `${list.length} online now`)
              : t('nobodyOnlineLabel');
          }
          renderNearbyPins(list, loc);
        }, (err) => {
          console.error('service_providers listener error:', err);
          if (countEl) { countEl.dataset.searching = 'false'; countEl.innerText = t('couldNotLoadLabel'); }
        });
    } catch (e) {
      console.error(e);
      if (countEl) { countEl.dataset.searching = 'false'; countEl.innerText = t('couldNotLoadLabel'); }
    }
  }

  function stopNearbyProvidersListener() {
    if (nearbyProvidersUnsub) { nearbyProvidersUnsub(); nearbyProvidersUnsub = null; }
  }

  // ✅ রাডার ম্যাপে প্রোভাইডার পিন বসানো (lat/lng থেকে আনুমানিক পিক্সেল পজিশন)
  function renderNearbyPins(list, loc) {
    const layer = document.getElementById('nearby-pins-layer');
    if (!layer) return;
    const MAX_KM = 15; // রাডারের কিনারা আনুমানিক ১৫ কিমি প্রতিনিধিত্ব করে
    layer.innerHTML = list.slice(0, 24).map(p => {
      const meta = PROVIDER_TYPE_META[p.type] || { icon: 'fa-location-dot', color: 'bg-slate-500' };
      const dLatKm = (p.lat - loc.lat) * 111;
      const dLngKm = (p.lng - loc.lng) * 111 * Math.cos(loc.lat * Math.PI / 180);
      let xPct = 50 + (dLngKm / MAX_KM) * 42;
      let yPct = 50 - (dLatKm / MAX_KM) * 42;
      xPct = Math.min(94, Math.max(6, xPct));
      yPct = Math.min(94, Math.max(6, yPct));
      return `
        <button onclick="openProviderProfile('${p.id}')"
          class="absolute w-7 h-7 -translate-x-1/2 -translate-y-1/2 rounded-full ${meta.color} text-white text-[10px] flex items-center justify-center shadow-lg border-2 border-white active:scale-90 transition ${p.isFree ? '' : 'opacity-60'}"
          style="left:${xPct}%; top:${yPct}%"
          title="${escapeHtml(p.name || '')}">
          <i class="fas ${meta.icon}"></i>
        </button>`;
    }).join('');
  }

  // ✅ ছোট গুগল ম্যাপ টগল (এলাকার প্রকৃত ম্যাপ দেখার জন্য, সহায়ক)
  function toggleNearbyGoogleMap() {
    const wrap = document.getElementById('nearby-gmap-wrap');
    const btn  = document.getElementById('nearby-gmap-toggle-btn');
    if (!wrap) return;
    const willShow = wrap.classList.contains('hidden');
    if (willShow) {
      const loc = customerLiveLocation || { lat: 23.8103, lng: 90.4125 };
      const frame = document.getElementById('nearby-gmap-iframe');
      if (frame) frame.src = `https://maps.google.com/maps?q=${loc.lat},${loc.lng}&t=&z=14&ie=UTF8&iwloc=&output=embed`;
      wrap.classList.remove('hidden');
      if (btn) btn.innerHTML = `<i class="fas fa-chevron-up"></i> ম্যাপ বন্ধ করুন`;
    } else {
      wrap.classList.add('hidden');
      if (btn) btn.innerHTML = `<i class="fas fa-map-location-dot"></i> গুগল ম্যাপে এলাকা দেখুন`;
    }
  }

  // ✅ ড্রাইভার/এজেন্ট তালিকা পেজ — taxi/bike/airbus/helicopter (চালক) ও
  // airticket/tourguide/hotel (এজেন্ট) এর জন্য এক এক করে প্রোফাইল ব্রাউজ করা
  function openProviderListPage(type) {
    const cfg = SERVICE_CONFIG[type];
    document.getElementById('provider-list-title').innerText = cfg ? cfg.title : 'প্রোভাইডার তালিকা';
    document.getElementById('provider-list-subtitle').innerText =
      ['airticket', 'tourguide', 'hotel'].includes(type)
        ? 'উপলব্ধ এজেন্টদের প্রোফাইল দেখুন ও বুকিং করুন'
        : 'উপলব্ধ চালকদের প্রোফাইল দেখুন ও বুকিং করুন';
    renderProviderListForType(type);
    document.getElementById('provider-list-modal').classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }

  function closeProviderListModal() {
    document.getElementById('provider-list-modal').classList.add('hidden');
    document.body.style.overflow = 'auto';
  }

  async function renderProviderListForType(type) {
    const area = document.getElementById('provider-list-area');
    area.innerHTML = `<div class="text-center py-8 text-slate-400 text-xs"><i class="fas fa-spinner fa-spin text-xl mb-2 block"></i> লোড হচ্ছে...</div>`;

    const loc = await getCustomerLocation();
    let list = providerListCache.filter(p => p.type === type);

    // ক্যাশে কিছু না থাকলে এক বার সরাসরি ফেচ করা
    if (list.length === 0) {
      try {
        const snap = await firestore.collection('service_providers')
          .where('type', '==', type)
          .where('isOnline', '==', true)
          .get();
        list = snap.docs.map(d => ({ id: d.id, ...d.data() }))
          .filter(p => typeof p.lat === 'number' && typeof p.lng === 'number')
          .map(p => ({ ...p, distanceKm: calcDistanceKm(loc.lat, loc.lng, p.lat, p.lng) }));
      } catch (e) { console.error(e); }
    }

    list = list.sort((a, b) => (a.distanceKm ?? 999) - (b.distanceKm ?? 999));

    if (list.length === 0) {
      area.innerHTML = `
        <div class="text-center py-10 text-slate-400 text-xs">
          <i class="fas fa-user-slash text-2xl text-slate-200 mb-2 block"></i>
          এই মুহূর্তে কোনো ${['airticket','tourguide','hotel'].includes(type) ? 'এজেন্ট' : 'চালক'} অনলাইনে নেই
        </div>
        <button onclick="closeProviderListModal(); openServiceDetail('${type}')" class="w-full bg-slate-800 text-white text-xs font-bold py-3 rounded-2xl">
          তবুও সাধারণভাবে বুকিং করুন
        </button>`;
      return;
    }

    const meta = PROVIDER_TYPE_META[type] || { icon: 'fa-location-dot', color: 'bg-slate-500' };
    area.innerHTML = list.map(p => `
      <button onclick="openProviderProfile('${p.id}')" class="w-full bg-white border border-slate-100 rounded-2xl p-3 flex items-center gap-3 shadow-sm active:scale-[0.98] transition text-left">
        <div class="w-11 h-11 rounded-xl ${meta.color} text-white flex items-center justify-center text-base shrink-0 relative">
          <i class="fas ${meta.icon}"></i>
          <span class="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-white ${p.isFree ? 'bg-emerald-500' : 'bg-rose-500'}"></span>
        </div>
        <div class="flex-1">
          <p class="text-xs font-black text-slate-800">${escapeHtml(p.name || 'নাম নেই')}</p>
          <p class="text-[10px] text-slate-400 mt-0.5">${p.distanceKm != null ? p.distanceKm.toFixed(1) + ' কিমি দূরে' : 'দূরত্ব অজানা'} • ${p.isFree ? '🟢 ফ্রি আছেন' : '🔴 ব্যস্ত আছেন'}</p>
        </div>
        <i class="fas fa-chevron-right text-slate-300 text-xs"></i>
      </button>`).join('');
  }

  // ✅ একক প্রোভাইডারের প্রোফাইল দেখানো (ম্যাপ পিন বা তালিকা থেকে)
  function openProviderProfile(providerId) {
    const p = providerListCache.find(x => x.id === providerId);
    if (!p) { alert('প্রোফাইলটি আর উপলব্ধ নেই, আবার চেষ্টা করুন।'); return; }
    const meta = PROVIDER_TYPE_META[p.type] || { icon: 'fa-location-dot', color: 'bg-slate-500' };
    const cfg  = SERVICE_CONFIG[p.type];
    const dist = p.distanceKm != null ? `${p.distanceKm.toFixed(1)} কিমি দূরে` : 'দূরত্ব অজানা';
    const card = document.getElementById('provider-profile-card');
    card.innerHTML = `
      <div class="${meta.color} px-5 pt-5 pb-6 text-white relative">
        <button onclick="closeProviderProfile()" class="absolute top-4 right-4 w-7 h-7 rounded-full bg-white/20 flex items-center justify-center">
          <i class="fas fa-times text-xs"></i>
        </button>
        <div class="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center text-2xl mb-3">
          <i class="fas ${meta.icon}"></i>
        </div>
        <h3 class="font-black text-lg">${escapeHtml(p.name || 'নাম নেই')}</h3>
        <p class="text-white/80 text-xs mt-0.5">${cfg ? escapeHtml(cfg.title) : escapeHtml(p.type)}</p>
      </div>
      <div class="p-5 space-y-3">
        <div class="flex items-center justify-between text-xs">
          <span class="text-slate-500">স্ট্যাটাস</span>
          <span class="font-bold ${p.isFree ? 'text-emerald-600' : 'text-rose-500'}">${p.isFree ? '🟢 এখন ফ্রি আছেন' : '🔴 এখন ব্যস্ত আছেন'}</span>
        </div>
        <div class="flex items-center justify-between text-xs">
          <span class="text-slate-500">আপনার থেকে দূরত্ব</span>
          <span class="font-bold text-slate-700">${dist}</span>
        </div>
        <div class="flex items-center justify-between text-xs">
          <span class="text-slate-500">ফোন নম্বর</span>
          <span class="font-bold text-slate-700">${escapeHtml(p.phone || '—')}</span>
        </div>
        ${getPricingSection(p.type)}
        <button onclick="bookFromProvider('${p.id}')" class="w-full ${cfg ? cfg.btnColor : 'bg-slate-800'} text-white font-black text-sm py-3.5 rounded-2xl shadow-lg active:scale-95 transition">
          ${p.isFree ? 'এই প্রোভাইডার দিয়ে বুকিং করুন 🚀' : 'বুকিং রিকোয়েস্ট পাঠান'}
        </button>
      </div>`;
    document.getElementById('provider-profile-modal').classList.remove('hidden');
  }

  function closeProviderProfile() {
    document.getElementById('provider-profile-modal').classList.add('hidden');
  }

  // ✅ প্রোফাইল থেকে সরাসরি বুকিং ফর্মে যাওয়া — প্রোভাইডারের তথ্য বুকিং-এ যুক্ত হবে
  function bookFromProvider(providerId) {
    const p = providerListCache.find(x => x.id === providerId);
    if (!p) return;
    selectedProvider = { uid: p.id, name: p.name, phone: p.phone, type: p.type, distanceKm: p.distanceKm };
    closeProviderProfile();
    document.getElementById('provider-list-modal')?.classList.add('hidden');
    closeServicesModal();
    openServiceDetail(p.type);
  }

  // ✅ বুকিং ফর্মের উপরে নির্বাচিত প্রোভাইডারের সারাংশ কার্ড
  function getSelectedProviderCard() {
    if (!selectedProvider) return '';
    const meta = PROVIDER_TYPE_META[selectedProvider.type] || { icon: 'fa-location-dot', color: 'bg-slate-500' };
    return `
      <div class="bg-emerald-50 border border-emerald-200 rounded-2xl p-3 flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl ${meta.color} text-white flex items-center justify-center text-sm shrink-0">
          <i class="fas ${meta.icon}"></i>
        </div>
        <div class="flex-1">
          <p class="text-[10px] text-emerald-600 font-bold uppercase tracking-wide">নির্বাচিত প্রোভাইডার</p>
          <p class="text-xs font-black text-slate-800">${escapeHtml(selectedProvider.name || '')}${selectedProvider.phone ? ' • ' + escapeHtml(selectedProvider.phone) : ''}</p>
          ${selectedProvider.distanceKm != null ? `<p class="text-[10px] text-slate-500 mt-0.5">${selectedProvider.distanceKm.toFixed(1)} কিমি দূরে</p>` : ''}
        </div>
        <button onclick="clearSelectedProvider()" class="text-[10px] text-slate-400 font-bold underline shrink-0">বদলান</button>
      </div>`;
  }

  function clearSelectedProvider() {
    selectedProvider = null;
    if (currentServiceType) openServiceDetail(currentServiceType);
  }

  // ✅ সেলার/চালক/এজেন্ট নিজেকে অনলাইন বা অফলাইন করবেন — লাইভ ম্যাপের জন্য
  async function toggleProviderOnline(checkbox) {
    if (!currentUser) { alert('লগইন করুন'); checkbox.checked = false; return; }

    const typeSelect = document.getElementById('provider-type-select');
    const nameInput  = document.getElementById('provider-name-input');
    const phoneInput = document.getElementById('provider-phone-input');
    const statusText = document.getElementById('provider-status-text');

    // প্রোফাইল থেকে নাম/ফোন প্রি-ফিল (ফাঁকা থাকলে)
    if (nameInput && !nameInput.value) {
      nameInput.value = currentUser.displayName || document.getElementById('profile-name')?.value || '';
    }
    if (phoneInput && !phoneInput.value) {
      phoneInput.value = document.getElementById('profile-phone')?.value || '';
    }

    const type  = typeSelect?.value || '';
    const name  = nameInput?.value.trim() || '';
    const phone = phoneInput?.value.trim() || '';

    if (checkbox.checked) {
      if (!type)  { alert('সার্ভিসের ধরন সিলেক্ট করুন!'); checkbox.checked = false; return; }
      if (!name)  { alert('আপনার নাম দিন!'); checkbox.checked = false; return; }
      if (!phone) { alert('ফোন নম্বর দিন!'); checkbox.checked = false; return; }
      if (!navigator.geolocation) { alert('আপনার ডিভাইসে লোকেশন সাপোর্ট নেই!'); checkbox.checked = false; return; }

      if (statusText) statusText.innerText = '📡 লোকেশন পাঠানো হচ্ছে...';

      providerWatchId = navigator.geolocation.watchPosition(async (pos) => {
        try {
          await firestore.collection('service_providers').doc(currentUser.uid).set({
            uid: currentUser.uid,
            name, phone, type,
            isOnline: true,
            isFree: document.getElementById('provider-free-toggle')?.checked ?? true,
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
          });
          if (statusText) statusText.innerText = '🟢 লাইভ — কাস্টমাররা আপনাকে ম্যাপে দেখতে পাচ্ছে';
        } catch (e) {
          console.error(e);
          if (statusText) statusText.innerText = '⚠️ আপডেট ব্যর্থ হয়েছে: ' + e.message;
        }
      }, (err) => {
        console.error(err);
        if (statusText) statusText.innerText = '⚠️ GPS চালু করুন এবং অনুমতি দিন';
        checkbox.checked = false;
      }, { enableHighAccuracy: true, maximumAge: 10000 });

    } else {
      if (providerWatchId !== null) { navigator.geolocation.clearWatch(providerWatchId); providerWatchId = null; }
      try {
        await firestore.collection('service_providers').doc(currentUser.uid)
          .update({ isOnline: false, updatedAt: firebase.firestore.FieldValue.serverTimestamp() });
      } catch (e) { console.error(e); }
      if (statusText) statusText.innerText = '⚪ অফলাইনে আছেন';
    }
  }

  // ✅ ফ্রি/ব্যস্ত স্ট্যাটাস টগল
  function toggleProviderFreeStatus(checkbox) {
    if (!currentUser) return;
    firestore.collection('service_providers').doc(currentUser.uid).update({
      isFree: checkbox.checked,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }).catch(e => console.error(e));
  }

  function openServiceDetail(type) {
    currentServiceType = type;
    if (selectedProvider && selectedProvider.type !== type) selectedProvider = null;
    const cfg = SERVICE_CONFIG[type];

    // হেডার আপডেট
    document.getElementById('service-icon-box').className = `w-10 h-10 rounded-xl flex items-center justify-center text-white text-lg ${cfg.color}`;
    document.getElementById('service-icon-box').innerHTML = `<i class="${cfg.icon}"></i>`;
    document.getElementById('service-title').innerText = cfg.title;
    document.getElementById('service-subtitle').innerText = cfg.subtitle;
    document.getElementById('service-book-btn').className = `w-full text-white font-black text-sm py-3.5 rounded-2xl shadow-lg transition active:scale-95 ${cfg.btnColor}`;

    // ফর্ম লোড — নির্বাচিত প্রোভাইডার থাকলে উপরে তার সারাংশ কার্ড দেখানো হবে
    document.getElementById('service-form-area').innerHTML =
      (selectedProvider && selectedProvider.type === type ? getSelectedProviderCard() : '') + getServiceForm(type);

    // Google User info auto-fill
    if (currentUser) {
      const nameEl = document.getElementById('svc-name');
      if (nameEl) nameEl.value = currentUser.displayName || '';
    }

    document.getElementById('service-detail-modal').classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }

  function closeServiceDetail() {
    document.getElementById('service-detail-modal').classList.add('hidden');
    document.body.style.overflow = 'auto';
    currentServiceType = null;
  }

  // ✅ গাড়ির ধরন সিলেক্ট
  function selectVehicle(btn, value) {
    document.querySelectorAll('.vehicle-btn').forEach(b => {
      b.classList.remove('border-orange-400','border-blue-400','border-emerald-400','border-violet-400','border-sky-400','border-indigo-400','border-amber-400','border-teal-400','bg-orange-50','bg-blue-50','bg-emerald-50','bg-violet-50','bg-sky-50','bg-indigo-50','bg-amber-50','bg-teal-50');
    });
    const colors = {
      taxi:'border-orange-400 bg-orange-50',
      bike:'border-blue-400 bg-blue-50',
      airbus:'border-emerald-400 bg-emerald-50',
      ticket:'border-violet-400 bg-violet-50',
      helicopter:'border-sky-400 bg-sky-50',
      airticket:'border-indigo-400 bg-indigo-50',
      tourguide:'border-emerald-400 bg-emerald-50',
      hotel:'border-amber-400 bg-amber-50',
      hajj:'border-teal-400 bg-teal-50'
    };
    btn.classList.add(...(colors[currentServiceType] || 'border-orange-400 bg-orange-50').split(' '));
    const vehicleInput = document.getElementById('svc-vehicle');
    if (vehicleInput) vehicleInput.value = value;
  }

  // ✅ লোকেশন ফেচ
  function fetchServiceLocation(field) {
    navigator.geolocation.getCurrentPosition((pos) => {
      const { latitude: lat, longitude: lng } = pos.coords;
      const mapLink = `https://maps.google.com/?q=${lat},${lng}`;
      const inputEl = document.getElementById(`svc-${field}`);
      if (inputEl) inputEl.value = mapLink;
      const mapFrame = document.getElementById('svc-map');
      if (mapFrame) mapFrame.src = `https://maps.google.com/maps?q=${lat},${lng}&z=15&output=embed`;
    }, () => alert('GPS চালু করুন!'));
  }

  // ✅ বুকিং সাবমিট — Firestore-এ সেভ
  async function submitServiceBooking() {
    if (!currentServiceType) return;

    // ✅ Firestore rules অনুযায়ী বুকিং তৈরিতে লগইন বাধ্যতামূলক
    // (customerUid অবশ্যই request.auth.uid-এর সাথে মিলতে হবে)
    if (!currentUser) {
      alert('বুকিং করতে আগে লগইন করুন!');
      openProfile?.();
      return;
    }

    const name  = document.getElementById('svc-name')?.value.trim();
    const phone = document.getElementById('svc-phone')?.value.trim();
    const date  = document.getElementById('svc-date')?.value;

    if (!name)  { alert('আপনার নাম দিন!'); return; }
    if (!phone) { alert('মোবাইল নম্বর দিন!'); return; }

    const btn = document.getElementById('service-book-btn');
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> বুকিং হচ্ছে...'; }

    // সার্ভিস অনুযায়ী ডেটা
    const bookingData = {
      serviceType:  currentServiceType,
      serviceName:  SERVICE_CONFIG[currentServiceType].title,
      customerName: name,
      customerPhone: phone,
      customerUid:  currentUser.uid,
      date:         date || '',
      time:         document.getElementById('svc-time')?.value || '',
      vehicle:      document.getElementById('svc-vehicle')?.value || '',
      pickup:       document.getElementById('svc-pickup')?.value || '',
      destination:  document.getElementById('svc-destination')?.value || '',
      from:         document.getElementById('svc-from')?.value || '',
      to:           document.getElementById('svc-to')?.value || '',
      passengers:   document.getElementById('svc-passengers')?.value || '1',
      seatClass:    document.getElementById('svc-class')?.value || '',
      tripType:     document.getElementById('svc-trip-type')?.value || '',
      nid:          document.getElementById('svc-nid')?.value || '',
      txid:         document.getElementById('svc-txid')?.value.trim().toUpperCase() || '',
      advanceAmount: SERVICE_CONFIG[currentServiceType]?.advanceAmount || 0,
      providerUid:   (selectedProvider && selectedProvider.type === currentServiceType) ? selectedProvider.uid   : null,
      providerName:  (selectedProvider && selectedProvider.type === currentServiceType) ? selectedProvider.name  : null,
      providerPhone: (selectedProvider && selectedProvider.type === currentServiceType) ? selectedProvider.phone : null,
      // মোবাইল ও গাড়ি সার্ভিসিং extra fields
      mobileModel:  document.getElementById('svc-mobile-model')?.value || '',
      carModel:     document.getElementById('svc-car-model')?.value || '',
      problemDetail: document.getElementById('svc-problem-detail')?.value || '',
      status:       'পেন্ডিং ⏳',
      createdAt:    firebase.firestore.FieldValue.serverTimestamp()
    };

    try {
      const docRef = await firebase.firestore().collection('service_bookings').add(bookingData);

      // Admin নোটিফিকেশন
      await firebase.firestore().collection('admin_notifications').add({
        type:          'service_booking',
        serviceType:   currentServiceType,
        applicantName: name,
        applicantPhone: phone,
        message:       `${name} — ${SERVICE_CONFIG[currentServiceType].title} বুক করেছেন।`,
        bookingId:     docRef.id,
        isRead:        false,
        createdAt:     firebase.firestore.FieldValue.serverTimestamp()
      });

      // সাকসেস UI
      showServiceSuccessModal(docRef.id, currentServiceType);
      closeServiceDetail();
      selectedProvider = null;

    } catch(e) {
      alert('বুকিং সম্পন্ন হয়নি: ' + e.message);
      console.error(e);
    } finally {
      if (btn) { btn.disabled = false; btn.innerHTML = 'এখনই বুক করুন 🚀'; }
    }
  }

  // ✅ সাকসেস মডাল
  function showServiceSuccessModal(bookingId, type) {
    const cfg     = SERVICE_CONFIG[type];
    const advance = cfg?.advanceAmount || 0;
    const txid    = document.getElementById('svc-txid')?.value.trim().toUpperCase() || '';
    const old     = document.getElementById('svc-success-modal');
    if (old) old.remove();

    const modal = document.createElement('div');
    modal.id = 'svc-success-modal';
    modal.className = 'fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-[70] flex items-center justify-center p-4';
    modal.innerHTML = `
      <div class="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl text-center space-y-4">
        <div class="w-16 h-16 ${cfg.color} rounded-full flex items-center justify-center mx-auto shadow-lg">
          <i class="${cfg.icon} text-white text-2xl"></i>
        </div>
        <h3 class="text-lg font-black text-slate-800">বুকিং সফল হয়েছে! 🎉</h3>
        <div class="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-left space-y-2">
          <div class="flex justify-between text-xs">
            <span class="text-slate-500">বুকিং ID:</span>
            <span class="font-black text-slate-800 text-[10px] select-all">${bookingId}</span>
          </div>
          <div class="flex justify-between text-xs">
            <span class="text-slate-500">সার্ভিস:</span>
            <span class="font-bold text-slate-700">${cfg.title}</span>
          </div>
          <div class="flex justify-between text-xs">
            <span class="text-slate-500">অ্যাডভান্স:</span>
            <span class="font-bold text-orange-600">৳${advance}</span>
          </div>
          ${txid ? `<div class="flex justify-between text-xs">
            <span class="text-slate-500">TxID:</span>
            <span class="font-bold text-emerald-600 text-[10px] select-all">${txid}</span>
          </div>` : `<div class="text-[10px] text-amber-600 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 mt-1">
            ⚠️ অ্যাডভান্স ৳${advance} পাঠানো না হলে বুকিং বাতিল হতে পারে
          </div>`}
          <div class="flex justify-between text-xs">
            <span class="text-slate-500">স্ট্যাটাস:</span>
            <span class="font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">পেন্ডিং ⏳</span>
          </div>
        </div>
        <p class="text-[10px] text-slate-400">এই বুকিং ID সেভ করুন। শীঘ্রই আপনার সাথে যোগাযোগ করা হবে।</p>
        <button onclick="document.getElementById('svc-success-modal').remove()"
          class="w-full ${cfg.btnColor} text-white font-bold text-sm py-3 rounded-2xl shadow-lg transition active:scale-95">
          ঠিক আছে, ধন্যবাদ!
        </button>
      </div>`;
    document.body.appendChild(modal);
  }

  // ============================================================
  // ✅ প্রশিক্ষণ কেন্দ্র সিস্টেম
  // ============================================================

  const TRAINING_CATEGORIES = {
    domestic:     { label: '🏠 গৃহস্থালি',   color: 'bg-orange-100 text-orange-700' },
    construction: { label: '🏗️ নির্মাণ',     color: 'bg-amber-100 text-amber-700'  },
    tech:         { label: '💻 প্রযুক্তি',    color: 'bg-blue-100 text-blue-700'    },
    healthcare:   { label: '🏥 স্বাস্থ্যসেবা', color: 'bg-red-100 text-red-700'     },
    hospitality:  { label: '🍽️ হোটেল',       color: 'bg-violet-100 text-violet-700'},
    language:     { label: '🗣️ ভাষা',         color: 'bg-emerald-100 text-emerald-700' },
  };

  let allTrainingsCache = [];
  let currentTrainingCat = 'all';
  let currentTrainingPostCat = 'domestic';

  function openTrainingModal() {
    document.getElementById('training-modal').classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    loadTrainingList();
  }

  function closeTrainingModal() {
    document.getElementById('training-modal').classList.add('hidden');
    document.body.style.overflow = 'auto';
  }

  function filterTraining(cat) {
    currentTrainingCat = cat;
    const allCats = ['all','domestic','construction','tech','healthcare','hospitality','language'];
    allCats.forEach(c => {
      const btn = document.getElementById(`train-cat-${c}`);
      if (!btn) return;
      btn.className = c === cat
        ? 'shrink-0 px-3 py-1.5 rounded-full text-[10px] font-black bg-cyan-600 text-white transition'
        : 'shrink-0 px-3 py-1.5 rounded-full text-[10px] font-black bg-slate-100 text-slate-600 transition';
    });
    renderTrainingList();
  }

  async function loadTrainingList() {
    const area = document.getElementById('training-list-area');
    area.innerHTML = `<div class='flex flex-col items-center justify-center py-12 text-slate-400'><i class='fas fa-spinner fa-spin text-2xl mb-2'></i><p class='text-xs'>লোড হচ্ছে...</p></div>`;
    try {
      const snap = await firestore.collection('training_courses')
        .where('status', '==', 'active')
        .orderBy('createdAt', 'desc')
        .limit(60)
        .get();
      allTrainingsCache = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      renderTrainingList();
    } catch (e) {
      console.error('Training load error:', e);
      area.innerHTML = `<div class='text-center py-10 text-slate-400'><i class='fas fa-exclamation-circle text-2xl mb-2'></i><p class='text-xs'>লোড হয়নি। আবার চেষ্টা করুন।</p></div>`;
    }
  }

  function renderTrainingList() {
    const area = document.getElementById('training-list-area');
    const query = (document.getElementById('training-search-input')?.value || '').toLowerCase();

    let filtered = allTrainingsCache.filter(t => {
      if (currentTrainingCat !== 'all' && t.category !== currentTrainingCat) return false;
      if (query) {
        const hay = `${t.title} ${t.institute} ${t.country || ''} ${t.description || ''}`.toLowerCase();
        if (!hay.includes(query)) return false;
      }
      return true;
    });

    if (filtered.length === 0) {
      area.innerHTML = `<div class='flex flex-col items-center justify-center py-14 text-slate-400'>
        <i class='fas fa-graduation-cap text-3xl mb-3 opacity-40'></i>
        <p class='text-xs font-bold'>কোনো কোর্স পাওয়া যায়নি</p>
        <p class='text-[10px] mt-1'>নতুন কোর্স যোগ করুন অথবা পরে আসুন</p>
      </div>`;
      return;
    }

    area.innerHTML = filtered.map(t => {
      const catMeta = TRAINING_CATEGORIES[t.category] || { label: t.category, color: 'bg-slate-100 text-slate-600' };
      const durationStr  = t.duration  ? `<span class='text-[9px] text-slate-500 font-bold'><i class='fas fa-clock mr-0.5'></i>${t.duration}</span>` : '';
      const feeStr       = t.fee       ? `<span class='text-[9px] text-emerald-600 font-bold'>💰 ${escapeHtml(t.fee)}</span>` : '';
      const countryStr   = t.country   ? `<span class='text-[9px] text-blue-600 font-bold'>✈️ ${escapeHtml(t.country)}</span>` : '';
      const deadlineStr  = t.deadline  ? `<span class='text-[9px] text-rose-500 font-bold'>📅 শেষ: ${t.deadline}</span>` : '';
      const locationStr  = t.location  ? `<span class='text-[9px] text-slate-400'><i class='fas fa-location-dot'></i> ${escapeHtml(t.location)}</span>` : '';
      const enrollCount  = t.enrollCount ? `<span class='text-[9px] text-slate-400'><i class='fas fa-users'></i> ${t.enrollCount} জন আবেদন করেছেন</span>` : '';

      return `<div class='bg-white rounded-2xl border border-slate-200 p-4 shadow-sm'>
        <div class='flex items-start justify-between gap-2 mb-2'>
          <div class='flex-1'>
            <h4 class='font-black text-sm text-slate-800'>${escapeHtml(t.title)}</h4>
            <p class='text-[11px] text-slate-500 mt-0.5 font-medium'>${escapeHtml(t.institute)}</p>
          </div>
          <span class='shrink-0 text-[9px] font-black px-2 py-0.5 rounded-full ${catMeta.color}'>${catMeta.label}</span>
        </div>
        <p class='text-[10px] text-slate-600 leading-relaxed line-clamp-2 mb-2'>${escapeHtml(t.description || '')}</p>
        <div class='flex flex-wrap gap-x-3 gap-y-1 mb-3'>${countryStr}${durationStr}${feeStr}${deadlineStr}${locationStr}${enrollCount}</div>
        <div class='flex gap-2'>
          <button onclick='openTrainingApplyModal("${t.id}", "${escapeHtml(t.title)}", "${escapeHtml(t.institute)}")'
            class='flex-1 bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-[10px] font-black py-2 rounded-xl active:scale-95 transition'>
            <i class='fas fa-user-graduate mr-1'></i> ভর্তি আবেদন
          </button>
          <a href='tel:${escapeHtml(t.phone || '')}' class='w-9 h-9 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center active:scale-95 transition'>
            <i class='fas fa-phone text-sm'></i>
          </a>
        </div>
      </div>`;
    }).join('');
  }

  function selectTrainingCat(cat) {
    currentTrainingPostCat = cat;
    document.getElementById('post-training-category').value = cat;
    document.querySelectorAll('.training-cat-btn').forEach(btn => {
      btn.className = 'training-cat-btn py-2 rounded-xl border-2 border-slate-200 text-slate-500 text-[10px] font-black active:scale-95 transition';
    });
    const activeBtn = document.getElementById(`tc-${cat}`);
    if (activeBtn) activeBtn.className = 'training-cat-btn py-2 rounded-xl border-2 border-cyan-500 bg-cyan-50 text-cyan-700 text-[10px] font-black active:scale-95 transition';
  }

  function openPostTrainingModal() {
    if (!currentUser) { alert('কোর্স যোগ করতে প্রথমে লগইন করুন!'); return; }
    ['post-training-title','post-training-institute','post-training-duration','post-training-fee',
     'post-training-country','post-training-description','post-training-phone','post-training-deadline','post-training-location']
      .forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
    selectTrainingCat('domestic');
    document.getElementById('post-training-modal').classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }

  function closePostTrainingModal() {
    document.getElementById('post-training-modal').classList.add('hidden');
  }

  async function submitTrainingPost() {
    const title       = document.getElementById('post-training-title').value.trim();
    const institute   = document.getElementById('post-training-institute').value.trim();
    const phone       = document.getElementById('post-training-phone').value.trim();
    const description = document.getElementById('post-training-description').value.trim();
    const category    = document.getElementById('post-training-category').value;

    if (!title)       { alert('কোর্সের নাম লিখুন!'); return; }
    if (!institute)   { alert('প্রতিষ্ঠানের নাম লিখুন!'); return; }
    if (!phone)       { alert('যোগাযোগের নম্বর দিন!'); return; }
    if (!description) { alert('কোর্সের বিস্তারিত লিখুন!'); return; }

    const btn = document.getElementById('post-training-submit-btn');
    btn.disabled = true;
    btn.innerHTML = `<i class="fas fa-spinner fa-spin mr-2"></i> প্রকাশ হচ্ছে...`;

    try {
      await firestore.collection('training_courses').add({
        title, institute, phone, description, category,
        duration:   document.getElementById('post-training-duration').value.trim() || null,
        fee:        document.getElementById('post-training-fee').value.trim() || null,
        country:    document.getElementById('post-training-country').value.trim() || null,
        deadline:   document.getElementById('post-training-deadline').value || null,
        location:   document.getElementById('post-training-location').value.trim() || null,
        postedBy:   currentUser.uid,
        posterName: currentUser.displayName || '',
        status: 'active',
        enrollCount: 0,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      closePostTrainingModal();
      showToast('কোর্স সফলভাবে প্রকাশিত হয়েছে! ✅');
      loadTrainingList();
    } catch (e) {
      alert('কোর্স প্রকাশ হয়নি: ' + e.message);
    } finally {
      btn.disabled = false;
      btn.innerHTML = `<i class="fas fa-paper-plane"></i> কোর্স প্রকাশ করুন`;
    }
  }

  function openTrainingApplyModal(courseId, title, institute) {
    if (!currentUser) { alert('আবেদন করতে লগইন করুন!'); return; }
    document.getElementById('training-apply-id').value = courseId;
    document.getElementById('training-apply-course-label').textContent = `${title} — ${institute}`;
    ['training-apply-name','training-apply-phone','training-apply-age','training-apply-education','training-apply-country','training-apply-experience']
      .forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
    const nameEl = document.getElementById('training-apply-name');
    if (nameEl && currentUser.displayName) nameEl.value = currentUser.displayName;
    const saved = safeJSONParse(localStorage.getItem('user_profile_data'), {});
    const phoneEl = document.getElementById('training-apply-phone');
    if (phoneEl && saved.phone) phoneEl.value = saved.phone;
    document.getElementById('training-apply-modal').classList.remove('hidden');
  }

  function closeTrainingApplyModal() {
    document.getElementById('training-apply-modal').classList.add('hidden');
  }

  async function submitTrainingApplication() {
    const courseId = document.getElementById('training-apply-id').value;
    const name     = document.getElementById('training-apply-name').value.trim();
    const phone    = document.getElementById('training-apply-phone').value.trim();

    if (!name)  { alert('আপনার নাম লিখুন!'); return; }
    if (!phone) { alert('মোবাইল নম্বর দিন!'); return; }

    const btn = document.getElementById('training-apply-submit-btn');
    btn.disabled = true;
    btn.innerHTML = `<i class="fas fa-spinner fa-spin mr-2"></i> পাঠানো হচ্ছে...`;

    try {
      await firestore.collection('training_courses').doc(courseId).collection('enrollments').add({
        applicantUid:   currentUser.uid,
        applicantName:  name,
        applicantPhone: phone,
        age:        document.getElementById('training-apply-age').value || null,
        education:  document.getElementById('training-apply-education').value.trim() || null,
        country:    document.getElementById('training-apply-country').value.trim() || null,
        experience: document.getElementById('training-apply-experience').value.trim() || null,
        status: 'পেন্ডিং',
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      await firestore.collection('training_courses').doc(courseId).update({
        enrollCount: firebase.firestore.FieldValue.increment(1)
      });
      closeTrainingApplyModal();
      showToast('ভর্তির আবেদন সফলভাবে পাঠানো হয়েছে! 🎓');
    } catch (e) {
      alert('আবেদন পাঠানো হয়নি: ' + e.message);
    } finally {
      btn.disabled = false;
      btn.innerHTML = `<i class="fas fa-paper-plane"></i> ভর্তির আবেদন পাঠান`;
    }
  }

  // ============================================================
  // ✅ পার্ট টাইম জব বোর্ড সিস্টেম
  // ============================================================

  let allJobsCache = [];
  let currentJobTab = 'all';
  let currentJobCategory = 'official';

  function openJobBoardModal() {
    document.getElementById('job-board-modal').classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    loadJobList();
  }

  function closeJobBoardModal() {
    document.getElementById('job-board-modal').classList.add('hidden');
    document.body.style.overflow = 'auto';
  }

  function switchJobTab(tab) {
    currentJobTab = tab;
    ['all', 'official', 'unofficial'].forEach(t => {
      const btn = document.getElementById(`job-tab-${t}`);
      if (t === tab) {
        btn.className = 'flex-1 py-3 text-[11px] font-black text-indigo-600 border-b-2 border-indigo-600 transition-all';
      } else {
        btn.className = 'flex-1 py-3 text-[11px] font-bold text-slate-500 border-b-2 border-transparent transition-all';
      }
    });
    renderJobList();
  }

  function filterJobList() {
    renderJobList();
  }

  async function loadJobList() {
    const area = document.getElementById('job-list-area');
    area.innerHTML = `<div class='flex flex-col items-center justify-center py-12 text-slate-400'><i class='fas fa-spinner fa-spin text-2xl mb-2'></i><p class='text-xs'>লোড হচ্ছে...</p></div>`;
    try {
      const snap = await firestore.collection('job_circulars')
        .where('status', '==', 'active')
        .orderBy('createdAt', 'desc')
        .limit(50)
        .get();
      allJobsCache = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      renderJobList();
    } catch (e) {
      console.error('Job load error:', e);
      area.innerHTML = `<div class='text-center py-10 text-slate-400'><i class='fas fa-exclamation-circle text-2xl mb-2'></i><p class='text-xs'>লোড হয়নি। আবার চেষ্টা করুন।</p></div>`;
    }
  }

  function renderJobList() {
    const area = document.getElementById('job-list-area');
    const query = (document.getElementById('job-search-input')?.value || '').toLowerCase();

    let filtered = allJobsCache.filter(j => {
      if (currentJobTab === 'official' && j.category !== 'official') return false;
      if (currentJobTab === 'unofficial' && j.category !== 'unofficial') return false;
      if (query) {
        const haystack = `${j.title} ${j.company} ${j.location || ''}`.toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      return true;
    });

    if (filtered.length === 0) {
      area.innerHTML = `<div class='flex flex-col items-center justify-center py-14 text-slate-400'>
        <i class='fas fa-briefcase text-3xl mb-3 opacity-40'></i>
        <p class='text-xs font-bold'>কোনো সার্কুলার পাওয়া যায়নি</p>
        <p class='text-[10px] mt-1'>নতুন সার্কুলার দিন অথবা পরে আসুন</p>
      </div>`;
      return;
    }

    area.innerHTML = filtered.map(job => {
      const isOfficial = job.category === 'official';
      const badgeColor = isOfficial ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700';
      const badgeLabel = isOfficial ? '🏢 অফিসিয়াল' : '🤝 আনঅফিসিয়াল';
      const deadlineStr = job.deadline ? `<span class='text-[9px] text-rose-500 font-bold'>📅 শেষ: ${job.deadline}</span>` : '';
      const salaryStr = job.salary ? `<span class='text-[9px] text-emerald-600 font-bold'>💰 ${job.salary}</span>` : '';
      const locationStr = job.location ? `<span class='text-[9px] text-slate-500'><i class='fas fa-location-dot'></i> ${escapeHtml(job.location)}</span>` : '';

      return `<div class='bg-white rounded-2xl border border-slate-200 p-4 shadow-sm active:scale-[0.99] transition'>
        <div class='flex items-start justify-between gap-2 mb-2'>
          <div class='flex-1'>
            <h4 class='font-black text-sm text-slate-800'>${escapeHtml(job.title)}</h4>
            <p class='text-[11px] text-slate-500 mt-0.5 font-medium'>${escapeHtml(job.company)}</p>
          </div>
          <span class='shrink-0 text-[9px] font-black px-2 py-0.5 rounded-full ${badgeColor}'>${badgeLabel}</span>
        </div>
        <p class='text-[10px] text-slate-600 leading-relaxed line-clamp-2 mb-2'>${escapeHtml(job.description || '')}</p>
        <div class='flex flex-wrap gap-2 mb-3'>
          ${salaryStr}${deadlineStr}${locationStr}
        </div>
        <div class='flex gap-2'>
          <button onclick='openJobApplyModal("${job.id}", "${escapeHtml(job.title)}", "${escapeHtml(job.company)}", "${escapeHtml(job.phone || '')}")'
            class='flex-1 bg-gradient-to-r from-indigo-500 to-violet-600 text-white text-[10px] font-black py-2 rounded-xl active:scale-95 transition'>
            <i class='fas fa-paper-plane mr-1'></i> আবেদন করুন
          </button>
          <a href='tel:${escapeHtml(job.phone || '')}' class='w-9 h-9 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center active:scale-95 transition'>
            <i class='fas fa-phone text-sm'></i>
          </a>
        </div>
      </div>`;
    }).join('');
  }

  function selectJobCategory(cat) {
    currentJobCategory = cat;
    document.getElementById('post-job-category').value = cat;
    const officialBtn = document.getElementById('job-cat-official-btn');
    const unofficialBtn = document.getElementById('job-cat-unofficial-btn');
    if (cat === 'official') {
      officialBtn.className = 'py-2.5 rounded-xl border-2 border-indigo-500 bg-indigo-50 text-indigo-700 text-[11px] font-black active:scale-95 transition';
      unofficialBtn.className = 'py-2.5 rounded-xl border-2 border-slate-200 text-slate-500 text-[11px] font-black active:scale-95 transition';
    } else {
      unofficialBtn.className = 'py-2.5 rounded-xl border-2 border-amber-500 bg-amber-50 text-amber-700 text-[11px] font-black active:scale-95 transition';
      officialBtn.className = 'py-2.5 rounded-xl border-2 border-slate-200 text-slate-500 text-[11px] font-black active:scale-95 transition';
    }
  }

  function openPostJobModal() {
    if (!currentUser) { alert('সার্কুলার দিতে প্রথমে লগইন করুন!'); return; }
    document.getElementById('post-job-modal').classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    selectJobCategory('official');
    ['post-job-title','post-job-company','post-job-salary','post-job-deadline','post-job-description','post-job-phone','post-job-location'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
  }

  function closePostJobModal() {
    document.getElementById('post-job-modal').classList.add('hidden');
  }

  async function submitJobPost() {
    const title       = document.getElementById('post-job-title').value.trim();
    const company     = document.getElementById('post-job-company').value.trim();
    const phone       = document.getElementById('post-job-phone').value.trim();
    const description = document.getElementById('post-job-description').value.trim();
    const category    = document.getElementById('post-job-category').value;

    if (!title)       { alert('পদের নাম লিখুন!'); return; }
    if (!company)     { alert('প্রতিষ্ঠানের নাম লিখুন!'); return; }
    if (!phone)       { alert('যোগাযোগের নম্বর দিন!'); return; }
    if (!description) { alert('কাজের বিবরণ লিখুন!'); return; }

    const btn = document.getElementById('post-job-submit-btn');
    btn.disabled = true;
    btn.innerHTML = `<i class="fas fa-spinner fa-spin mr-2"></i> প্রকাশ হচ্ছে...`;

    try {
      await firestore.collection('job_circulars').add({
        title,
        company,
        phone,
        description,
        category,
        salary:   document.getElementById('post-job-salary').value.trim() || null,
        deadline: document.getElementById('post-job-deadline').value || null,
        location: document.getElementById('post-job-location').value.trim() || null,
        postedBy:   currentUser.uid,
        posterName: currentUser.displayName || '',
        status: 'active',
        applicantCount: 0,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });

      closePostJobModal();
      showToast('সার্কুলার সফলভাবে প্রকাশিত হয়েছে! ✅');
      loadJobList();
    } catch (e) {
      alert('সার্কুলার প্রকাশ হয়নি: ' + e.message);
    } finally {
      btn.disabled = false;
      btn.innerHTML = `<i class="fas fa-paper-plane"></i> সার্কুলার প্রকাশ করুন`;
    }
  }

  function openJobApplyModal(jobId, jobTitle, company, phone) {
    if (!currentUser) { alert('আবেদন করতে লগইন করুন!'); return; }
    document.getElementById('apply-job-id').value = jobId;
    document.getElementById('apply-job-title-label').textContent = `${jobTitle} — ${company}`;
    ['apply-name','apply-phone','apply-education','apply-experience','apply-cover'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    const nameEl = document.getElementById('apply-name');
    const phoneEl = document.getElementById('apply-phone');
    if (nameEl && currentUser.displayName) nameEl.value = currentUser.displayName;
    const saved = safeJSONParse(localStorage.getItem('user_profile_data'), {});
    if (phoneEl && saved.phone) phoneEl.value = saved.phone;
    document.getElementById('job-apply-modal').classList.remove('hidden');
  }

  function closeJobApplyModal() {
    document.getElementById('job-apply-modal').classList.add('hidden');
  }

  async function submitJobApplication() {
    const jobId  = document.getElementById('apply-job-id').value;
    const name   = document.getElementById('apply-name').value.trim();
    const phone  = document.getElementById('apply-phone').value.trim();
    const cover  = document.getElementById('apply-cover').value.trim();

    if (!name)  { alert('আপনার নাম লিখুন!'); return; }
    if (!phone) { alert('মোবাইল নম্বর দিন!'); return; }

    const btn = document.getElementById('job-apply-submit-btn');
    btn.disabled = true;
    btn.innerHTML = `<i class="fas fa-spinner fa-spin mr-2"></i> পাঠানো হচ্ছে...`;

    try {
      await firestore.collection('job_circulars').doc(jobId).collection('applications').add({
        applicantUid:   currentUser.uid,
        applicantName:  name,
        applicantPhone: phone,
        education:   document.getElementById('apply-education').value.trim() || null,
        experience:  document.getElementById('apply-experience').value.trim() || null,
        coverLetter: cover || null,
        status: 'পেন্ডিং',
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });

      // আবেদন সংখ্যা বাড়াও
      await firestore.collection('job_circulars').doc(jobId).update({
        applicantCount: firebase.firestore.FieldValue.increment(1)
      });

      closeJobApplyModal();
      showToast('আবেদন সফলভাবে পাঠানো হয়েছে! 🎉');
    } catch (e) {
      alert('আবেদন পাঠানো হয়নি: ' + e.message);
    } finally {
      btn.disabled = false;
      btn.innerHTML = `<i class="fas fa-paper-plane"></i> আবেদন পাঠান`;
    }
  }

  // ✅ আমার বুকিং দেখো
  async function openMyBookings() {
    const modal = document.getElementById('my-bookings-modal');
    const listEl = document.getElementById('my-bookings-list');
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';

    if (!currentUser) {
      listEl.innerHTML = `<div class="text-center py-8 text-slate-400 text-xs">লগইন করুন বুকিং দেখতে</div>`;
      return;
    }

    listEl.innerHTML = `<div class="text-center py-8 text-slate-400 text-xs"><i class="fas fa-spinner fa-spin text-xl mb-2 block"></i> লোড হচ্ছে...</div>`;

    try {
      const snap = await firebase.firestore().collection('service_bookings')
        .where('customerUid', '==', currentUser.uid)
        .get();

      const bookings = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));

      if (bookings.length === 0) {
        listEl.innerHTML = `<div class="text-center py-8 text-slate-400 text-xs"><i class="fas fa-ticket text-2xl text-slate-200 mb-2 block"></i> এখনো কোনো বুকিং নেই</div>`;
        return;
      }

      const typeIcons = { taxi:'fa-taxi', bike:'fa-motorcycle', airbus:'fa-bus', ticket:'fa-ticket', helicopter:'fa-helicopter', airticket:'fa-plane-departure', tourguide:'fa-map-marked-alt', hotel:'fa-hotel', hajj:'fa-kaaba', mobile_repair:'fa-mobile-screen-button', car_repair:'fa-screwdriver-wrench' };
      const typeColors = { taxi:'bg-orange-100 text-orange-600', bike:'bg-blue-100 text-blue-600', airbus:'bg-emerald-100 text-emerald-600', ticket:'bg-violet-100 text-violet-600', helicopter:'bg-sky-100 text-sky-600', airticket:'bg-indigo-100 text-indigo-600', tourguide:'bg-emerald-100 text-emerald-600', hotel:'bg-amber-100 text-amber-600', hajj:'bg-teal-100 text-teal-600', mobile_repair:'bg-rose-100 text-rose-600', car_repair:'bg-slate-100 text-slate-700' };

      listEl.innerHTML = bookings.map(b => {
        const date = b.createdAt ? new Date(b.createdAt.seconds * 1000).toLocaleDateString('bn-BD') : '';
        return `
          <div class="bg-white border border-slate-100 rounded-2xl p-3 shadow-sm">
            <div class="flex items-center gap-3 mb-2">
              <div class="w-9 h-9 rounded-xl ${typeColors[b.serviceType] || 'bg-slate-100 text-slate-500'} flex items-center justify-center shrink-0">
                <i class="fas ${typeIcons[b.serviceType] || 'fa-ticket'} text-sm"></i>
              </div>
              <div class="flex-1">
                <p class="text-xs font-black text-slate-800">${b.serviceName || b.serviceType}</p>
                <p class="text-[9px] text-slate-400">${date} • ID: ${b.id.substring(0,8)}...</p>
              </div>
              <span class="text-[9px] font-bold px-2 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">${b.status}</span>
            </div>
            <div class="text-[10px] text-slate-500 space-y-0.5 pl-12">
              ${b.from && b.to ? `<p>📍 ${b.from} → ${b.to}</p>` : ''}
              ${b.pickup ? `<p>📍 ${b.pickup}</p>` : ''}
              ${b.date ? `<p>📅 ${b.date} ${b.time || ''}</p>` : ''}
              ${b.vehicle ? `<p>🚗 ${b.vehicle}</p>` : ''}
            </div>
          </div>`;
      }).join('');

    } catch(e) {
      listEl.innerHTML = `<div class="text-center py-6 text-red-400 text-xs">Firebase Rules চেক করুন!</div>`;
    }
  }


  // ============================================================
  // ✅ ANALYTICS DASHBOARD
  // ============================================================
  let analyticsData = { orders: [], period: 'week' };

  async function loadAnalytics(period = 'week') {
    analyticsData.period = period;

    // বাটন স্টাইল আপডেট
    document.getElementById('analytics-week-btn')?.classList.toggle('bg-white/20', period === 'week');
    document.getElementById('analytics-week-btn')?.classList.toggle('text-white', period === 'week');
    document.getElementById('analytics-week-btn')?.classList.toggle('text-white/70', period !== 'week');
    document.getElementById('analytics-month-btn')?.classList.toggle('bg-white/20', period === 'month');
    document.getElementById('analytics-month-btn')?.classList.toggle('text-white', period === 'month');
    document.getElementById('analytics-month-btn')?.classList.toggle('text-white/70', period !== 'month');

    const daysBack = period === 'week' ? 7 : 30;
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - daysBack);

    // ✅ NEW: মাল্টি-ভেন্ডর ফিক্স — সেলার এখন শুধু নিজের অর্ডার/বিক্রি দেখবে, অ্যাডমিন সবার সব দেখবে
    const isSellerScoped = currentUserRole === 'seller' && currentUser && !ADMIN_EMAILS.includes(currentUser.email);

    try {
      let allOrders;
      if (isSellerScoped) {
        // ✅ array-contains + তারিখ রেঞ্জ একসাথে দিলে Firestore composite index লাগবে,
        // তাই এখানে শুধু sellerUids দিয়ে আনা হচ্ছে, তারিখ ফিল্টার/সর্ট ক্লায়েন্ট-সাইডে হচ্ছে
        const snap = await firestore.collection('orders')
          .where('sellerUids', 'array-contains', currentUser.uid)
          .limit(500)
          .get();
        allOrders = snap.docs.map(d => ({ id: d.id, ...d.data() }))
          .filter(o => (o.createdAt?.seconds || 0) * 1000 >= fromDate.getTime())
          .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      } else {
        // ✅ [FIX #4] সব orders না এনে শুধু নির্দিষ্ট period-এর orders আনো
        // এতে Firestore read কমবে এবং পারফরম্যান্স বাড়বে
        const snap = await firestore.collection('orders')
          .where('createdAt', '>=', firebase.firestore.Timestamp.fromDate(fromDate))
          .orderBy('createdAt', 'desc')
          .limit(500)
          .get();
        allOrders = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      }

      // Period filter (Firestore already filtered, allOrders = filteredOrders)
      const filteredOrders = allOrders;

      analyticsData.orders = filteredOrders;

      // ✅ সেলার-স্কোপড হলে প্রতিটা অর্ডারে শুধু নিজের আইটেমগুলো ধরা হচ্ছে —
      // মাল্টি-ভেন্ডর কার্টে একই অর্ডারে অন্য সেলারের পণ্যও থাকতে পারে, তাই পুরো totalAmount নেওয়া যাবে না
      const myItemsOf = (o) => isSellerScoped
        ? (o.items || []).filter(item => item.sellerUid === currentUser.uid)
        : (o.items || []);
      filteredOrders.forEach(o => {
        o._scopedRevenue = isSellerScoped
          ? myItemsOf(o).reduce((s, item) => s + (item.price || 0) * (item.quantity || 0), 0)
          : (o.totalAmount || 0);
      });

      // মোট অর্ডার
      const totalOrders   = filteredOrders.length;
      const totalRevenue  = filteredOrders.filter(o => o.status === 'ডেলিভারড ✅').reduce((s, o) => s + o._scopedRevenue, 0);
      const pendingOrders = filteredOrders.filter(o => o.status === 'পেন্ডিং 🕐').length;

      const deliveredCount = filteredOrders.filter(o => o.status === 'ডেলিভারড ✅').length;
      // ✅ NEW (feature-19): conversion rate = delivered / total
      const convRate = totalOrders > 0 ? Math.round((deliveredCount / totalOrders) * 100) : 0;

      document.getElementById('analytics-total-orders').innerText  = totalOrders;
      document.getElementById('analytics-total-revenue').innerText = '৳' + totalRevenue.toLocaleString('bn-BD');
      document.getElementById('analytics-pending-orders').innerText = pendingOrders;
      document.getElementById('analytics-orders-change').innerText = `গত ${daysBack} দিনে`;
      document.getElementById('analytics-revenue-change').innerText = isSellerScoped ? 'আপনার পণ্যের বিক্রি থেকে' : 'ডেলিভারড অর্ডার থেকে';

      // Conversion rate badge
      const convEl = document.getElementById('analytics-conversion-rate');
      if (convEl) {
        convEl.innerHTML = `<span class='text-lg font-black ${convRate >= 70 ? 'text-emerald-700' : convRate >= 40 ? 'text-amber-700' : 'text-red-600'}'>${convRate}%</span>`;
      }
      const convLabelEl = document.getElementById('analytics-conversion-label');
      if (convLabelEl) convLabelEl.innerText = `${deliveredCount}/${totalOrders} ডেলিভারড`;

      // সেরা পণ্য — টপ ৫ লিস্ট (সেলার-স্কোপড হলে শুধু নিজের পণ্য গণনা হবে)
      const productSales = {};
      filteredOrders.forEach(o => myItemsOf(o).forEach(item => {
        if (!productSales[item.name]) productSales[item.name] = { qty: 0, revenue: 0, image: item.image };
        productSales[item.name].qty     += item.quantity || 0;
        productSales[item.name].revenue += (item.price || 0) * (item.quantity || 0);
      }));
      renderBestSellers(productSales);

      // কাস্টমার অ্যানালিটিক্স — মোট, নতুন, এলাকা ভিত্তিক
      renderCustomerAnalytics(filteredOrders, allOrders);

      // পেমেন্ট breakdown
      const paymentCounts = { cod: 0, bkash: 0, nagad: 0, rocket: 0, qr: 0, emi: 0 };
      filteredOrders.forEach(o => { if (paymentCounts[o.paymentMethod] !== undefined) paymentCounts[o.paymentMethod]++; });
      document.getElementById('analytics-cod-count').innerText    = paymentCounts.cod    + ' টি';
      document.getElementById('analytics-bkash-count').innerText  = paymentCounts.bkash  + ' টি';
      document.getElementById('analytics-nagad-count').innerText  = paymentCounts.nagad  + ' টি';
      document.getElementById('analytics-rocket-count').innerText = paymentCounts.rocket + ' টি';
      document.getElementById('analytics-qr-count').innerText     = paymentCounts.qr     + ' টি';
      document.getElementById('analytics-emi-count').innerText    = paymentCounts.emi    + ' টি';

      // Bar Chart — দৈনিক বিক্রি
      renderAnalyticsChart(filteredOrders, daysBack);

    } catch (e) {
      console.error("Analytics error:", e);
    }
  }

  // ✅ NEW (feature-19): SVG Line Chart — revenue trend with hover tooltips
  function renderAnalyticsChart(orders, daysBack) {
    const barsEl   = document.getElementById('analytics-chart-bars');
    const labelsEl = document.getElementById('analytics-chart-labels');
    if (!barsEl) return;

    const dailyRevenue = {};
    const dailyOrders  = {};
    const labels = [];
    for (let i = daysBack - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      dailyRevenue[key] = 0;
      dailyOrders[key]  = 0;
      labels.push(d.getDate() + '/' + (d.getMonth() + 1));
    }
    orders.forEach(o => {
      if (!o.createdAt?.seconds) return;
      const key = new Date(o.createdAt.seconds * 1000).toISOString().split('T')[0];
      if (dailyRevenue[key] !== undefined) {
        dailyRevenue[key] += (o._scopedRevenue !== undefined ? o._scopedRevenue : (o.totalAmount || 0));
        dailyOrders[key]  += 1;
      }
    });

    const values    = Object.values(dailyRevenue);
    const orderVals = Object.values(dailyOrders);
    const maxVal    = Math.max(...values, 1);
    const n         = values.length;

    const W = 280, H = 72, pad = 10;
    const pts = values.map((v, i) => {
      const x = pad + (i / Math.max(n - 1, 1)) * (W - pad * 2);
      const y = H - pad - ((v / maxVal) * (H - pad * 2));
      return [Math.round(x * 10) / 10, Math.round(y * 10) / 10];
    });
    const polyline = pts.map(p => p[0] + ',' + p[1]).join(' ');
    const fillPath = 'M' + pts[0][0] + ',' + (H - pad) + ' ' +
      pts.map(p => 'L' + p[0] + ',' + p[1]).join(' ') +
      ' L' + pts[n - 1][0] + ',' + (H - pad) + ' Z';

    // ✅ NEW (feature-20, dark-mode polish): আগে axis/gridline-এর রঙ হার্ডকোড করা ছিল
    // (#f1f5f9, #e2e8f0) — যা ডার্ক মোডে গাঢ় ব্যাকগ্রাউন্ডের সাথে প্রায় অদৃশ্য হয়ে যেত
    const isDarkChart = document.documentElement.classList.contains('dark');
    const axisColor19 = isDarkChart ? '#334155' : '#e2e8f0';
    const gridColor19 = isDarkChart ? '#1e293b' : '#f1f5f9';
    const dotStroke19  = isDarkChart ? '#161e2e' : '#fff';

    const gridLines = [0.25, 0.5, 0.75].map(r => {
      const gy = H - pad - r * (H - pad * 2);
      return '<line x1="' + pad + '" y1="' + gy + '" x2="' + (W - pad) + '" y2="' + gy + '" stroke="' + gridColor19 + '" stroke-width="1" stroke-dasharray="3,3"/>'
        + '<text x="' + (pad + 2) + '" y="' + (gy - 2) + '" font-size="5" fill="#94a3b8">৳' + Math.round(maxVal * r).toLocaleString() + '</text>';
    }).join('');

    const circles = pts.map((p, i) =>
      '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="3" fill="#6366f1" stroke="' + dotStroke19 + '" stroke-width="1.5" class="cursor-pointer"><title>' + labels[i] + ': ৳' + values[i].toLocaleString() + ' (' + orderVals[i] + ' অর্ডার)</title></circle>'
    ).join('');

    barsEl.innerHTML = '<svg viewBox="0 0 ' + W + ' ' + H + '" class="w-full h-20" xmlns="http://www.w3.org/2000/svg">'
      + '<defs><linearGradient id="areaGrad19" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#6366f1"/><stop offset="100%" stop-color="#6366f1" stop-opacity="0"/></linearGradient></defs>'
      + '<line x1="' + pad + '" y1="' + pad + '" x2="' + pad + '" y2="' + (H - pad) + '" stroke="' + axisColor19 + '" stroke-width="1"/>'
      + '<line x1="' + pad + '" y1="' + (H - pad) + '" x2="' + (W - pad) + '" y2="' + (H - pad) + '" stroke="' + axisColor19 + '" stroke-width="1"/>'
      + gridLines
      + '<path d="' + fillPath + '" fill="url(#areaGrad19)" opacity="0.25"/>'
      + '<polyline points="' + polyline + '" fill="none" stroke="#6366f1" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>'
      + circles
      + '</svg>';

    const showEvery = daysBack <= 7 ? 1 : Math.ceil(daysBack / 7);
    labelsEl.innerHTML = labels.map((l, i) =>
      '<span class="' + (i % showEvery === 0 ? '' : 'opacity-0') + '">' + l + '</span>'
    ).join('');
  }

  // ============================================================
  // ✅ BEST SELLING PRODUCTS — টপ ৫ লিস্ট
  // ============================================================
  function renderBestSellers(productSales) {
    const listEl = document.getElementById('analytics-bestsellers-list');
    if (!listEl) return;
    const sorted = Object.entries(productSales).sort((a, b) => b[1].qty - a[1].qty).slice(0, 5);
    if (sorted.length === 0) {
      listEl.innerHTML = `<div class='text-center py-3 text-slate-400 text-[10px]'>এই সময়ে কোনো বিক্রি নেই</div>`;
      return;
    }
    const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'];
    listEl.innerHTML = sorted.map(([name, data], i) => `
      <div class='flex items-center gap-2 bg-slate-50 border border-slate-100 rounded-xl p-2'>
        <span class='text-sm w-5 text-center shrink-0'>${medals[i] || (i+1)}</span>
        <img loading="lazy" src='${data.image || ''}' class='w-8 h-8 rounded-lg object-cover border border-white shadow-sm shrink-0' onerror="this.src='https://placehold.co/32x32/f1f5f9/94a3b8?text=?'"/>
        <span class='text-[10px] font-bold text-slate-700 flex-1 truncate'>${name}</span>
        <div class='text-right shrink-0'>
          <p class='text-[10px] font-black text-emerald-600'>${data.qty} বিক্রি</p>
          <p class='text-[8px] text-slate-400'>৳${Math.round(data.revenue).toLocaleString('bn-BD')}</p>
        </div>
      </div>`).join('');
  }

  // ============================================================
  // ✅ CUSTOMER ANALYTICS — মোট কাস্টমার, নতুন বনাম পুরাতন, এলাকা ভিত্তিক
  // ============================================================
  function renderCustomerAnalytics(periodOrders, allOrders) {
    // ইউনিক কাস্টমার চেনার জন্য ফোন নম্বর ব্যবহার করি (uid না থাকলেও কাজ করে)
    const periodPhones = new Set(periodOrders.map(o => o.customerPhone).filter(Boolean));
    const totalCustomers = periodPhones.size;

    // এই পিরিয়ডের আগে যাদের অর্ডার ছিল, তারা পুরাতন কাস্টমার
    const earliestInPeriod = periodOrders.reduce((min, o) => {
      const t = o.createdAt?.seconds || 0;
      return min === null || t < min ? t : min;
    }, null);
    const priorPhones = new Set(
      allOrders
        .filter(o => earliestInPeriod !== null && (o.createdAt?.seconds || 0) < earliestInPeriod)
        .map(o => o.customerPhone)
        .filter(Boolean)
    );
    let newCustomers = 0;
    periodPhones.forEach(phone => { if (!priorPhones.has(phone)) newCustomers++; });

    const totalEl = document.getElementById('analytics-total-customers');
    const newEl   = document.getElementById('analytics-new-customers');
    if (totalEl) totalEl.innerText = totalCustomers;
    if (newEl)   newEl.innerText   = `${newCustomers} জন নতুন`;

    // এলাকা ভিত্তিক ব্রেকডাউন (deliveryDistrict থেকে)
    const areaCounts = {};
    periodOrders.forEach(o => {
      const area = (o.deliveryDistrict || '').split(',')[0].trim() || 'অজানা এলাকা';
      areaCounts[area] = (areaCounts[area] || 0) + 1;
    });
    const sortedAreas = Object.entries(areaCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const areaEl = document.getElementById('analytics-area-breakdown');
    if (!areaEl) return;
    if (sortedAreas.length === 0) {
      areaEl.innerHTML = `<div class='text-center py-3 text-slate-400 text-[10px]'>এলাকার তথ্য পাওয়া যায়নি</div>`;
      return;
    }
    const maxCount = sortedAreas[0][1];
    areaEl.innerHTML = sortedAreas.map(([area, count]) => `
      <div class='flex items-center gap-2'>
        <span class='text-[10px] text-slate-600 w-20 truncate shrink-0'>${area}</span>
        <div class='flex-1 bg-slate-100 rounded-full h-2 overflow-hidden'>
          <div class='bg-sky-500 h-2 rounded-full' style='width:${Math.max(6, Math.round((count/maxCount)*100))}%'></div>
        </div>
        <span class='text-[10px] font-bold text-slate-700 w-10 text-right shrink-0'>${count} টি</span>
      </div>`).join('');
  }

  // ============================================================
  // ✅ ORDER EXPORT — Excel (CSV) ফাইলে ডাউনলোড
  // ============================================================
  function exportOrdersToExcel() {
    const orders = analyticsData.orders || [];
    if (orders.length === 0) { showCartToast('এই সময়ে কোনো অর্ডার নেই এক্সপোর্ট করার জন্য', 'warning'); return; }

    const paymentLabels = { bkash:'বিকাশ', nagad:'নগদ', rocket:'রকেট', qr:'QR কোড', emi:'EMI/কিস্তি', cod:'ক্যাশ অন ডেলিভারি' };
    const headers = ['অর্ডার আইডি','তারিখ','কাস্টমারের নাম','মোবাইল','ঠিকানা','এলাকা','পণ্যসমূহ','সাবটোটাল','ডেলিভারি চার্জ','মোট টাকা','পেমেন্ট পদ্ধতি','ট্রানজেকশন আইডি','স্ট্যাটাস'];

    const escapeCsv = (val) => {
      const s = String(val ?? '').replace(/"/g, '""');
      return `"${s}"`;
    };

    const rows = orders.map(o => {
      const dateStr = o.createdAt?.seconds ? new Date(o.createdAt.seconds * 1000).toLocaleString('bn-BD') : '';
      const itemsStr = (o.items || []).map(it => `${it.name} x${it.quantity}`).join('; ');
      return [
        o.id, dateStr, o.customerName, o.customerPhone, o.customerAddress,
        o.deliveryDistrict || '', itemsStr, o.subtotal || 0, o.deliveryCharge || 0,
        o.totalAmount || 0, paymentLabels[o.paymentMethod] || o.paymentMethod || '', o.txId || '', o.status || ''
      ].map(escapeCsv).join(',');
    });

    const csvContent = headers.map(escapeCsv).join(',') + '\n' + rows.join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `BD BiG BAZZAR-store-orders-${analyticsData.period}-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    showCartToast(`${orders.length} টি অর্ডার এক্সপোর্ট হয়েছে ✅`, 'success');
  }


  // ============================================================
  // ✅ LOW STOCK ALERT
  // ============================================================
  function checkLowStockAlert() {
    const threshold = parseInt(document.getElementById('low-stock-threshold')?.value || '5');
    const lowStockProducts = products.filter(p => p.stock <= threshold && p.stock >= 0);

    const badge   = document.getElementById('low-stock-badge');
    const listEl  = document.getElementById('low-stock-list');

    if (badge)  badge.innerText  = lowStockProducts.length;
    if (!listEl) return;

    if (lowStockProducts.length === 0) {
      listEl.innerHTML = `
        <div class='text-center py-4 text-slate-400 text-xs'>
          <i class='fas fa-box-open text-xl text-slate-200 mb-1 block'></i>
          সব পণ্যের স্টক ঠিক আছে ✅
        </div>`;
      return;
    }

    listEl.innerHTML = lowStockProducts
      .sort((a, b) => a.stock - b.stock)
      .map(p => {
        const urgency = p.stock === 0 ? 'bg-red-50 border-red-200' : p.stock <= 2 ? 'bg-orange-50 border-orange-200' : 'bg-amber-50 border-amber-200';
        const badge   = p.stock === 0 ? 'bg-red-500 text-white' : p.stock <= 2 ? 'bg-orange-500 text-white' : 'bg-amber-400 text-white';
        return `
          <div class='flex items-center gap-2.5 border ${urgency} rounded-xl p-2.5'>
            <img loading="lazy" src='${p.image}' class='w-9 h-9 rounded-lg object-cover border border-white shadow-sm' onerror="this.src='https://placehold.co/40x40/f1f5f9/94a3b8?text=?'"/>
            <div class='flex-1 min-w-0'>
              <p class='text-[10px] font-bold text-slate-700 truncate'>${p.name}</p>
              <p class='text-[9px] text-slate-500'>ক্যাটাগরি: ${p.category || '—'}</p>
            </div>
            <div class='shrink-0 text-center'>
              <span class='${badge} text-[9px] font-black px-2 py-1 rounded-lg block'>
                ${p.stock === 0 ? 'শেষ!' : p.stock + ' টি'}
              </span>
              <button onclick='quickRestockProduct("${p.id}", "${p.name.replace(/"/g,"")}")' class='text-[8px] text-blue-600 font-bold mt-1 hover:underline'>রিস্টক করুন</button>
            </div>
          </div>`;
      }).join('');
  }

  function quickRestockProduct(productId, productName) {
    const qty = prompt(`"${productName}"\n\nকত টি স্টক যোগ করবেন?`, '10');
    if (!qty || isNaN(parseInt(qty))) return;
    const addQty = parseInt(qty);
    const product = products.find(p => p.id == productId);
    if (!product) return;
    product.stock += addQty;
    localStorage.setItem('store_products_inventory', JSON.stringify(products));
    checkLowStockAlert();
    showCartToast(`✅ ${productName}-এ ${addQty}টি স্টক যোগ হয়েছে`);
    // Firestore-এও আপডেট করো (যদি Firestore পণ্য হয়)
    firestore.collection('products').doc(String(productId)).update({ stock: product.stock })
      .catch(e => console.log("Stock update skipped:", e.message));
  }


  // ============================================================
  // ✅ BULK UPLOAD (CSV)
  // ============================================================
  let bulkProductsToUpload = [];

  function downloadBulkTemplate() {
    const csvContent = `name,price,category,sizes,stock,description,image
গর্জিয়াস কটন পাঞ্জাবি,1500,punjabi,"M,L,XL,XXL",20,উন্নত মানের কটন কাপড়ে তৈরি,https://example.com/image.jpg
চামড়ার জুতো,2500,shoe,"40,41,42,43",15,খাঁটি চামড়ার তৈরি দীর্ঘস্থায়ী জুতো,https://example.com/shoe.jpg`;

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href     = url;
    link.download = 'BD BiG BAZZAR-store-bulk-template.csv';
    link.click();
    URL.revokeObjectURL(url);
    showCartToast('📥 টেমপ্লেট ডাউনলোড হচ্ছে...');
  }

  function processBulkUpload(input) {
    if (!input.files || !input.files[0]) return;
    const file = input.files[0];
    const reader = new FileReader();
    reader.onload = function(e) {
      try {
        const text  = e.target.result;
        const lines = text.split('\n').filter(l => l.trim());
        const header = lines[0].split(',').map(h => h.trim().replace(/"/g, '').toLowerCase());
        bulkProductsToUpload = [];

        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
          if (values.length < 3) continue;
          const row = {};
          header.forEach((h, idx) => row[h] = values[idx] || '');

          if (!row.name || !row.price) continue;

          // ✅ [FIX #7] Bulk Upload Validation — অবৈধ ডেটা Firestore-এ যাবে না
          const parsedPrice = parseFloat(row.price);
          const parsedStock = parseInt(row.stock);
          const cleanName   = row.name.trim();

          if (!cleanName || cleanName.length < 2) continue;           // নাম কমপক্ষে ২ অক্ষর
          if (isNaN(parsedPrice) || parsedPrice <= 0) continue;       // দাম অবশ্যই ধনাত্মক
          if (isNaN(parsedStock) || parsedStock < 0) continue;        // স্টক ০ বা তার বেশি
          if (cleanName.length > 150) continue;                       // নাম সর্বোচ্চ ১৫০ অক্ষর

          bulkProductsToUpload.push({
            id:          Date.now() + i,
            name:        cleanName,
            price:       parsedPrice,
            category:    row.category || 'handmade',
            sizes:       row.sizes ? row.sizes.split(';').map(s => s.trim()).filter(Boolean) : ['Free Size'],
            stock:       parsedStock || 0,
            description: (row.description || '').substring(0, 500), // বিবরণ সর্বোচ্চ ৫০০ অক্ষর
            image:       row.image || 'https://placehold.co/400x400/f8fafc/94a3b8?text=পণ্য'
          });
        }

        // Preview দেখাও
        const previewArea = document.getElementById('bulk-preview-area');
        const previewList = document.getElementById('bulk-preview-list');
        const countBadge  = document.getElementById('bulk-product-count');

        if (bulkProductsToUpload.length === 0) {
          showCartToast('CSV-এ কোনো বৈধ পণ্য পাওয়া যায়নি', 'error'); return;
        }

        if (countBadge)  countBadge.innerText  = bulkProductsToUpload.length + ' টি পণ্য';
        if (previewList) previewList.innerHTML  = bulkProductsToUpload.slice(0, 5).map(p => `
          <div class='flex items-center gap-2 bg-slate-50 border border-slate-100 rounded-lg p-2 text-xs'>
            <div class='w-7 h-7 rounded-lg bg-teal-100 flex items-center justify-center shrink-0'>
              <i class='fas fa-box text-teal-600 text-[9px]'></i>
            </div>
            <div class='flex-1 min-w-0'>
              <p class='font-bold text-slate-700 truncate'>${p.name}</p>
              <p class='text-[9px] text-slate-400'>৳${p.price} • ${p.category} • স্টক: ${p.stock}</p>
            </div>
          </div>`).join('') + (bulkProductsToUpload.length > 5 ? `<p class='text-[9px] text-slate-400 text-center font-medium'>... আরও ${bulkProductsToUpload.length - 5} টি পণ্য</p>` : '');
        if (previewArea) previewArea.classList.remove('hidden');
        document.getElementById('bulk-upload-ui').innerHTML = `<i class='fas fa-check-circle text-teal-500 text-xl mb-1'></i><p class='text-[10px] font-bold text-teal-600'>${file.name}</p>`;

      } catch (err) {
        showCartToast('CSV পার্স করতে সমস্যা হয়েছে', 'error');
        console.error(err);
      }
    };
    reader.readAsText(file, 'UTF-8');
  }

  async function confirmBulkUpload() {
    if (bulkProductsToUpload.length === 0) return;
    const confirmUpload = confirm(`${bulkProductsToUpload.length} টি পণ্য আপলোড করবেন?`);
    if (!confirmUpload) return;

    const btn = document.querySelector('[onclick="confirmBulkUpload()"]');
    if (btn) { btn.disabled = true; btn.innerHTML = `<i class="fas fa-spinner fa-spin mr-1.5"></i> আপলোড হচ্ছে...`; }

    let successCount = 0;
    for (const product of bulkProductsToUpload) {
      try {
        // Firestore-এ সেভ করো
        await firestore.collection('products').add({
          ...product,
          sellerUid: currentUser?.uid || null,
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        successCount++;
      } catch (e) {
        // Local fallback
        products.push(product);
      }
    }

    localStorage.setItem('store_products_inventory', JSON.stringify(products));
    bulkProductsToUpload = [];
    document.getElementById('bulk-preview-area')?.classList.add('hidden');
    document.getElementById('bulk-csv-input').value = '';
    document.getElementById('bulk-upload-ui').innerHTML = `<i class='fas fa-image text-slate-400 text-xl mb-1'></i><p class='text-[10px] font-bold text-slate-500'>CSV ফাইল সিলেক্ট করুন</p>`;

    if (btn) { btn.disabled = false; btn.innerHTML = `<i class="fas fa-rocket mr-1.5"></i> সব পণ্য আপলোড করুন`; }
    showCartToast(`✅ ${successCount} টি পণ্য সফলভাবে আপলোড হয়েছে!`);
  }


  // ============================================================
  // ✅ SUPPORT CHAT
  // ============================================================
  let chatMessages = [];
  let chatUserId   = null;

  function initSupportChat() {
    chatUserId = currentUser?.uid || 'guest_' + Date.now();
    loadChatMessages();
  }

  async function loadChatMessages() {
    try {
      const snap = await firestore.collection('support_chats')
        .where('userId', '==', chatUserId)
        .get();

      chatMessages = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0));

      renderChatMessages();

      // Real-time listener
      firestore.collection('support_chats')
        .where('userId', '==', chatUserId)
        .onSnapshot(snap2 => {
          chatMessages = snap2.docs
            .map(d => ({ id: d.id, ...d.data() }))
            .sort((a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0));
          renderChatMessages();
          // Unread badge
          const unread = chatMessages.filter(m => m.sender === 'admin' && !m.read).length;
          const badge  = document.getElementById('chat-unread-badge');
          if (badge) badge.classList.toggle('hidden', unread === 0);
        });
    } catch(e) { console.error("Chat load error:", e); }
  }

  function renderChatMessages() {
    const container = document.getElementById('support-chat-messages');
    if (!container) return;
    const msgs = chatMessages.slice(-30);
    if (msgs.length === 0) {
      container.innerHTML = `
        <div class='flex justify-start'>
          <div class='bg-white border border-slate-200 rounded-2xl rounded-tl-sm px-3 py-2 max-w-[80%] shadow-sm'>
            <p class='text-[11px] text-slate-700'>👋 স্বাগতম! আপনার যেকোনো সমস্যায় আমরা সাহায্য করতে প্রস্তুত।</p>
            <span class='text-[8px] text-slate-400 block mt-1'>Admin • এখন</span>
          </div>
        </div>`;
      return;
    }
    container.innerHTML = msgs.map(m => {
      const isUser = m.sender === 'user';
      const time   = m.createdAt ? new Date(m.createdAt.seconds * 1000).toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' }) : 'এখন';
      return `
        <div class='flex ${isUser ? 'justify-end' : 'justify-start'}'>
          <div class='${isUser ? 'bg-slate-900 text-white rounded-2xl rounded-tr-sm' : 'bg-white border border-slate-200 rounded-2xl rounded-tl-sm'} px-3 py-2 max-w-[80%] shadow-sm'>
            <p class='text-[11px] ${isUser ? 'text-white' : 'text-slate-700'}'>${escapeHtml(m.text)}</p>
            <span class='text-[8px] ${isUser ? 'text-white/60' : 'text-slate-400'} block mt-1'>${isUser ? 'আপনি' : 'Admin'} • ${escapeHtml(time)}</span>
          </div>
        </div>`;
    }).join('');
    container.scrollTop = container.scrollHeight;
  }

  async function sendSupportMessage() {
    const input = document.getElementById('support-chat-input');
    const text  = input?.value.trim();
    if (!text) return;
    input.value = '';

    const message = {
      userId:    chatUserId,
      userName:  currentUser?.displayName || 'কাস্টমার',
      userEmail: currentUser?.email || '',
      sender:    'user',
      text:      text,
      read:      false,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    try {
      await firestore.collection('support_chats').add(message);
      // Admin notification
      await firestore.collection('admin_notifications').add({
        type:          'support_message',
        applicantName: currentUser?.displayName || 'কাস্টমার',
        message:       `💬 নতুন সাপোর্ট মেসেজ: "${text.substring(0, 50)}..."`,
        isRead:        false,
        createdAt:     firebase.firestore.FieldValue.serverTimestamp()
      });
    } catch(e) {
      // Local fallback
      chatMessages.push({ ...message, createdAt: { seconds: Date.now() / 1000 } });
      renderChatMessages();
    }
  }

  // Admin থেকে reply
  async function sendAdminReply(userId, text) {
    if (!text.trim()) return;
    await firestore.collection('support_chats').add({
      userId, sender: 'admin', text: text.trim(), read: false,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
  }

  // ============================================================
  // ✅ LANGUAGE SYSTEM — বাংলা / English টগল
  // ============================================================

  let currentLang = localStorage.getItem('siteLang') || 'bn';

  // সম্পূর্ণ Translation Dictionary
  const TRANSLATIONS = {
    bn: {
      // Meta
      pageTitle:       'পারভেজ স্টোর | BD BIG BAZZAR — অনলাইন শপিং, রাইড ও সার্ভিস',
      metaDesc:        'পারভেজ স্টোর — বাংলাদেশের সেরা অনলাইন শপিং প্ল্যাটফর্ম। হাতের তৈরি পণ্য, মাছ, মাংস, ফল, ভেষজ, ট্যাক্সি, বাইক রাইড, বাস ও ট্রেন টিকিট একটি অ্যাপে।',
      ogLocale:        'bn_BD',
      // Header
      siteTitle:       'পারভেজ স্টোর',
      searchPlaceholder: 'পছন্দের পণ্যটি খুঁজুন...',
      typewriterPrefix: 'আমরা দিচ্ছি',
      typewriterPhrases: ['প্রিমিয়াম মান', 'সেরা দাম', 'দ্রুত ডেলিভারি', 'অরিজিনাল পণ্য', 'বিশ্বস্ত সেবা'],
      // Nav
      navHome:    'হোম',
      navCart:    'কার্ট',
      navLive:    'লাইভ',
      navService: 'সার্ভিস',
      navMenu:    'মেনু',
      navProfile: 'প্রোফাইল',
      // Cart Modal
      cartTitle:       'আপনার শপিং কার্ট',
      cartEmpty:       'আপনার কার্টটি খালি!',
      cartTotal:       'সর্বমোট প্রদেয় মূল্য:',
      cartNameLabel:   'আপনার নাম *',
      cartNamePh:      'উদা: মোঃ আব্দুর রহমান',
      cartPhoneLabel:  'মোবাইল নম্বর *',
      cartPhonePh:     'উদা: 017XXXXXXXX',
      cartAddressLabel:'পূর্ণাঙ্গ ঠিকানা ও ম্যাপ লোকেশন *',
      cartAddressPh:   'উদা: গ্রাম, থানা, জেলা এবং লাইভ ম্যাপ লিংক',
      cartPayLabel:    'পেমেন্ট মেথড সিলেক্ট করুন',
      cartOrderBtn:    'অর্ডার কনফার্ম করুন',
      // Products
      addToCart:       'কার্টে যোগ করুন',
      outOfStock:      'স্টক শেষ',
      selectSize:      'সাইজ সিলেক্ট করুন',
      // Services
      serviceTitle:    'আমাদের সার্ভিস',
      serviceSubtitle: 'বাংলাদেশের যেকোনো প্রান্তে',
      taxiTitle:       'ট্যাক্সি সার্ভিস',
      bikeTitle:       'বাইক রাইড',
      airbusTitle:     'এয়ারবাস সার্ভিস',
      ticketTitle:     'টিকিট সার্ভিস',
      bookNow:         'এখনই বুক করুন 🚀',
      // Profile
      loginTitle:      'স্বাগতম!',
      loginSubtitle:   'কিনুন অথবা বিক্রি করুন',
      loginBtn:        'Google দিয়ে লগইন করুন',
      loginSkip:       'এখন না',
      authSigninTab:   'সাইন ইন',
      authSignupTab:   'সাইন আপ',
      authFullNameLabel:       'পুরো নাম',
      authFullNamePlaceholder: 'আপনার নাম লিখুন',
      authEmailLabel:          'ইমেইল',
      authEmailPlaceholder:    'demo@email.com',
      authPasswordLabel:       'পাসওয়ার্ড',
      authPasswordPlaceholder: 'পাসওয়ার্ড লিখুন',
      authConfirmPasswordLabel:       'পাসওয়ার্ড নিশ্চিত করুন',
      authConfirmPasswordPlaceholder: 'আবার পাসওয়ার্ড লিখুন',
      authRememberMe:      'মনে রাখুন',
      authForgotPassword:  'পাসওয়ার্ড ভুলে গেছেন?',
      authSigninBtn:       'লগইন',
      authSignupBtn:       'অ্যাকাউন্ট তৈরি করুন',
      authOrDivider:       'অথবা',
      authNoAccountText:   'অ্যাকাউন্ট নেই?',
      authHaveAccountText: 'অ্যাকাউন্ট আছে?',
      authSignupLink:      'সাইন আপ',
      authSigninLink:      'সাইন ইন',
      authWelcomeTitle:    'স্বাগতম',
      authWelcomeDesc:     'অসাধারণ সব পণ্য খুঁজে নিন এবং দরজায় পৌঁছে দিন।',
      authWelcomeGetStarted: 'শুরু করুন',
      authWelcomeHaveAccount: 'ইতিমধ্যে অ্যাকাউন্ট আছে?',
      authWelcomeSkip:     'এখন না',
      customerTab:     'কাস্টমার',
      sellerTab:       'সেলার',
      trackOrder:      'অর্ডার / বুকিং ট্র্যাক করুন',
      trackPlaceholder:'আপনার অর্ডার বা বুকিং আইডি লিখুন',
      trackBtn:        'স্ট্যাটাস চেক করুন',
      // Header — Profile (logged out / default)
      profileDefaultName: 'প্রোফাইল',
      profileLoginPrompt: 'লগইন করুন',
      profileViewPrompt:  'প্রোফাইল দেখুন',
      customerFallback:   'কাস্টমার',
      // Search history
      searchHistoryTitle: 'সাম্প্রতিক সার্চ',
      searchHistoryClear: 'মুছে ফেলুন',
      // Promo Banner 1
      promo1Tag:    'ধামাকা অফার 🔥',
      promo1Title:  'সর্বোচ্চ ৫০% ছাড়!',
      promo1Sub:    'সীমিত সময়ের বিশেষ ডিল',
      promo1Btn:    'এখনই দেখুন',
      // Promo Banner 2
      promo2Tag:    'নতুন কালেকশন ✨',
      promo2Title:  'হাতের তৈরি পণ্য',
      promo2Sub:    'ঐতিহ্যবাহী বাংলাদেশী পণ্য',
      promo2Btn:    'কালেকশন দেখুন',
      // Promo Banner 3
      promo3Tag:    'অর্গানিক ফুড 🌿',
      promo3Title:  'তাজা মাছ ও মাংস',
      promo3Sub:    'সরাসরি খামার থেকে আপনার কাছে',
      promo3Btn:    'অর্ডার করুন',
      // Promo Banner 4
      promo4Tag:    'ফ্রি ডেলিভারি 🚚',
      promo4Title:  '৫,০০০৳ এর উপরে',
      promo4Sub:    'সারাদেশে ডেলিভারি সুবিধা',
      promo4Btn:    'এখনই কিনুন',
      // Customer Live Section
      customerLiveTitle: 'কাস্টমারদের লাইভ বাজার',
      goLiveBtn:          'লাইভে আসুন',
      noOneLiveNow:       'এখন কেউ লাইভে নেই',
      // Recently Viewed
      recentlyViewedTitle: 'সম্প্রতি দেখেছেন',
      // Countdown
      todaysDealTitle: 'আজকের ধামাকা অফার',
      todaysDealSub:   'সীমিত সময়ের অফার! বাকি আর মাত্র:',
      hoursLabel:      'জি',
      minutesLabel:    'মি',
      secondsLabel:    'সে',
      // Flash Sale Banner
      flashSaleRunning: 'FLASH SALE চলছে!',
      flashSaleViewBtn: 'এখনই দেখুন',
      // Customer Panel
      loyaltyPointsLabel: 'লয়ালটি পয়েন্ট',
      loyaltyPointsRate:  '১০০ পয়েন্ট = ৳১০ ছাড়',
      referralCardTitle:  'বন্ধুকে রেফার করুন',
      referralCardDesc:   'আপনার কোড দিয়ে কেউ প্রথম অর্ডার করলে আপনি ও আপনার বন্ধু দুজনেই 50 পয়েন্ট পাবেন!',
      referralCountPrefix: 'আপনি রেফার করেছেন:',
      referralCountSuffix: 'জনকে',
      addressBookTitle:  'ঠিকানা বই',
      addressBookDesc:   'সেভ করা ডেলিভারি ঠিকানা পরিচালনা করুন',
      layer1Label:        'লেইয়ার ১: লাইভ সেলফি অথবা প্রোফাইল পিকচার আপলোড *',
      capturePhotoBtn:    'ক্যাপচার 📸',
      liveCameraLabel:    'লাইভ ক্যামেরা',
      uploadPhotoLabel:   'ছবি আপলোড',
      yourNameLabel:      'আপনার নাম *',
      mobileNumberLabel:  'মোবাইল নম্বর',
      layer2Label:        'লেয়ার ২: Google একাউন্ট ভেরিফিকেশন',
      layer3Label:        'লেইয়ার ৩: NID / জন্ম নিবন্ধন আপলোড *',
      gpsLocationLabel:        'ডেলিভারি জিপিএস ম্যাপ লোকেশন',
      selectCurrentLocationLabel: 'আমার বর্তমান লোকেশন সিলেক্ট করুন',
      fullAddressLabel:   'পূর্ণাঙ্গ ডেলিভারি ঠিকানা',
      saveCustomerInfoBtn: 'কাস্টমার তথ্য সেভ করুন',
      profileVerifySectionTitle:    'প্রোফাইল ভেরিফিকেশন ও তথ্য',
      profileVerifySectionSubtitle: 'নাম, ছবি, NID ও ঠিকানা যাচাই করুন',
      customerSectionAccountLabel: 'অ্যাকাউন্ট',
      customerSectionGeneralLabel: 'সাধারণ',
      customerRowSettingsLabel:    'সেটিংস',
      customerRowLoyaltyLabel:     'লয়্যালটি ও রেফারেল',
      customerRowNotificationLabel: 'নোটিফিকেশন',
      customerRowOrdersLabel:      'অর্ডার হিস্টরি',
      customerRowPrivacyLabel:     'প্রাইভেসি পলিসি',
      customerRowTermsLabel:       'শর্তাবলী',
      customerRowLogoutLabel:      'লগ আউট',
      customerSettingsHeaderTitle: 'সেটিংস ও ভেরিফিকেশন',
      notifPermissionTitle:        'ব্রাউজার নোটিফিকেশন',
      notifPermissionBtn:          'চালু করুন',
      notifPrefOrdersTitle:        'অর্ডার আপডেট',
      notifPrefOrdersDesc:         'অর্ডার স্ট্যাটাস পরিবর্তনের নোটিফিকেশন',
      notifPrefPromoTitle:         'অফার ও প্রোমোশন',
      notifPrefPromoDesc:          'নতুন অফার ও ডিসকাউন্টের নোটিফিকেশন',
      notifStatusOn:               'চালু আছে ✅',
      notifStatusDenied:           'বন্ধ — Browser Settings থেকে চালু করুন',
      notifStatusOff:              'বন্ধ আছে',
      notifStatusUnsupported:      'এই ব্রাউজারে সাপোর্ট নেই',
      notifEnabledToast:           '✅ নোটিফিকেশন চালু হয়েছে',
      // Seller Panel — Top Section
      sellerDashboardLive: 'সেলার ড্যাশবোর্ড লাইভ',
      adminNotifTitle:     'সেলার আবেদন নোটিফিকেশন',
      markAllReadBtn:      'সব পড়েছি ✓',
      noNewNotifLabel:     'কোনো নতুন নোটিফিকেশন নেই',
      providerModeTitle:   'সার্ভিস প্রোভাইডার মোড',
      onlineToggleLabel:   'অনলাইন',
      providerModeDesc:    'অনলাইনে গেলে কাস্টমাররা সার্ভিসেস বাটনের লাইভ ম্যাপে আপনার লোকেশন দেখতে পারবে এবং সরাসরি আপনার প্রোফাইল থেকে বুকিং করতে পারবে।',
      serviceTypeLabel:    'সার্ভিসের ধরন *',
      optSelect:           'সিলেক্ট করুন',
      optTaxi:             '🚕 ট্যাক্সি চালক',
      optBike:             '🏍️ বাইক রাইড চালক',
      optAirbus:           '🚌 এয়ারবাস',
      optHelicopter:       '🚁 হেলিকপ্টার',
      optAirticket:        '✈️ বিমান টিকিট এজেন্ট',
      optTourguide:        '🗺️ ট্যুর গাইড',
      optHotel:            '🏨 হোটেল এজেন্ট',
      providerNameLabel:   'আপনার নাম *',
      providerPhoneLabel:  'ফোন নম্বর *',
      freeNowLabel:        'এই মুহূর্তে ফ্রি আছি (বুকিং নেওয়ার জন্য উপলব্ধ)',
      statInventoryLabel:  'ইনভেন্টরি',
      statSoldLabel:       'বিক্রি হয়েছে',
      statEarningsLabel:   'মোট আয়',
      refreshEarningsLabel: 'আয়ের হিসাব রিফ্রেশ করুন',
      analyticsDashboardTitle: 'অ্যানালিটিক্স ড্যাশবোর্ড',
      analyticsWeekLabel:  '৭ দিন',
      analyticsMonthLabel: '৩০ দিন',
      analyticsTotalOrdersLabel: 'মোট অর্ডার',
      analyticsTotalRevenueLabel: 'মোট রেভিনিউ',
      analyticsPendingOrdersLabel: 'পেন্ডিং অর্ডার',
      analyticsPendingWaitingLabel: 'অপেক্ষায় আছে',
      analyticsTotalCustomersLabel: 'মোট কাস্টমার',
      dailySalesLabel:     'দৈনিক বিক্রয় (৳)',
      loadingLabel:        'লোড হচ্ছে...',
      paymentMethodLabel:  'পেমেন্ট পদ্ধতি',
      paymentCodLabel:     'ক্যাশ অন ডেলিভারি',
      paymentBkashLabel:   'বিকাশ',
      paymentNagadLabel:   'নগদ',
      paymentRocketLabel:  'রকেট',
      paymentQrLabel:      'QR কোড',
      paymentEmiLabel:     'EMI / কিস্তি',
      bestsellersLabel:    'সবচেয়ে বেশি বিক্রিত পণ্য',
      customerAreaLabel:   'কাস্টমার এলাকা ভিত্তিক বিশ্লেষণ',
      // Low Stock Alert
      lowStockTitle:       'লো-স্টক অ্যালার্ট',
      checkNowLabel:       'চেক করুন',
      stockOkLabel:        'সব পণ্যের স্টক ঠিক আছে ✅',
      alertThresholdLabel: 'অ্যালার্ট সীমা:',
      alertThresholdSuffix: 'টি এর কম হলে',
      // Bulk Upload
      bulkUploadTitle:     'বাল্ক পণ্য আপলোড (CSV)',
      bulkUploadDesc:      'একসাথে অনেক পণ্য আপলোড করুন',
      csvTemplateDownloadLabel: 'CSV টেমপ্লেট ডাউনলোড করুন',
      csvSelectFileLabel:  'CSV ফাইল সিলেক্ট করুন',
      previewLabel:        'প্রিভিউ:',
      uploadAllProductsLabel: 'সব পণ্য আপলোড করুন',
      // Support Chat
      supportChatTitle:    'সাপোর্ট চ্যাট',
      chatOnlineLabel:     'অনলাইন',
      chatWelcomeMsg:      '👋 স্বাগতম! আপনার যেকোনো সমস্যায় আমরা সাহায্য করতে প্রস্তুত।',
      chatWelcomeMeta:     'Admin • এখন',
      chatInputPlaceholder: 'মেসেজ লিখুন...',
      // Seller Policy
      sellerPolicyTitle:   'সেলার পলিসি ও বিক্রয়ের শর্তাবলী',
      policyItem1:         'পণ্য অবশ্যই শতভাগ ভেজাল মুক্ত হতে হবে।',
      policyItem2:         'প্রতিটি পণ্য সম্পূর্ণ অরিজিনাল (Original) হতে হবে।',
      policyItem3:         'পণ্যের দাম ও কোয়ালিটিতে যেন গ্রাহক লাভবান হয়, সর্বদা সেদিকে লক্ষ্য রাখতে হবে।',
      policyItem4:         'গ্রাহকের সাথে যেকোনো প্রকার প্রতারণা করলে সেলার প্রোফাইল সাথে সাথে লক করে দেওয়া হবে।',
      // New Product Upload
      newProductUploadTitle: 'নতুন পণ্য আপলোড ও ডিটেলস আপডেট',
      productImageLabel:   'পণ্যের ছবি *',
      productImageSelectLabel: 'পণ্যের ছবি সিলেক্ট করুন',
      productNameLabel:    'পণ্যের নাম *',
      productNamePh:       'উদা: গর্জিয়াস কটন পাঞ্জাবি',
      productPriceLabel:   'মূল্য (৳) *',
      productCategoryLabel: 'ক্যাটাগরি',
      productSizesLabel:   'উপলব্ধ সাইজসমূহ (কমা দিয়ে লিখুন) *',
      productSizesPh:      'উদা: M, L, XL, XXL',
      publishProductBtn:   'পণ্যটি শপে লাইভ করুন 🚀',
      // Shop Config Settings
      shopConfigTitle:     'শপ কনফিগারেশন সেটিংস',
      shopLogoLabel:       'দোকানের লোগো / প্রোফাইল',
      changeLogoBtn:       'পরিবর্তন করুন 🖼️',
      shopPublicNameLabel: 'দোকানের পাবলিক নাম',
      shopNamePh:          'দোকানের নাম লিখুন',
      shopWhatsappLabel:   'সেলার হেল্পলাইন নম্বর (WhatsApp)',
      updateShopDataBtn:   'শপ ডাটা আপডেট করুন',
      // Admin: Seller Approvals
      sellerApprovalTitle: 'সেলার অনুমোদন',
      refreshLabel:        'রিফ্রেশ',
      loadingLabel1:       'লোড হচ্ছে...',
      // Admin: Coupon Management
      createCouponTitle:   'কুপন তৈরি করুন',
      couponCodePh:        'কোড (উদা: EID50)',
      couponTypePercent:   'শতাংশ (%)',
      couponTypeFixed:     'ফিক্সড (৳)',
      couponValuePh:       'মূল্য',
      couponMinOrderPh:    'সর্বনিম্ন অর্ডার ৳',
      couponUsageLimitPh:  'ব্যবহার সীমা (ঐচ্ছিক)',
      createCouponBtnLabel: 'কুপন তৈরি করুন',
      loadingLabel2:       'লোড হচ্ছে...',
      // Order Management
      realtimeOrdersTitle: 'রিয়েল-টাইম অর্ডার',
      filterAllLabel:      'সব',
      filterPendingLabel:  'পেন্ডিং',
      filterProcessingLabel: 'প্রসেসিং',
      filterDeliveredLabel: 'ডেলিভারড',
      ordersLoadingLabel:  'অর্ডার লোড হচ্ছে...',
      newBadgeLabel:       'নতুন',
      // Services Modal
      nearbyLiveLabel:     'আপনার আশেপাশে লাইভ',
      youAreHereLabel:     'আপনি এখানে',
      viewOnGmapLabel:     'গুগল ম্যাপে এলাকা দেখুন',
      svcTaxiTitle:        'ট্যাক্সি সার্ভিস',
      svcTaxiSub:          'কার বুকিং • AC/Non-AC',
      svcBikeTitle:        'বাইক রাইড',
      svcBikeSub:          'দ্রুত • সাশ্রয়ী',
      svcAirbusTitle:      'এয়ারবাস সার্ভিস',
      svcAirbusSub:        'AC বাস • আন্তঃজেলা',
      svcTicketTitle:      'টিকিট সার্ভিস',
      svcTicketSub:        'ট্রেন • বাস • লঞ্চ',
      svcHelicopterTitle:  'হেলিকপ্টার সার্ভিস',
      svcHelicopterSub:    'VIP • মেডিকেল • চার্টার',
      svcAirticketTitle:   'বিমান টিকিট বুকিং',
      svcAirticketSub:     'দেশীয় • আন্তর্জাতিক',
      svcTourguideTitle:   'ট্যুর গাইড সার্ভিস',
      svcTourguideSub:     'কক্সবাজার • সুন্দরবন • বান্দরবান • থাইল্যান্ড • দুবাই',
      svcHotelTitle:       'হোটেল বুকিং',
      svcHotelSub:         'দেশ-বিদেশে সেরা হোটেল',
      svcHajjTitle:        'হজ্ব ও ওমরাহ',
      svcHajjSub:          'প্যাকেজ • ভিসা • গাইড',
      svcMyBookingsTitle:  'আমার বুকিং ইতিহাস',
      svcMyBookingsSub:    'সকল বুকিং একসাথে দেখুন',
      // Service Detail modal
      serviceBookBtnLabel: 'এখনই বুক করুন 🚀',
      // My Bookings modal
      myBookingsTitle:     'আমার বুকিং',
      loadingText:         'লোড হচ্ছে...',
      // Address Book modal
      addrbookTitle:       'ঠিকানা বই',
      addrbookSub:         'সেভ করা ডেলিভারি ঠিকানা',
      addrbookNewBtn:      'নতুন ঠিকানা',
      addrFormTitleNew:    'নতুন ঠিকানা যোগ করুন',
      addrFormTitleEdit:   'ঠিকানা সম্পাদনা করুন',
      addrLabelPlaceholder:'ঠিকানার নাম (যেমন: বাড়ি, অফিস, মায়ের বাড়ি)',
      addrNamePlaceholder: 'প্রাপকের নাম *',
      addrPhonePlaceholder:'মোবাইল নম্বর *',
      addrTextPlaceholder: 'পূর্ণ ঠিকানা: গ্রাম/রোড, থানা, জেলা *',
      addrDefaultLabel:    'ডিফল্ট ঠিকানা হিসেবে সেট করুন',
      addrSaveBtn:         'সেভ করুন',
      addrCancelBtn:       'বাতিল',
      // Direct Chat modal
      directChatStatus:    'অনলাইন • সাধারণত কয়েক মিনিটে উত্তর দেয়',
      directChatWelcome:   '👋 স্বাগতম পারভেজ স্টোরে! আপনার পণ্য, অর্ডার বা যেকোনো বিষয়ে সাহায্য চাইলে এখানে লিখুন।',
      directChatNow:       'এখন',
      quickReplyOrder:     'অর্ডার কোথায়?',
      quickReplyReturn:    'রিটার্ন পলিসি?',
      quickReplyPayment:   'পেমেন্ট সমস্যা',
      quickReplyDelivery:  'ডেলিভারি সময়?',
      chatInputPlaceholder:'মেসেজ লিখুন...',
      chatSearchPlaceholder:'কাস্টমার খুঁজুন...',
      chatTabCustomer:     'কাস্টমার',
      chatTabAdmin:        'অ্যাডমিন',
      nearbyProviderSearching: 'খোঁজা হচ্ছে...',
      nobodyOnlineLabel:   'এই মুহূর্তে কেউ অনলাইনে নেই',
      couldNotLoadLabel:   'লোড করা যায়নি',
      // ✅ কমিউনিটি কাউন্ট রিং + মানুষ ব্রাউজার + ফ্রেন্ড সিস্টেম + পিয়ার চ্যাট
      communityCustomerLabel:   'মোট কাস্টমার',
      communitySellerLabel:     'মোট সেলার',
      communityHintTap:         'দেখতে ট্যাপ করুন',
      communityCustomersTitle:  'মোট কাস্টমার',
      communitySellersTitle:    'মোট সেলার',
      communityBrowserSub:      'স্ক্রল করে সবার প্রোফাইল দেখুন',
      peopleSearchPlaceholder:  'নাম দিয়ে খুঁজুন...',
      noProfilesFoundLabel:     'কোনো প্রোফাইল পাওয়া যায়নি',
      loginFirstAlert:          'সবার প্রোফাইল দেখতে আগে Google দিয়ে লগইন করুন!',
      roleLabelSeller:          'সেলার',
      roleLabelCustomer:        'কাস্টমার',
      thisIsYourProfileLabel:   'এটি আপনার নিজের প্রোফাইল 🙂',
      noBioLabel:                'এখনো কোনো বায়ো যুক্ত করা হয়নি।',
      profileLockedMsg:          'এই প্রোফাইলটি প্রাইভেট। ফ্রেন্ড রিকোয়েস্ট পাঠান বা ফলো করুন — অনুমতি পেলে দেখা যাবে।',
      lockedProfileTitle:        'প্রাইভেট প্রোফাইল',
      profileLockedHintMsg:      '👆 ফ্রেন্ড রিকোয়েস্ট বা ফলো করলে তিনি অনুমতি দিতে পারবেন',
      friendsAlreadyLabel:       'ফ্রেন্ড',
      friendRequestPendingBtn:  'রিকোয়েস্ট পেন্ডিং (বাতিল করুন)',
      friendAcceptBtn:           'একসেপ্ট',
      friendRejectBtn:           'বাতিল',
      sendFriendRequestBtn:      'ফ্রেন্ড রিকোয়েস্ট পাঠান',
      friendActionFailedLabel:  'কাজটি সম্পন্ন করা যায়নি',
      messageBtnLabel:           'মেসেজ করুন',
      peerChatSubLabel:          'মেসেজ আদান-প্রদান',
      peerChatEmptyLabel:        'এখনো কোনো মেসেজ নেই। শুরু করুন! 👋',
      peerChatSendFailedLabel:  'মেসেজ পাঠানো যায়নি',
      friendRequestsInboxTitle: 'ফ্রেন্ড রিকোয়েস্ট',
      friendRequestsInboxSub:   'যারা আপনাকে রিকোয়েস্ট পাঠিয়েছে',
      noPendingRequestsLabel:   'কোনো নতুন ফ্রেন্ড রিকোয়েস্ট নেই',
      // ✅ অডিও/ভিডিও কল সিস্টেম
      audioCallBtnLabel:        'অডিও কল',
      videoCallBtnLabel:        'ভিডিও কল',
      alreadyInCallLabel:       'আপনি এখন আগে থেকেই একটি কলে আছেন',
      micPermissionDeniedLabel: 'মাইক্রোফোন অনুমতি দেওয়া হয়নি — কল করা যাচ্ছে না',
      cameraPermissionDeniedLabel: 'ক্যামেরা/মাইক্রোফোন অনুমতি দেওয়া হয়নি — কল করা যাচ্ছে না',
      callFailedLabel:          'কল করা যায়নি',
      callRejectedLabel:        'কলটি প্রত্যাখ্যান করা হয়েছে',
      callNoAnswerLabel:        'কোনো উত্তর পাওয়া যায়নি',
      incomingAudioCallLabel:   'ইনকামিং অডিও কল',
      incomingVideoCallLabel:   'ইনকামিং ভিডিও কল',
      callingLabel:             'কল হচ্ছে...',
      callConnectedLabel:       'কল চলছে',
      declineCallLabel:         'বাতিল',
      acceptCallLabel:          'রিসিভ করুন',
      cancelCallLabel:          'কেটে দিন',
      // ✅ ছবি/ভয়েস মেসেজ
      onlyImageAllowedLabel:    'শুধুমাত্র ছবি ফাইল পাঠানো যাবে',
      imageTooLargeLabel:       'ছবিটি অনেক বড়, একটু ছোট সাইজের ছবি দিয়ে চেষ্টা করুন',
      voiceTooLongLabel:        'ভয়েস মেসেজটি অনেক বড়, ছোট করে আবার রেকর্ড করুন',
      mediaSendFailedLabel:     'পাঠানো যায়নি',
      photoLabel:               '📷 ছবি',
      voiceMessageLabel:        '🎤 ভয়েস মেসেজ',
      recordingInProgressLabel: 'রেকর্ড হচ্ছে...',
      // ✅ আধুনিক কল ফিচার
      reconnectingLabel:        'সংযোগ ফিরে আনার চেষ্টা হচ্ছে...',
      networkGoodLabel:         'নেটওয়ার্ক: ভালো',
      networkMediumLabel:       'নেটওয়ার্ক: মাঝারি',
      networkPoorLabel:         'নেটওয়ার্ক: দুর্বল',
      missedCallFromLabel:      'মিসড কল',
      cameraSwitchFailedLabel:  'ক্যামেরা সুইচ করা যায়নি',
      pipNotSupportedLabel:     'এই ব্রাউজারে পিকচার-ইন-পিকচার সাপোর্ট নেই',
      myFriendsTitle:           'আমার ফ্রেন্ডরা',
      myFriendsSub:             'স্ক্রল করে সবাইকে দেখুন',
      noFriendsYetLabel:        'এখনো কোনো ফ্রেন্ড নেই',
      friendCountSectionLabel:  'মোট ফ্রেন্ড',
      followingLabel:            'ফলো করছেন',
      followBtnLabel:            'ফলো করুন',
      myFollowersTitle:          'আমার ফলোয়াররা',
      myFollowersSub:            'স্ক্রল করে সবাইকে দেখুন',
      noFollowersYetLabel:       'এখনো কোনো ফলোয়ার নেই',
    },
    en: {
      // Meta
      pageTitle:       'BD BiG BAZZAR Store | BD BIG BAZZAR — Online Shopping, Rides & Services',
      metaDesc:        'BD BiG BAZZAR Store — Bangladesh\'s best online shopping platform. Handmade products, fish, meat, fruits, herbal, taxi, bike rides, bus & train tickets all in one app.',
      ogLocale:        'en_US',
      // Header
      siteTitle:       'BD BiG BAZZAR Store',
      searchPlaceholder: 'Search for products...',
      typewriterPrefix: 'We Provide',
      typewriterPhrases: ['Premium Quality', 'Best Price', 'Fast Delivery', 'Original Products', 'Trusted Service'],
      // Nav
      navHome:    'Home',
      navCart:    'Cart',
      navLive:    'Live',
      navService: 'Services',
      navMenu:    'Menu',
      navProfile: 'Profile',
      // Cart Modal
      cartTitle:       'Your Shopping Cart',
      cartEmpty:       'Your cart is empty!',
      cartTotal:       'Total Amount:',
      cartNameLabel:   'Your Name *',
      cartNamePh:      'e.g. John Doe',
      cartPhoneLabel:  'Mobile Number *',
      cartPhonePh:     'e.g. 01700000000',
      cartAddressLabel:'Full Address & Map Location *',
      cartAddressPh:   'Village, Upazila, District & Live Map Link',
      cartPayLabel:    'Select Payment Method',
      cartOrderBtn:    'Confirm Order',
      // Products
      addToCart:       'Add to Cart',
      outOfStock:      'Out of Stock',
      selectSize:      'Select Size',
      // Services
      serviceTitle:    'Our Services',
      serviceSubtitle: 'Anywhere in Bangladesh',
      taxiTitle:       'Taxi Service',
      bikeTitle:       'Bike Ride',
      airbusTitle:     'Airbus Service',
      ticketTitle:     'Ticket Service',
      bookNow:         'Book Now 🚀',
      // Profile
      loginTitle:      'Welcome Back!',
      loginSubtitle:   'Buy or Sell',
      loginBtn:        'Sign in with Google',
      loginSkip:       'Not now',
      authSigninTab:   'Sign in',
      authSignupTab:   'Sign up',
      authFullNameLabel:       'Full Name',
      authFullNamePlaceholder: 'Enter your name',
      authEmailLabel:          'Email',
      authEmailPlaceholder:    'demo@email.com',
      authPasswordLabel:       'Password',
      authPasswordPlaceholder: 'Enter your password',
      authConfirmPasswordLabel:       'Confirm Password',
      authConfirmPasswordPlaceholder: 'Confirm your password',
      authRememberMe:      'Remember Me',
      authForgotPassword:  'Forgot Password?',
      authSigninBtn:       'Login',
      authSignupBtn:       'Create Account',
      authOrDivider:       'OR',
      authNoAccountText:   "Don't have an account?",
      authHaveAccountText: 'Already have an account?',
      authSignupLink:      'Sign up',
      authSigninLink:      'Sign in',
      authWelcomeTitle:    'Welcome',
      authWelcomeDesc:     'Discover amazing products and get them delivered to your door.',
      authWelcomeGetStarted: 'Get Started',
      authWelcomeHaveAccount: 'Already have an account?',
      authWelcomeSkip:     'Not now',
      customerTab:     'Customer',
      sellerTab:       'Seller',
      trackOrder:      'Track Order / Booking',
      trackPlaceholder:'Enter your Order or Booking ID',
      trackBtn:        'Check Status',
      // Header — Profile (logged out / default)
      profileDefaultName: 'Profile',
      profileLoginPrompt: 'Login',
      profileViewPrompt:  'View Profile',
      customerFallback:   'Customer',
      // Search history
      searchHistoryTitle: 'Recent Searches',
      searchHistoryClear: 'Clear',
      // Promo Banner 1
      promo1Tag:    'Mega Offer 🔥',
      promo1Title:  'Up to 50% Off!',
      promo1Sub:    'Limited Time Special Deal',
      promo1Btn:    'View Now',
      // Promo Banner 2
      promo2Tag:    'New Collection ✨',
      promo2Title:  'Handmade Products',
      promo2Sub:    'Traditional Bangladeshi Products',
      promo2Btn:    'View Collection',
      // Promo Banner 3
      promo3Tag:    'Organic Food 🌿',
      promo3Title:  'Fresh Fish & Meat',
      promo3Sub:    'Straight from the Farm to You',
      promo3Btn:    'Order Now',
      // Promo Banner 4
      promo4Tag:    'Free Delivery 🚚',
      promo4Title:  'Above ৳5,000',
      promo4Sub:    'Delivery Available Nationwide',
      promo4Btn:    'Buy Now',
      // Customer Live Section
      customerLiveTitle: "Customers' Live Market",
      goLiveBtn:          'Go Live',
      noOneLiveNow:       'No one is live right now',
      // Recently Viewed
      recentlyViewedTitle: 'Recently Viewed',
      // Countdown
      todaysDealTitle: "Today's Mega Deal",
      todaysDealSub:   'Limited time offer! Ends in:',
      hoursLabel:      'H',
      minutesLabel:    'M',
      secondsLabel:    'S',
      // Flash Sale Banner
      flashSaleRunning: 'FLASH SALE is on!',
      flashSaleViewBtn: 'View Now',
      // Customer Panel
      loyaltyPointsLabel: 'Loyalty Points',
      loyaltyPointsRate:  '100 Points = ৳10 Off',
      referralCardTitle:  'Refer a Friend',
      referralCardDesc:   "When someone uses your code on their first order, you and your friend both get 50 points!",
      referralCountPrefix: 'You have referred:',
      referralCountSuffix: 'people',
      addressBookTitle:  'Address Book',
      addressBookDesc:   'Manage your saved delivery addresses',
      layer1Label:        'Layer 1: Upload a Live Selfie or Profile Picture *',
      capturePhotoBtn:    'Capture 📸',
      liveCameraLabel:    'Live Camera',
      uploadPhotoLabel:   'Upload Photo',
      yourNameLabel:      'Your Name *',
      mobileNumberLabel:  'Mobile Number',
      layer2Label:        'Layer 2: Google Account Verification',
      layer3Label:        'Layer 3: Upload NID / Birth Certificate *',
      gpsLocationLabel:        'Delivery GPS Map Location',
      selectCurrentLocationLabel: 'Select My Current Location',
      fullAddressLabel:   'Full Delivery Address',
      saveCustomerInfoBtn: 'Save Customer Info',
      profileVerifySectionTitle:    'Profile Verification & Info',
      profileVerifySectionSubtitle: 'Verify your name, photo, NID, and address',
      customerSectionAccountLabel: 'Account',
      customerSectionGeneralLabel: 'General',
      customerRowSettingsLabel:    'Settings',
      customerRowLoyaltyLabel:     'Loyalty & Referral',
      customerRowNotificationLabel: 'Notification',
      customerRowOrdersLabel:      'Order History',
      customerRowPrivacyLabel:     'Privacy Policy',
      customerRowTermsLabel:       'Terms & Conditions',
      customerRowLogoutLabel:      'Log Out',
      customerSettingsHeaderTitle: 'Settings & Verification',
      notifPermissionTitle:        'Browser Notifications',
      notifPermissionBtn:          'Enable',
      notifPrefOrdersTitle:        'Order Updates',
      notifPrefOrdersDesc:         'Notifications when your order status changes',
      notifPrefPromoTitle:         'Offers & Promotions',
      notifPrefPromoDesc:          'Notifications about new offers and discounts',
      notifStatusOn:               'Enabled ✅',
      notifStatusDenied:           'Blocked — enable it from Browser Settings',
      notifStatusOff:              'Disabled',
      notifStatusUnsupported:      'Not supported on this browser',
      notifEnabledToast:           '✅ Notifications enabled',
      // Seller Panel — Top Section
      sellerDashboardLive: 'Seller Dashboard Live',
      adminNotifTitle:     'Seller Application Notifications',
      markAllReadBtn:      'Mark All Read ✓',
      noNewNotifLabel:     'No new notifications',
      providerModeTitle:   'Service Provider Mode',
      onlineToggleLabel:   'Online',
      providerModeDesc:    'When you go online, customers can see your location on the live map in the Services button and book directly from your profile.',
      serviceTypeLabel:    'Service Type *',
      optSelect:           'Select',
      optTaxi:             '🚕 Taxi Driver',
      optBike:             '🏍️ Bike Ride Driver',
      optAirbus:           '🚌 Airbus',
      optHelicopter:       '🚁 Helicopter',
      optAirticket:        '✈️ Air Ticket Agent',
      optTourguide:        '🗺️ Tour Guide',
      optHotel:            '🏨 Hotel Agent',
      providerNameLabel:   'Your Name *',
      providerPhoneLabel:  'Phone Number *',
      freeNowLabel:        'Available right now (free to take bookings)',
      statInventoryLabel:  'Inventory',
      statSoldLabel:       'Sold',
      statEarningsLabel:   'Total Earnings',
      refreshEarningsLabel: 'Refresh Earnings',
      analyticsDashboardTitle: 'Analytics Dashboard',
      analyticsWeekLabel:  '7 Days',
      analyticsMonthLabel: '30 Days',
      analyticsTotalOrdersLabel: 'Total Orders',
      analyticsTotalRevenueLabel: 'Total Revenue',
      analyticsPendingOrdersLabel: 'Pending Orders',
      analyticsPendingWaitingLabel: 'Awaiting',
      analyticsTotalCustomersLabel: 'Total Customers',
      dailySalesLabel:     'Daily Sales (৳)',
      loadingLabel:        'Loading...',
      paymentMethodLabel:  'Payment Methods',
      paymentCodLabel:     'Cash on Delivery',
      paymentBkashLabel:   'bKash',
      paymentNagadLabel:   'Nagad',
      paymentRocketLabel:  'Rocket',
      paymentQrLabel:      'QR Code',
      paymentEmiLabel:     'EMI / Installment',
      bestsellersLabel:    'Best Selling Products',
      customerAreaLabel:   'Customer Area-wise Analysis',
      // Low Stock Alert
      lowStockTitle:       'Low Stock Alert',
      checkNowLabel:       'Check Now',
      stockOkLabel:        'All product stock is fine ✅',
      alertThresholdLabel: 'Alert Threshold:',
      alertThresholdSuffix: 'units or fewer',
      // Bulk Upload
      bulkUploadTitle:     'Bulk Product Upload (CSV)',
      bulkUploadDesc:      'Upload many products at once',
      csvTemplateDownloadLabel: 'Download CSV Template',
      csvSelectFileLabel:  'Select CSV File',
      previewLabel:        'Preview:',
      uploadAllProductsLabel: 'Upload All Products',
      // Support Chat
      supportChatTitle:    'Support Chat',
      chatOnlineLabel:     'Online',
      chatWelcomeMsg:      '👋 Welcome! We are ready to help you with any issue.',
      chatWelcomeMeta:     'Admin • Now',
      chatInputPlaceholder: 'Type a message...',
      // Seller Policy
      sellerPolicyTitle:   'Seller Policy & Terms of Sale',
      policyItem1:         'Products must be 100% free of adulteration.',
      policyItem2:         'Every product must be completely original.',
      policyItem3:         'Always ensure customers benefit from the price and quality of the products.',
      policyItem4:         'Any kind of fraud against a customer will result in immediate locking of the seller profile.',
      // New Product Upload
      newProductUploadTitle: 'New Product Upload & Details Update',
      productImageLabel:   'Product Image *',
      productImageSelectLabel: 'Select Product Image',
      productNameLabel:    'Product Name *',
      productNamePh:       'e.g. Gorgeous Cotton Panjabi',
      productPriceLabel:   'Price (৳) *',
      productCategoryLabel: 'Category',
      productSizesLabel:   'Available Sizes (comma-separated) *',
      productSizesPh:      'e.g. M, L, XL, XXL',
      publishProductBtn:   'Publish Product to Shop 🚀',
      // Shop Config Settings
      shopConfigTitle:     'Shop Configuration Settings',
      shopLogoLabel:       'Shop Logo / Profile',
      changeLogoBtn:       'Change 🖼️',
      shopPublicNameLabel: 'Shop Public Name',
      shopNamePh:          'Enter shop name',
      shopWhatsappLabel:   'Seller Helpline Number (WhatsApp)',
      updateShopDataBtn:   'Update Shop Data',
      // Admin: Seller Approvals
      sellerApprovalTitle: 'Seller Approval',
      refreshLabel:        'Refresh',
      loadingLabel1:       'Loading...',
      // Admin: Coupon Management
      createCouponTitle:   'Create Coupon',
      couponCodePh:        'Code (e.g. EID50)',
      couponTypePercent:   'Percent (%)',
      couponTypeFixed:     'Fixed (৳)',
      couponValuePh:       'Value',
      couponMinOrderPh:    'Minimum Order ৳',
      couponUsageLimitPh:  'Usage Limit (optional)',
      createCouponBtnLabel: 'Create Coupon',
      loadingLabel2:       'Loading...',
      // Order Management
      realtimeOrdersTitle: 'Real-Time Orders',
      filterAllLabel:      'All',
      filterPendingLabel:  'Pending',
      filterProcessingLabel: 'Processing',
      filterDeliveredLabel: 'Delivered',
      ordersLoadingLabel:  'Loading orders...',
      newBadgeLabel:       'New',
      // Services Modal
      nearbyLiveLabel:     'Live Near You',
      youAreHereLabel:     'You are here',
      viewOnGmapLabel:     'View Area on Google Maps',
      svcTaxiTitle:        'Taxi Service',
      svcTaxiSub:          'Car Booking • AC/Non-AC',
      svcBikeTitle:        'Bike Ride',
      svcBikeSub:          'Fast • Affordable',
      svcAirbusTitle:      'Airbus Service',
      svcAirbusSub:        'AC Bus • Inter-district',
      svcTicketTitle:      'Ticket Service',
      svcTicketSub:        'Train • Bus • Launch',
      svcHelicopterTitle:  'Helicopter Service',
      svcHelicopterSub:    'VIP • Medical • Charter',
      svcAirticketTitle:   'Flight Ticket Booking',
      svcAirticketSub:     'Domestic • International',
      svcTourguideTitle:   'Tour Guide Service',
      svcTourguideSub:     "Cox's Bazar • Sundarbans • Bandarban • Thailand • Dubai",
      svcHotelTitle:       'Hotel Booking',
      svcHotelSub:         'Best Hotels at Home & Abroad',
      svcHajjTitle:        'Hajj & Umrah',
      svcHajjSub:          'Package • Visa • Guide',
      svcMyBookingsTitle:  'My Booking History',
      svcMyBookingsSub:    'View All Bookings Together',
      // Service Detail modal
      serviceBookBtnLabel: 'Book Now 🚀',
      // My Bookings modal
      myBookingsTitle:     'My Bookings',
      loadingText:         'Loading...',
      // Address Book modal
      addrbookTitle:       'Address Book',
      addrbookSub:         'Saved Delivery Addresses',
      addrbookNewBtn:      'New Address',
      addrFormTitleNew:    'Add New Address',
      addrFormTitleEdit:   'Edit Address',
      addrLabelPlaceholder:'Address label (e.g. Home, Office, Mom\'s)',
      addrNamePlaceholder: 'Recipient name *',
      addrPhonePlaceholder:'Mobile number *',
      addrTextPlaceholder: 'Full address: Village/Road, Upazila, District *',
      addrDefaultLabel:    'Set as default address',
      addrSaveBtn:         'Save',
      addrCancelBtn:       'Cancel',
      // Direct Chat modal
      directChatStatus:    'Online • Usually replies within minutes',
      directChatWelcome:   '👋 Welcome to Parvez Store! Write here for help with products, orders, or anything else.',
      directChatNow:       'Now',
      quickReplyOrder:     'Where is my order?',
      quickReplyReturn:    'Return policy?',
      quickReplyPayment:   'Payment issue',
      quickReplyDelivery:  'Delivery time?',
      chatInputPlaceholder:'Type a message...',
      chatSearchPlaceholder:'Search customers...',
      chatTabCustomer:     'Customer',
      chatTabAdmin:        'Admin',
      nearbyProviderSearching: 'Searching...',
      nobodyOnlineLabel:   'No one is online right now',
      couldNotLoadLabel:   'Could not load',
      // ✅ Community ring counters + people browser + friend system + peer chat
      communityCustomerLabel:   'Total Customers',
      communitySellerLabel:     'Total Sellers',
      communityHintTap:         'Tap to view',
      communityCustomersTitle:  'Total Customers',
      communitySellersTitle:    'Total Sellers',
      communityBrowserSub:      'Scroll to view everyone\'s profile',
      peopleSearchPlaceholder:  'Search by name...',
      noProfilesFoundLabel:     'No profiles found',
      loginFirstAlert:          'Please log in with Google first to view everyone\'s profile!',
      roleLabelSeller:          'Seller',
      roleLabelCustomer:        'Customer',
      thisIsYourProfileLabel:   'This is your own profile 🙂',
      noBioLabel:                'No bio has been added yet.',
      profileLockedMsg:          'This profile is private. Send a friend request or follow — they can grant you access.',
      lockedProfileTitle:        'Private Profile',
      profileLockedHintMsg:      '👆 Sending a friend request or following lets them grant you access',
      friendsAlreadyLabel:       'Friends',
      friendRequestPendingBtn:  'Request Pending (Cancel)',
      friendAcceptBtn:           'Accept',
      friendRejectBtn:           'Decline',
      sendFriendRequestBtn:      'Send Friend Request',
      friendActionFailedLabel:  'Could not complete this action',
      messageBtnLabel:           'Message',
      peerChatSubLabel:          'Exchange messages',
      peerChatEmptyLabel:        'No messages yet. Say hello! 👋',
      peerChatSendFailedLabel:  'Could not send message',
      friendRequestsInboxTitle: 'Friend Requests',
      friendRequestsInboxSub:   'People who sent you a request',
      noPendingRequestsLabel:   'No new friend requests',
      // ✅ Audio/Video call system
      audioCallBtnLabel:        'Audio Call',
      videoCallBtnLabel:        'Video Call',
      alreadyInCallLabel:       'You are already in a call',
      micPermissionDeniedLabel: 'Microphone permission denied — cannot make the call',
      cameraPermissionDeniedLabel: 'Camera/microphone permission denied — cannot make the call',
      callFailedLabel:          'Could not start call',
      callRejectedLabel:        'Call was declined',
      callNoAnswerLabel:        'No answer',
      incomingAudioCallLabel:   'Incoming Audio Call',
      incomingVideoCallLabel:   'Incoming Video Call',
      callingLabel:             'Calling...',
      callConnectedLabel:       'Call in progress',
      declineCallLabel:         'Decline',
      acceptCallLabel:          'Accept',
      cancelCallLabel:          'Cancel',
      // ✅ Photo/voice messages
      onlyImageAllowedLabel:    'Only image files can be sent',
      imageTooLargeLabel:       'Image is too large, try a smaller one',
      voiceTooLongLabel:        'Voice message is too long, record a shorter one',
      mediaSendFailedLabel:     'Could not send',
      photoLabel:               '📷 Photo',
      voiceMessageLabel:        '🎤 Voice message',
      recordingInProgressLabel: 'Recording...',
      // ✅ Modern call features
      reconnectingLabel:        'Reconnecting...',
      networkGoodLabel:         'Network: Good',
      networkMediumLabel:       'Network: Medium',
      networkPoorLabel:         'Network: Poor',
      missedCallFromLabel:      'Missed call',
      cameraSwitchFailedLabel:  'Could not switch camera',
      pipNotSupportedLabel:     'Picture-in-Picture is not supported in this browser',
      myFriendsTitle:           'My Friends',
      myFriendsSub:             'Scroll to see everyone',
      noFriendsYetLabel:        'No friends yet',
      friendCountSectionLabel:  'Total Friends',
      followingLabel:            'Following',
      followBtnLabel:            'Follow',
      myFollowersTitle:          'My Followers',
      myFollowersSub:            'Scroll to see everyone',
      noFollowersYetLabel:       'No followers yet',
    }
  };

  function t(key) {
    return TRANSLATIONS[currentLang]?.[key] || TRANSLATIONS['bn'][key] || key;
  }

  // ============================================================
  // ✅ পণ্যের ক্যাটাগরি — দ্বিভাষিক ডাটা (সেলার প্যানেলের ড্রপডাউনের জন্য)
  // ============================================================
  const PRODUCT_CATEGORIES = [
    { group: { bn: '👔 পুরুষদের ফ্যাশন', en: "👔 Men's Fashion" }, options: [
      { value: 'punjabi', bn: 'পাঞ্জাবি ও কুর্তা', en: 'Punjabi & Kurta' },
      { value: 'tshirt', bn: 'টি-শার্ট ও শার্ট', en: 'T-Shirt & Shirt' },
      { value: 'pants', bn: 'প্যান্ট ও জিন্স', en: 'Pants & Jeans' },
      { value: 'traditional', bn: 'লুঙ্গি ও ধুতি', en: 'Lungi & Dhuti' },
      { value: 'jacket', bn: 'জ্যাকেট ও হুডি', en: 'Jacket & Hoodie' },
    ]},
    { group: { bn: '👗 মহিলাদের ফ্যাশন', en: "👗 Women's Fashion" }, options: [
      { value: 'womens', bn: 'থ্রি-পিস ও সালোয়ার', en: 'Three-Piece & Salwar' },
      { value: 'saree', bn: 'শাড়ি কালেকশন', en: 'Saree Collection' },
      { value: 'tops', bn: 'টপস ও কুর্তি', en: 'Tops & Kurti' },
      { value: 'burkha', bn: 'বোরখা ও হিজাব', en: 'Burkha & Hijab' },
    ]},
    { group: { bn: '🧒 শিশুদের পণ্য', en: "🧒 Kids' Products" }, options: [
      { value: 'kids_dress', bn: 'বাচ্চাদের পোশাক', en: 'Kids Clothing' },
      { value: 'toys', bn: 'খেলনা ও গেমস', en: 'Toys & Games' },
      { value: 'baby', bn: 'বেবি কেয়ার', en: 'Baby Care' },
    ]},
    { group: { bn: '👟 জুতো ও এক্সেসরিজ', en: '👟 Shoes & Accessories' }, options: [
      { value: 'shoe', bn: 'জুতো ও স্যান্ডেল', en: 'Shoes & Sandals' },
      { value: 'watch', bn: 'ঘড়ি কালেকশন', en: 'Watch Collection' },
      { value: 'bags', bn: 'ব্যাগ ও ওয়ালেট', en: 'Bags & Wallets' },
      { value: 'sunglasses', bn: 'সানগ্লাস ও জুয়েলারি', en: 'Sunglasses & Jewelry' },
      { value: 'cap', bn: 'ক্যাপ ও হ্যাট', en: 'Cap & Hat' },
    ]},
    { group: { bn: '📱 ইলেকট্রনিক্স ও গ্যাজেট', en: '📱 Electronics & Gadgets' }, options: [
      { value: 'electronics', bn: 'মোবাইল ও ট্যাবলেট', en: 'Mobile & Tablet' },
      { value: 'earphone', bn: 'ইয়ারফোন ও স্পিকার', en: 'Earphone & Speaker' },
      { value: 'charger', bn: 'চার্জার ও ক্যাবল', en: 'Charger & Cable' },
      { value: 'camera', bn: 'ক্যামেরা ও অ্যাকসেসরি', en: 'Camera & Accessories' },
      { value: 'computer', bn: 'ল্যাপটপ ও কম্পিউটার', en: 'Laptop & Computer' },
    ]},
    { group: { bn: '💄 বিউটি ও হেলথ', en: '💄 Beauty & Health' }, options: [
      { value: 'cosmetics', bn: 'মেকআপ ও স্কিনকেয়ার', en: 'Makeup & Skincare' },
      { value: 'haircare', bn: 'হেয়ারকেয়ার প্রোডাক্ট', en: 'Haircare Products' },
      { value: 'perfume', bn: 'পারফিউম ও আতর', en: 'Perfume & Attar' },
      { value: 'health', bn: 'হেলথ ও ফিটনেস', en: 'Health & Fitness' },
    ]},
    { group: { bn: '🏠 হোম ও লিভিং', en: '🏠 Home & Living' }, options: [
      { value: 'home', bn: 'হোম ডেকোর', en: 'Home Decor' },
      { value: 'kitchen', bn: 'রান্নাঘরের সরঞ্জাম', en: 'Kitchen Tools' },
      { value: 'bedding', bn: 'বেডশিট ও বালিশ', en: 'Bedsheet & Pillow' },
      { value: 'lighting', bn: 'লাইটিং ও পর্দা', en: 'Lighting & Curtains' },
    ]},
    { group: { bn: '🌾 খাদ্য ও কৃষি', en: '🌾 Food & Agriculture' }, options: [
      { value: 'food', bn: 'শুকনো খাবার ও মশলা', en: 'Dry Food & Spices' },
      { value: 'organic', bn: 'অর্গানিক পণ্য', en: 'Organic Products' },
      { value: 'agri', bn: 'কৃষি সরঞ্জাম', en: 'Agricultural Tools' },
    ]},
    { group: { bn: '🤝 হাতের তৈরি ও প্রক্রিয়াজাত', en: '🤝 Handmade & Processed' }, options: [
      { value: 'handmade', bn: 'হাতের তৈরি পণ্য (সব)', en: 'Handmade Products (All)' },
      { value: 'handmade_bamboo', bn: '— বাঁশের তৈরি পণ্য', en: '— Bamboo Products' },
      { value: 'handmade_beet', bn: '— বেতের তৈরি পণ্য', en: '— Cane Products' },
      { value: 'handmade_wood', bn: '— কাঠের তৈরি পণ্য', en: '— Wood Products' },
      { value: 'meat', bn: 'মাংস প্রক্রিয়াজাত পণ্য (সব)', en: 'Processed Meat (All)' },
      { value: 'meat_beef', bn: '— গরুর মাংস', en: '— Beef' },
      { value: 'meat_mutton', bn: '— খাসির মাংস', en: '— Mutton' },
      { value: 'meat_chicken', bn: '— মুরগির মাংস', en: '— Chicken' },
      { value: 'meat_duck', bn: '— হাঁসের মাংস', en: '— Duck' },
      { value: 'meat_pigeon', bn: '— কবুতরের মাংস', en: '— Pigeon' },
      { value: 'meat_rabbit', bn: '— খরগোশের মাংস', en: '— Rabbit' },
      { value: 'meat_venison', bn: '— হরিণের মাংস', en: '— Venison' },
      { value: 'meat_camel', bn: '— উটের মাংস', en: '— Camel Meat' },
      { value: 'fish', bn: 'মৎস প্রক্রিয়াজাত পণ্য (সব)', en: 'Processed Fish (All)' },
      { value: 'fish_ilish', bn: '— ইলিশ মাছ', en: '— Hilsa' },
      { value: 'fish_rui', bn: '— রুই মাছ', en: '— Rui' },
      { value: 'fish_catla', bn: '— কাতলা মাছ', en: '— Catla' },
      { value: 'fish_pangash', bn: '— পাঙাশ মাছ', en: '— Pangas' },
      { value: 'fish_tilapia', bn: '— তেলাপিয়া মাছ', en: '— Tilapia' },
      { value: 'fish_shrimp', bn: '— চিংড়ি মাছ', en: '— Shrimp' },
      { value: 'fish_hilsa_dry', bn: '— শুঁটকি মাছ', en: '— Dried Fish' },
      { value: 'fish_crab', bn: '— কাঁকড়া', en: '— Crab' },
      { value: 'fish_sea', bn: '— সামুদ্রিক মাছ', en: '— Sea Fish' },
      { value: 'fruit', bn: 'ফল জাত পণ্য (সব)', en: 'Fruit Products (All)' },
      { value: 'fruit_mango', bn: '— আম', en: '— Mango' },
      { value: 'fruit_jackfruit', bn: '— কাঁঠাল', en: '— Jackfruit' },
      { value: 'fruit_banana', bn: '— কলা', en: '— Banana' },
      { value: 'fruit_guava', bn: '— পেয়ারা', en: '— Guava' },
      { value: 'fruit_litchi', bn: '— লিচু', en: '— Lychee' },
      { value: 'fruit_papaya', bn: '— পেঁপে', en: '— Papaya' },
      { value: 'fruit_watermelon', bn: '— তরমুজ', en: '— Watermelon' },
      { value: 'fruit_coconut', bn: '— নারকেল', en: '— Coconut' },
      { value: 'fruit_date', bn: '— খেজুর', en: '— Date' },
      { value: 'fruit_berry', bn: '— বরই / কুল', en: '— Jujube' },
      { value: 'flower', bn: 'ফুল জাত পণ্য (সব)', en: 'Flower Products (All)' },
      { value: 'flower_rose', bn: '— গোলাপ ফুল', en: '— Rose' },
      { value: 'flower_marigold', bn: '— গাঁদা ফুল', en: '— Marigold' },
      { value: 'flower_jasmine', bn: '— বেলি / জুঁই ফুল', en: '— Jasmine' },
      { value: 'flower_lotus', bn: '— পদ্ম ফুল', en: '— Lotus' },
      { value: 'flower_sunflower', bn: '— সূর্যমুখী ফুল', en: '— Sunflower' },
      { value: 'flower_tuberose', bn: '— রজনীগন্ধা ফুল', en: '— Tuberose' },
      { value: 'flower_orchid', bn: '— অর্কিড ফুল', en: '— Orchid' },
      { value: 'flower_dried', bn: '— শুকনো ফুল', en: '— Dried Flowers' },
      { value: 'herbal', bn: 'ভেষজ জাত পণ্য (সব)', en: 'Herbal Products (All)' },
      { value: 'herbal_neem', bn: '— নিম', en: '— Neem' },
      { value: 'herbal_turmeric', bn: '— হলুদ', en: '— Turmeric' },
      { value: 'herbal_ginger', bn: '— আদা', en: '— Ginger' },
      { value: 'herbal_garlic', bn: '— রসুন', en: '— Garlic' },
      { value: 'herbal_tulsi', bn: '— তুলসী', en: '— Tulsi' },
      { value: 'herbal_aloe', bn: '— অ্যালোভেরা', en: '— Aloe Vera' },
      { value: 'herbal_ashwagandha', bn: '— অশ্বগন্ধা', en: '— Ashwagandha' },
      { value: 'herbal_black_seed', bn: '— কালোজিরা', en: '— Black Seed' },
      { value: 'herbal_mint', bn: '— পুদিনা', en: '— Mint' },
      { value: 'herbal_moringa', bn: '— সজনে / মরিঙ্গা', en: '— Moringa' },
      { value: 'herbal_honey', bn: '— মধু', en: '— Honey' },
      { value: 'tree', bn: 'বৃক্ষ', en: 'Tree' },
    ]},
    { group: { bn: '📚 বই ও শিক্ষা', en: '📚 Books & Education' }, options: [
      { value: 'books', bn: 'বই ও নোটবুক', en: 'Books & Notebooks' },
      { value: 'stationery', bn: 'স্টেশনারি ও অফিস', en: 'Stationery & Office' },
    ]},
    { group: { bn: '⚽ স্পোর্টস ও আউটডোর', en: '⚽ Sports & Outdoor' }, options: [
      { value: 'sports', bn: 'স্পোর্টস সরঞ্জাম', en: 'Sports Equipment' },
      { value: 'outdoor', bn: 'আউটডোর ও ট্র্যাভেল', en: 'Outdoor & Travel' },
    ]},
    { group: { bn: '🔥 বিশেষ', en: '🔥 Special' }, options: [
      { value: 'offers', bn: 'অফার জোন', en: 'Offers Zone' },
    ]},
  ];

  function populateProductCategoryDropdown() {
    const select = document.getElementById('new-product-category');
    if (!select) return;
    const prevValue = select.value;
    const isBn = currentLang === 'bn';
    select.innerHTML = PRODUCT_CATEGORIES.map(g => {
      const optionsHtml = g.options.map(o =>
        `<option value="${o.value}">${isBn ? o.bn : o.en}</option>`
      ).join('');
      const groupLabel = isBn ? g.group.bn : g.group.en;
      return `<optgroup label="${escapeHtml(groupLabel)}">${optionsHtml}</optgroup>`;
    }).join('');
    if (prevValue) select.value = prevValue;
  }

  function toggleLanguage() {
    currentLang = currentLang === 'bn' ? 'en' : 'bn';
    localStorage.setItem('siteLang', currentLang);
    applyLanguage();
    showCartToast(currentLang === 'bn' ? '🇧🇩 বাংলা ভাষা চালু হয়েছে' : '🇺🇸 English language enabled');
  }

  function applyLanguage() {
    const isBn = currentLang === 'bn';

    // HTML lang attribute
    document.documentElement.lang = isBn ? 'bn' : 'en';

    // Meta Tags Dynamic Update
    document.getElementById('page-title')?.setAttribute('content', t('pageTitle'));
    document.title = t('pageTitle');
    document.getElementById('meta-description')?.setAttribute('content', t('metaDesc'));
    document.getElementById('og-title')?.setAttribute('content', t('pageTitle'));
    document.getElementById('og-description')?.setAttribute('content', t('metaDesc'));
    document.getElementById('og-locale')?.setAttribute('content', t('ogLocale'));

    // Header
    // ✅ ক্লিনআপ: 'site-title-text' নামের কোনো এলিমেন্ট হেডারে নেই (আগের কোনো রিফ্যাক্টরে সরে গেছে),
    // তাই ডেড কোডটি সরানো হলো — এটা ক্ষতিকর ছিল না (null-guarded), শুধু অপ্রয়োজনীয় ছিল।

    const langFlag  = document.getElementById('lang-flag');
    const langLabel = document.getElementById('lang-label');
    const langAlt   = document.getElementById('lang-flag-alt');
    if (langFlag)  langFlag.innerText  = isBn ? '🇧🇩' : '🇺🇸';
    if (langLabel) langLabel.innerText = isBn ? 'বাংলা' : 'English';
    if (langAlt)   langAlt.innerText   = isBn ? 'English' : 'বাংলা';
    // feature-34: profile lang toggle checkbox sync (checked = English)
    const langCb = document.getElementById('profile-lang-toggle');
    if (langCb) langCb.checked = !isBn;

    // Search placeholder
    const searchInput = document.getElementById('search-input-field');
    if (searchInput) searchInput.placeholder = t('searchPlaceholder');

    // Header Profile Button (only update if not currently showing a logged-in user's own name)
    const profileNameEl = document.getElementById('header-profile-name');
    const profileSubEl  = document.getElementById('header-profile-sub');
    if (profileNameEl && (!currentUser || profileNameEl.innerText === 'প্রোফাইল' || profileNameEl.innerText === 'Profile')) {
      profileNameEl.innerText = t('profileDefaultName');
    }
    if (profileSubEl && !currentUser) {
      profileSubEl.innerText = t('profileLoginPrompt');
    } else if (profileSubEl && currentUser) {
      profileSubEl.innerText = t('profileViewPrompt');
    }

    // Search History Dropdown
    const searchHistTitle = document.getElementById('search-history-title');
    const searchHistClear = document.getElementById('search-history-clear-btn');
    if (searchHistTitle) searchHistTitle.innerText = t('searchHistoryTitle');
    if (searchHistClear) searchHistClear.innerText = t('searchHistoryClear');

    // Promo Banners
    const promoMap = {
      'promo1-tag': 'promo1Tag', 'promo1-title': 'promo1Title', 'promo1-sub': 'promo1Sub', 'promo1-btn': 'promo1Btn',
      'promo2-tag': 'promo2Tag', 'promo2-title': 'promo2Title', 'promo2-sub': 'promo2Sub', 'promo2-btn': 'promo2Btn',
      'promo3-tag': 'promo3Tag', 'promo3-title': 'promo3Title', 'promo3-sub': 'promo3Sub', 'promo3-btn': 'promo3Btn',
      'promo4-tag': 'promo4Tag', 'promo4-title': 'promo4Title', 'promo4-sub': 'promo4Sub', 'promo4-btn': 'promo4Btn',
    };
    Object.entries(promoMap).forEach(([id, key]) => {
      const el = document.getElementById(id);
      if (el) el.innerText = t(key);
    });

    // Customer Live Section & Recently Viewed
    const customerLiveTitleEl   = document.getElementById('customer-live-title');
    const goLiveLabelEl         = document.getElementById('go-live-label');
    const recentlyViewedTitleEl = document.getElementById('recently-viewed-title');
    if (customerLiveTitleEl)   customerLiveTitleEl.innerText   = t('customerLiveTitle');
    if (goLiveLabelEl)         goLiveLabelEl.innerText         = t('goLiveBtn');
    if (recentlyViewedTitleEl) recentlyViewedTitleEl.innerText = t('recentlyViewedTitle');
    // "No one is live" placeholder text, if currently shown
    const liveContainer = document.getElementById('active-streams-container');
    if (liveContainer && liveContainer.dataset.emptyState === 'true') {
      liveContainer.innerHTML = `<div class="flex items-center text-[10px] text-slate-400 font-medium self-center">${t('noOneLiveNow')}</div>`;
    }

    // Countdown / Today's Deal
    const dealTitleEl = document.getElementById('todays-deal-title');
    const dealSubEl   = document.getElementById('todays-deal-sub');
    const hoursLabelEl   = document.getElementById('hours-label');
    const minutesLabelEl = document.getElementById('minutes-label');
    const secondsLabelEl = document.getElementById('seconds-label');
    if (dealTitleEl) dealTitleEl.innerText = t('todaysDealTitle');
    if (dealSubEl)   dealSubEl.innerText   = t('todaysDealSub');
    if (hoursLabelEl)   hoursLabelEl.innerText   = t('hoursLabel');
    if (minutesLabelEl) minutesLabelEl.innerText = t('minutesLabel');
    if (secondsLabelEl) secondsLabelEl.innerText = t('secondsLabel');

    // Flash Sale Banner
    const flashRunningEl = document.getElementById('flash-sale-running-label');
    const flashViewBtnEl = document.getElementById('flash-sale-view-btn');
    if (flashRunningEl) flashRunningEl.innerText = t('flashSaleRunning');
    if (flashViewBtnEl) flashViewBtnEl.innerText = t('flashSaleViewBtn');

    // Customer Panel
    const customerPanelLabels = {
      'friend-count-section-label':  'friendCountSectionLabel',
      'friend-count-hint':           'communityHintTap',
      'loyalty-points-section-label': 'loyaltyPointsLabel',
      'loyalty-points-rate':         'loyaltyPointsRate',
      'referral-card-title':         'referralCardTitle',
      'referral-count-prefix':       'referralCountPrefix',
      'referral-count-suffix':       'referralCountSuffix',
      'address-book-title':          'addressBookTitle',
      'address-book-desc':           'addressBookDesc',
      'layer1-label':                'layer1Label',
      'capture-photo-btn':           'capturePhotoBtn',
      'live-camera-label':           'liveCameraLabel',
      'upload-photo-label':          'uploadPhotoLabel',
      'your-name-label':             'yourNameLabel',
      'mobile-number-label':         'mobileNumberLabel',
      'layer2-label':                'layer2Label',
      'layer3-label':                'layer3Label',
      'gps-location-label':          'gpsLocationLabel',
      'select-current-location-label': 'selectCurrentLocationLabel',
      'full-address-label':          'fullAddressLabel',
      'save-customer-info-btn':      'saveCustomerInfoBtn',
      'profile-verify-section-title':    'profileVerifySectionTitle',
      'profile-verify-section-subtitle': 'profileVerifySectionSubtitle',
      'customer-section-account-label': 'customerSectionAccountLabel',
      'customer-section-general-label': 'customerSectionGeneralLabel',
      'customer-row-settings-label':     'customerRowSettingsLabel',
      'customer-row-loyalty-label':      'customerRowLoyaltyLabel',
      'customer-row-loyalty-label-2':    'customerRowLoyaltyLabel',
      'customer-row-notification-label': 'customerRowNotificationLabel',
      'customer-row-notification-label-2': 'customerRowNotificationLabel',
      'customer-row-orders-label':       'customerRowOrdersLabel',
      'customer-row-orders-label-2':     'customerRowOrdersLabel',
      'customer-row-privacy-label':      'customerRowPrivacyLabel',
      'customer-row-privacy-label-2':    'customerRowPrivacyLabel',
      'customer-row-terms-label':        'customerRowTermsLabel',
      'customer-row-terms-label-2':      'customerRowTermsLabel',
      'customer-row-logout-label':       'customerRowLogoutLabel',
      'customer-settings-header-title':  'customerSettingsHeaderTitle',
      'notif-permission-title':       'notifPermissionTitle',
      'notif-permission-btn':         'notifPermissionBtn',
      'notif-pref-orders-title':      'notifPrefOrdersTitle',
      'notif-pref-orders-desc':       'notifPrefOrdersDesc',
      'notif-pref-promo-title':       'notifPrefPromoTitle',
      'notif-pref-promo-desc':        'notifPrefPromoDesc',
    };
    Object.entries(customerPanelLabels).forEach(([id, key]) => {
      const el = document.getElementById(id);
      if (el) el.innerText = t(key);
    });

    // ✅ কমিউনিটি কাউন্ট রিং (ছোট, হেডারে) — title attribute আপডেট
    const ringCustomerBtn = document.getElementById('community-customer-ring');
    const ringSellerBtn   = document.getElementById('community-seller-ring');
    if (ringCustomerBtn) { ringCustomerBtn.title = t('communityCustomerLabel'); ringCustomerBtn.setAttribute('aria-label', t('communityCustomerLabel')); }
    if (ringSellerBtn)   { ringSellerBtn.title   = t('communitySellerLabel');   ringSellerBtn.setAttribute('aria-label', t('communitySellerLabel')); }
    const peopleSearchEl = document.getElementById('people-browser-search');
    if (peopleSearchEl) peopleSearchEl.placeholder = t('peopleSearchPlaceholder');
    const peerChatInputEl = document.getElementById('peer-chat-input');
    if (peerChatInputEl) peerChatInputEl.placeholder = t('chatInputPlaceholder');
    const peerVoiceRecLabelEl = document.getElementById('peer-chat-voice-recording-label');
    if (peerVoiceRecLabelEl) peerVoiceRecLabelEl.innerText = t('recordingInProgressLabel');
    if (_peopleBrowserType && !document.getElementById('people-browser-modal').classList.contains('hidden')) {
      const titleEl = document.getElementById('people-browser-title');
      if (titleEl) {
        if (_peopleBrowserType === 'customer') titleEl.innerText = t('communityCustomersTitle');
        else if (_peopleBrowserType === 'seller') titleEl.innerText = t('communitySellersTitle');
        else if (_peopleBrowserType === 'inbox') titleEl.innerText = t('friendRequestsInboxTitle');
      }
    }
    // referral-card-desc has an embedded <span> for the point count, so build it with innerHTML
    const referralDescEl = document.getElementById('referral-card-desc');
    if (referralDescEl) {
      referralDescEl.innerHTML = isBn
        ? `আপনার কোড দিয়ে কেউ প্রথম অর্ডার করলে আপনি ও আপনার বন্ধু দুজনেই <span class="font-bold text-violet-600">৫০ পয়েন্ট</span> পাবেন!`
        : `When someone uses your code on their first order, you and your friend both get <span class="font-bold text-violet-600">50 points</span>!`;
    }

    // Seller Panel — Top Section
    const sellerPanelTopLabels = {
      'seller-dashboard-live-label':   'sellerDashboardLive',
      'admin-notif-title':             'adminNotifTitle',
      'mark-all-read-btn':             'markAllReadBtn',
      'no-new-notif-label':            'noNewNotifLabel',
      'provider-mode-title':           'providerModeTitle',
      'online-toggle-label':           'onlineToggleLabel',
      'provider-mode-desc':            'providerModeDesc',
      'service-type-label':            'serviceTypeLabel',
      'opt-select':                    'optSelect',
      'opt-taxi':                      'optTaxi',
      'opt-bike':                      'optBike',
      'opt-airbus':                    'optAirbus',
      'opt-helicopter':                'optHelicopter',
      'opt-airticket':                 'optAirticket',
      'opt-tourguide':                 'optTourguide',
      'opt-hotel':                     'optHotel',
      'provider-name-label':           'providerNameLabel',
      'provider-phone-label':          'providerPhoneLabel',
      'free-now-label':                'freeNowLabel',
      'stat-inventory-label':          'statInventoryLabel',
      'stat-sold-label':               'statSoldLabel',
      'stat-earnings-label':           'statEarningsLabel',
      'refresh-earnings-label':        'refreshEarningsLabel',
      'analytics-dashboard-title':     'analyticsDashboardTitle',
      'analytics-week-label':          'analyticsWeekLabel',
      'analytics-month-label':         'analyticsMonthLabel',
      'analytics-total-orders-label':  'analyticsTotalOrdersLabel',
      'analytics-orders-change':       'loadingLabel',
      'analytics-total-revenue-label': 'analyticsTotalRevenueLabel',
      'analytics-revenue-change':      'loadingLabel',
      'analytics-pending-orders-label': 'analyticsPendingOrdersLabel',
      'analytics-pending-waiting-label': 'analyticsPendingWaitingLabel',
      'analytics-total-customers-label': 'analyticsTotalCustomersLabel',
      'daily-sales-label':             'dailySalesLabel',
      'analytics-chart-loading':       'loadingLabel',
      'payment-method-label':          'paymentMethodLabel',
      'payment-cod-label':             'paymentCodLabel',
      'payment-bkash-label':           'paymentBkashLabel',
      'payment-nagad-label':           'paymentNagadLabel',
      'payment-rocket-label':          'paymentRocketLabel',
      'payment-qr-label':              'paymentQrLabel',
      'payment-emi-label':             'paymentEmiLabel',
      'bestsellers-label':             'bestsellersLabel',
      'bestsellers-loading':           'loadingLabel',
      'customer-area-label':           'customerAreaLabel',
      'area-breakdown-loading':        'loadingLabel',
    };
    Object.entries(sellerPanelTopLabels).forEach(([id, key]) => {
      const el = document.getElementById(id);
      if (el) el.innerText = t(key);
    });

    // Seller Panel — Lower Section (low-stock, bulk upload, support chat, policy, new product, shop config, admin, orders)
    const sellerPanelLowerLabels = {
      'low-stock-title':              'lowStockTitle',
      'check-now-label':              'checkNowLabel',
      'stock-ok-label':                'stockOkLabel',
      'alert-threshold-label':        'alertThresholdLabel',
      'alert-threshold-suffix':       'alertThresholdSuffix',
      'bulk-upload-title':            'bulkUploadTitle',
      'bulk-upload-desc':             'bulkUploadDesc',
      'csv-template-download-label':  'csvTemplateDownloadLabel',
      'csv-select-file-label':        'csvSelectFileLabel',
      'preview-label':                'previewLabel',
      'upload-all-products-label':    'uploadAllProductsLabel',
      'support-chat-title':           'supportChatTitle',
      'chat-online-label':            'chatOnlineLabel',
      'chat-welcome-msg':             'chatWelcomeMsg',
      'chat-welcome-meta':            'chatWelcomeMeta',
      'seller-policy-title':          'sellerPolicyTitle',
      'policy-item-1':                'policyItem1',
      'policy-item-2':                'policyItem2',
      'policy-item-3':                'policyItem3',
      'policy-item-4':                'policyItem4',
      'new-product-upload-title':     'newProductUploadTitle',
      'product-file-status-text':     'productImageSelectLabel',
      'product-name-label':           'productNameLabel',
      'product-price-label':          'productPriceLabel',
      'product-category-label':       'productCategoryLabel',
      'product-sizes-label':          'productSizesLabel',
      'shop-config-title':            'shopConfigTitle',
      'shop-logo-label':              'shopLogoLabel',
      'change-logo-btn':              'changeLogoBtn',
      'shop-public-name-label':       'shopPublicNameLabel',
      'shop-whatsapp-label':          'shopWhatsappLabel',
      'update-shop-data-btn':         'updateShopDataBtn',
      'seller-approval-title':        'sellerApprovalTitle',
      'refresh-label':                'refreshLabel',
      'loading-label-1':              'loadingLabel1',
      'create-coupon-title':          'createCouponTitle',
      'coupon-type-percent':          'couponTypePercent',
      'coupon-type-fixed':            'couponTypeFixed',
      'create-coupon-btn-label':      'createCouponBtnLabel',
      'loading-label-2':              'loadingLabel2',
      'realtime-orders-title':        'realtimeOrdersTitle',
      'filter-all-label':             'filterAllLabel',
      'filter-pending-label':         'filterPendingLabel',
      'filter-processing-label':      'filterProcessingLabel',
      'filter-delivered-label':       'filterDeliveredLabel',
      'orders-loading-label':         'ordersLoadingLabel',
      'chat-unread-badge':            'newBadgeLabel',
    };
    Object.entries(sellerPanelLowerLabels).forEach(([id, key]) => {
      const el = document.getElementById(id);
      if (el) el.innerText = t(key);
    });

    // Placeholders for inputs in the lower seller panel
    const newProductNameInput = document.getElementById('new-product-name');
    const newProductSizesInput = document.getElementById('new-product-sizes');
    const supportChatInput = document.getElementById('support-chat-input');
    const sellerShopNameInput = document.getElementById('seller-shop-name-input');
    const newCouponCodeInput = document.getElementById('new-coupon-code');
    const newCouponValueInput = document.getElementById('new-coupon-value');
    const newCouponMinInput = document.getElementById('new-coupon-min');
    const newCouponLimitInput = document.getElementById('new-coupon-limit');
    if (newProductNameInput)  newProductNameInput.placeholder  = t('productNamePh');
    if (newProductSizesInput) newProductSizesInput.placeholder = t('productSizesPh');
    if (supportChatInput)     supportChatInput.placeholder     = t('chatInputPlaceholder');
    if (sellerShopNameInput)  sellerShopNameInput.placeholder  = t('shopNamePh');
    if (newCouponCodeInput)   newCouponCodeInput.placeholder   = t('couponCodePh');
    if (newCouponValueInput)  newCouponValueInput.placeholder  = t('couponValuePh');
    if (newCouponMinInput)    newCouponMinInput.placeholder    = t('couponMinOrderPh');
    if (newCouponLimitInput)  newCouponLimitInput.placeholder  = t('couponUsageLimitPh');

    // Publish product button & product image label
    const publishProductBtnEl = document.getElementById('publish-product-btn');
    const productImageLabelEl = document.getElementById('product-image-label');
    if (publishProductBtnEl) publishProductBtnEl.innerText = t('publishProductBtn');
    if (productImageLabelEl) productImageLabelEl.innerText = t('productImageLabel');
    // Typewriter prefix
    const typewriterPrefix = document.getElementById('typewriter-prefix');
    if (typewriterPrefix) typewriterPrefix.innerText = t('typewriterPrefix');

    // Nav Labels
    const navLabels = {
      'nav-label-home':    'navHome',
      'nav-label-cart':    'navCart',
      'nav-label-live':    'navLive',
      'nav-label-service': 'navService',
      'nav-label-menu':    'navMenu',
      'nav-label-profile': 'navProfile',
    };
    Object.entries(navLabels).forEach(([id, key]) => {
      const el = document.getElementById(id);
      if (el) el.innerText = t(key);
    });

    // Cart Modal
    const cartLabels = {
      'cart-modal-title':        'cartTitle',
      'cart-total-label':        'cartTotal',
      'cart-name-label':         'cartNameLabel',
      'cart-phone-label':        'cartPhoneLabel',
      'cart-address-label':      'cartAddressLabel',
      'cart-payment-label':      'cartPayLabel',
      'cart-order-btn-text':     'cartOrderBtn',
    };
    Object.entries(cartLabels).forEach(([id, key]) => {
      const el = document.getElementById(id);
      if (el) el.innerText = t(key);
    });
    const cartNameInput    = document.getElementById('customer-name');
    const cartPhoneInput   = document.getElementById('customer-phone');
    const cartAddressInput = document.getElementById('customer-address');
    if (cartNameInput)    cartNameInput.placeholder    = t('cartNamePh');
    if (cartPhoneInput)   cartPhoneInput.placeholder   = t('cartPhonePh');
    if (cartAddressInput) cartAddressInput.placeholder = t('cartAddressPh');

    // Service Modal
    const serviceTitle    = document.getElementById('services-modal-title');
    const serviceSubtitle = document.getElementById('services-modal-subtitle');
    if (serviceTitle)    serviceTitle.innerText    = t('serviceTitle');
    if (serviceSubtitle) serviceSubtitle.innerText = t('serviceSubtitle');

    const serviceModalLabels = {
      'nearby-live-label':        'nearbyLiveLabel',
      'you-are-here-label':       'youAreHereLabel',
      'view-on-gmap-label':       'viewOnGmapLabel',
      'svc-tile-taxi-title':      'svcTaxiTitle',
      'svc-tile-taxi-sub':        'svcTaxiSub',
      'svc-tile-bike-title':      'svcBikeTitle',
      'svc-tile-bike-sub':        'svcBikeSub',
      'svc-tile-airbus-title':    'svcAirbusTitle',
      'svc-tile-airbus-sub':      'svcAirbusSub',
      'svc-tile-ticket-title':    'svcTicketTitle',
      'svc-tile-ticket-sub':      'svcTicketSub',
      'svc-tile-helicopter-title': 'svcHelicopterTitle',
      'svc-tile-helicopter-sub':  'svcHelicopterSub',
      'svc-tile-airticket-title': 'svcAirticketTitle',
      'svc-tile-airticket-sub':   'svcAirticketSub',
      'svc-tile-tourguide-title': 'svcTourguideTitle',
      'svc-tile-tourguide-sub':   'svcTourguideSub',
      'svc-tile-hotel-title':     'svcHotelTitle',
      'svc-tile-hotel-sub':       'svcHotelSub',
      'svc-tile-hajj-title':      'svcHajjTitle',
      'svc-tile-hajj-sub':        'svcHajjSub',
      'svc-tile-mybookings-title': 'svcMyBookingsTitle',
      'svc-tile-mybookings-sub':  'svcMyBookingsSub',
    };
    Object.entries(serviceModalLabels).forEach(([id, key]) => {
      const el = document.getElementById(id);
      if (el) el.innerText = t(key);
    });

    // Nearby provider count placeholder (only overwrite while still in initial "searching" state)
    const nearbyCountEl = document.getElementById('nearby-provider-count');
    if (nearbyCountEl && nearbyCountEl.dataset.searching !== 'false') {
      nearbyCountEl.innerText = t('nearbyProviderSearching');
    }

    // Service Detail modal
    const serviceBookBtnLabelEl = document.getElementById('service-book-btn-label');
    if (serviceBookBtnLabelEl) serviceBookBtnLabelEl.innerText = t('serviceBookBtnLabel');

    // My Bookings modal
    const myBookingsTitleEl   = document.getElementById('my-bookings-title');
    const myBookingsLoadingEl = document.getElementById('my-bookings-loading');
    if (myBookingsTitleEl)   myBookingsTitleEl.innerText   = t('myBookingsTitle');
    if (myBookingsLoadingEl) myBookingsLoadingEl.innerText = t('loadingText');

    // Address Book modal
    const addrbookModalTitleEl = document.getElementById('addrbook-modal-title');
    const addrbookModalSubEl   = document.getElementById('addrbook-modal-sub');
    const addrbookNewBtnEl     = document.getElementById('addrbook-new-btn-label');
    const addrbookLoadingEl    = document.getElementById('addrbook-loading');
    const addrDefaultLabelEl   = document.getElementById('addr-default-label');
    const addrSaveBtnLabelEl   = document.getElementById('addr-save-btn-label');
    const addrCancelBtnEl      = document.getElementById('addr-cancel-btn');
    if (addrbookModalTitleEl) addrbookModalTitleEl.innerText = t('addrbookTitle');
    if (addrbookModalSubEl)   addrbookModalSubEl.innerText   = t('addrbookSub');
    if (addrbookNewBtnEl)     addrbookNewBtnEl.innerText     = t('addrbookNewBtn');
    if (addrbookLoadingEl)    addrbookLoadingEl.innerText    = t('loadingText');
    if (addrDefaultLabelEl)   addrDefaultLabelEl.innerText  = t('addrDefaultLabel');
    if (addrSaveBtnLabelEl)   addrSaveBtnLabelEl.innerText  = t('addrSaveBtn');
    if (addrCancelBtnEl)      addrCancelBtnEl.innerText     = t('addrCancelBtn');
    // Address form placeholders
    const addrLabelInput = document.getElementById('addr-label');
    const addrNameInput  = document.getElementById('addr-name');
    const addrPhoneInput = document.getElementById('addr-phone');
    const addrTextArea   = document.getElementById('addr-text');
    if (addrLabelInput) addrLabelInput.placeholder = t('addrLabelPlaceholder');
    if (addrNameInput)  addrNameInput.placeholder  = t('addrNamePlaceholder');
    if (addrPhoneInput) addrPhoneInput.placeholder = t('addrPhonePlaceholder');
    if (addrTextArea)   addrTextArea.placeholder   = t('addrTextPlaceholder');

    // Direct Chat modal
    const directChatStatusEl  = document.getElementById('direct-chat-status-label');
    const directChatWelcomeEl = document.getElementById('direct-chat-welcome-msg');
    const directChatNowEl     = document.getElementById('direct-chat-welcome-time');
    const quickReplyOrderEl   = document.getElementById('quick-reply-order');
    const quickReplyReturnEl  = document.getElementById('quick-reply-return');
    const quickReplyPaymentEl = document.getElementById('quick-reply-payment');
    const quickReplyDeliveryEl= document.getElementById('quick-reply-delivery');
    const chatInputEl         = document.getElementById('direct-chat-input');
    const chatSearchEl        = document.getElementById('chat-search-input');
    const chatTabCustomerEl   = document.getElementById('chat-tab-customer');
    const chatTabAdminEl      = document.getElementById('chat-tab-admin');
    const adminChatLoadingEl  = document.getElementById('admin-chat-loading');
    if (directChatStatusEl)   directChatStatusEl.innerText   = t('directChatStatus');
    if (directChatWelcomeEl)  directChatWelcomeEl.innerText  = t('directChatWelcome');
    if (directChatNowEl)      directChatNowEl.innerText      = t('directChatNow');
    if (quickReplyOrderEl)    quickReplyOrderEl.innerText    = t('quickReplyOrder');
    if (quickReplyReturnEl)   quickReplyReturnEl.innerText   = t('quickReplyReturn');
    if (quickReplyPaymentEl)  quickReplyPaymentEl.innerText  = t('quickReplyPayment');
    if (quickReplyDeliveryEl) quickReplyDeliveryEl.innerText = t('quickReplyDelivery');
    if (chatInputEl)          chatInputEl.placeholder        = t('chatInputPlaceholder');
    if (chatSearchEl)         chatSearchEl.placeholder       = t('chatSearchPlaceholder');
    if (chatTabCustomerEl)    chatTabCustomerEl.innerText    = t('chatTabCustomer');
    if (chatTabAdminEl)       chatTabAdminEl.innerText       = t('chatTabAdmin');
    if (adminChatLoadingEl)   adminChatLoadingEl.innerText   = t('loadingText');

    // Login Screen
    const loginTitle    = document.getElementById('login-screen-title');
    const loginSubtitle = document.getElementById('login-screen-subtitle');
    const loginBtn      = document.getElementById('login-google-btn-text');
    const loginSkip     = document.getElementById('login-skip-text');
    if (loginTitle)    loginTitle.innerText    = t('loginTitle');
    if (loginSubtitle) loginSubtitle.innerText = t('loginSubtitle');
    if (loginBtn)      loginBtn.innerText      = t('loginBtn');
    if (loginSkip)     loginSkip.innerText     = t('loginSkip');

    // ✅ NEW (feature-54): Welcome ইন্ট্রো স্টেপ
    const welcomeTitle   = document.getElementById('auth-welcome-title');
    const welcomeDesc    = document.getElementById('auth-welcome-desc');
    const welcomeGetBtn  = document.getElementById('auth-welcome-get-started-label');
    const welcomeHaveAcc = document.getElementById('auth-welcome-have-account-text');
    const welcomeSignin  = document.getElementById('auth-welcome-signin-link');
    const welcomeSkip    = document.getElementById('auth-welcome-skip-text');
    if (welcomeTitle)   welcomeTitle.innerText   = t('authWelcomeTitle');
    if (welcomeDesc)    welcomeDesc.innerText    = t('authWelcomeDesc');
    if (welcomeGetBtn)  welcomeGetBtn.innerText  = t('authWelcomeGetStarted');
    if (welcomeHaveAcc) welcomeHaveAcc.innerText = t('authWelcomeHaveAccount');
    if (welcomeSignin)  welcomeSignin.innerText  = t('authSigninLink');
    if (welcomeSkip)    welcomeSkip.innerText    = t('authWelcomeSkip');

    // Auth Tabs (Email/Password)
    const authTabSigninLabel = document.getElementById('auth-tab-signin-label');
    const authTabSignupLabel = document.getElementById('auth-tab-signup-label');
    if (authTabSigninLabel) authTabSigninLabel.innerText = t('authSigninTab');
    if (authTabSignupLabel) authTabSignupLabel.innerText = t('authSignupTab');

    const authSigninEmailLabel    = document.getElementById('auth-signin-email-label');
    const authSigninEmailInput    = document.getElementById('auth-signin-email');
    const authSigninPasswordLabel = document.getElementById('auth-signin-password-label');
    const authSigninPasswordInput = document.getElementById('auth-signin-password');
    const authRememberLabel       = document.getElementById('auth-remember-label');
    const authForgotBtn           = document.getElementById('auth-forgot-password-btn');
    const authSigninBtnLabel      = document.getElementById('auth-signin-btn-label');
    if (authSigninEmailLabel)    authSigninEmailLabel.innerText      = t('authEmailLabel');
    if (authSigninEmailInput)    authSigninEmailInput.placeholder    = t('authEmailPlaceholder');
    if (authSigninPasswordLabel) authSigninPasswordLabel.innerText   = t('authPasswordLabel');
    if (authSigninPasswordInput) authSigninPasswordInput.placeholder = t('authPasswordPlaceholder');
    if (authRememberLabel)       authRememberLabel.innerText         = t('authRememberMe');
    if (authForgotBtn)           authForgotBtn.innerText             = t('authForgotPassword');
    if (authSigninBtnLabel)      authSigninBtnLabel.innerText        = t('authSigninBtn');

    const authSignupNameLabel     = document.getElementById('auth-signup-name-label');
    const authSignupNameInput     = document.getElementById('auth-signup-name');
    const authSignupEmailLabel    = document.getElementById('auth-signup-email-label');
    const authSignupEmailInput    = document.getElementById('auth-signup-email');
    const authSignupPasswordLabel = document.getElementById('auth-signup-password-label');
    const authSignupPasswordInput = document.getElementById('auth-signup-password');
    const authSignupConfirmLabel  = document.getElementById('auth-signup-confirm-label');
    const authSignupConfirmInput  = document.getElementById('auth-signup-confirm');
    const authSignupBtnLabel      = document.getElementById('auth-signup-btn-label');
    if (authSignupNameLabel)     authSignupNameLabel.innerText      = t('authFullNameLabel');
    if (authSignupNameInput)     authSignupNameInput.placeholder    = t('authFullNamePlaceholder');
    if (authSignupEmailLabel)    authSignupEmailLabel.innerText     = t('authEmailLabel');
    if (authSignupEmailInput)    authSignupEmailInput.placeholder   = t('authEmailPlaceholder');
    if (authSignupPasswordLabel) authSignupPasswordLabel.innerText  = t('authPasswordLabel');
    if (authSignupPasswordInput) authSignupPasswordInput.placeholder= t('authPasswordPlaceholder');
    if (authSignupConfirmLabel)  authSignupConfirmLabel.innerText   = t('authConfirmPasswordLabel');
    if (authSignupConfirmInput)  authSignupConfirmInput.placeholder = t('authConfirmPasswordPlaceholder');
    if (authSignupBtnLabel)      authSignupBtnLabel.innerText       = t('authSignupBtn');

    const authOrDividerEl = document.getElementById('auth-or-divider');
    if (authOrDividerEl) authOrDividerEl.innerText = t('authOrDivider');
    if (typeof refreshAuthToggleText === 'function') refreshAuthToggleText();


    // Tab Labels
    const customerTab = document.getElementById('tab-customer-label');
    const sellerTab   = document.getElementById('tab-seller-label');
    if (customerTab) customerTab.innerText = t('customerTab');
    if (sellerTab)   sellerTab.innerText   = t('sellerTab');

    // Order Tracking
    const trackTitle = document.getElementById('track-order-title');
    const trackInput = document.getElementById('tracking-id');
    const trackBtn   = document.getElementById('track-order-btn-text');
    if (trackTitle) trackTitle.innerText   = t('trackOrder');
    if (trackInput) trackInput.placeholder = t('trackPlaceholder');
    if (trackBtn)   trackBtn.innerText     = t('trackBtn');

    // Typewriter restart
    restartTypewriter();

    // Re-render the product category dropdown in the new language
    populateProductCategoryDropdown();
  }

  // Typewriter ভাষা অনুযায়ী রিস্টার্ট
  function restartTypewriter() {
    if (window._typewriterTimer) clearTimeout(window._typewriterTimer);
    const el = document.getElementById('typewriter');
    if (el) { el.innerText = ''; startTypewriter(); }
  }

  // ============================================================
  // ✅ পেমেন্ট নম্বর Config থেকে UI-তে বসাও
  // ============================================================
  function applyPaymentConfig() {
    const bkashNum  = document.getElementById('bkash-number');
    const nagadNum  = document.getElementById('nagad-number');
    const rocketNum = document.getElementById('rocket-number');
    if (bkashNum)  bkashNum.innerText  = PAYMENT_CONFIG.bkash.number;
    if (nagadNum)  nagadNum.innerText  = PAYMENT_CONFIG.nagad.number;
    if (rocketNum) rocketNum.innerText = PAYMENT_CONFIG.rocket.number;
  }

  // ✅ togglePaymentFields — উপরে define হয়েছে


  // ============================================================
  // ✅ ডেলিভারি চার্জ ক্যালকুলেটর
  // ============================================================
  function calculateDeliveryCharge() {
    const districtEl = document.getElementById('delivery-district');
    const weightEl   = document.getElementById('delivery-weight');
    const resultEl   = document.getElementById('delivery-result');
    if (!districtEl || !districtEl.value) { resultEl?.classList.add('hidden'); return; }

    const [district, division] = districtEl.value.split('|');
    const weight  = parseFloat(weightEl?.value || '1') || 1;
    const cartTotal = cart.reduce((a, i) => a + (i.price * i.quantity), 0);

    // ঢাকার মধ্যে নাকি বাইরে
    const isDhaka = division === 'ঢাকা';

    let baseCharge, perKgCharge, freeOver;
    if (isDhaka) {
      baseCharge  = DELIVERY_CONFIG.dhakaBase;
      perKgCharge = DELIVERY_CONFIG.dhakaPerKg;
      freeOver    = DELIVERY_CONFIG.dhakaFreeOver;
    } else {
      baseCharge  = DELIVERY_CONFIG.nationalBase;
      perKgCharge = DELIVERY_CONFIG.nationalPerKg;
      freeOver    = DELIVERY_CONFIG.nationalFreeOver;
    }

    // বিভাগ অনুযায়ী অতিরিক্ত চার্জ
    const divExtra = DELIVERY_CONFIG.divisionExtra[division] || 0;

    // ওজন চার্জ (১ কেজির বেশি)
    const extraWeight  = Math.max(0, weight - 1);
    const weightCharge = Math.round(extraWeight * perKgCharge);
    const totalCharge  = baseCharge + divExtra + weightCharge;

    // ফ্রি ডেলিভারি চেক
    const isFreeDelivery = cartTotal >= freeOver;
    const finalCharge = isFreeDelivery ? 0 : totalCharge;

    // UI আপডেট
    document.getElementById('delivery-base-charge').innerText   = `৳${baseCharge + divExtra}`;
    document.getElementById('delivery-weight-charge').innerText = weightCharge > 0 ? `৳${weightCharge}` : 'বিনামূল্যে';
    document.getElementById('delivery-total-charge').innerText  = isFreeDelivery ? '৳০ (বিনামূল্যে!)' : `৳${finalCharge}`;

    const freeMsgEl = document.getElementById('delivery-free-msg');
    if (freeMsgEl) {
      if (isFreeDelivery) {
        freeMsgEl.innerText = `🎉 ${freeOver.toLocaleString('bn-BD')} টাকার বেশি অর্ডারে ফ্রি ডেলিভারি!`;
      } else {
        const remaining = freeOver - cartTotal;
        freeMsgEl.innerText = `আরও ৳${remaining} এর পণ্য কিনলে ফ্রি ডেলিভারি পাবেন!`;
        freeMsgEl.className = 'text-[9px] text-orange-600 font-bold';
      }
    }

    resultEl?.classList.remove('hidden');

    // Address field-এ district যোগ করো
    const addressEl = document.getElementById('customer-address');
    if (addressEl && !addressEl.value.includes(district)) {
      if (addressEl.value) addressEl.value += `, ${district}`;
    }

    // ✅ [FIX #8] placeOrder এখন সরাসরি return মান ব্যবহার করে, window._deliveryCharge আর দরকার নেই
    // window._deliveryCharge = finalCharge; // DEPRECATED — সরানো হয়েছে
    return finalCharge;
  }


  // ============================================================
  // ✅ PUSH NOTIFICATION SYSTEM
  // ============================================================
  async function requestPushPermission() {
    if (!('Notification' in window)) {
      showCartToast('আপনার ব্রাউজার Push Notification সাপোর্ট করে না', 'error'); return false;
    }
    if (Notification.permission === 'granted') return true;
    if (Notification.permission === 'denied') {
      showCartToast('Notification বন্ধ আছে। Browser Settings থেকে চালু করুন।', 'warning'); return false;
    }
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  function sendPushNotification(title, body, icon, badge, url) {
    if (Notification.permission !== 'granted') return;
    icon  = icon  || 'https://bdbigbazzar.blogspot.com/icon-192.png';
    badge = badge || 'https://bdbigbazzar.blogspot.com/icon-192.png';
    url   = url   || 'https://bdbigbazzar.blogspot.com';
    const options = {
      body, icon, badge,
      tag: 'BD BiG BAZZAR-store',
      renotify: true,
      vibrate: [200, 100, 200],
      data: { url }
    };
    // Android Chrome-এ new Notification() কাজ করে না
    // ServiceWorker দিয়ে notification দেখাতে হয়
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.ready
        .then(function(reg) { reg.showNotification(title, options); })
        .catch(function() {
          try { new Notification(title, options); } catch(e) {}
        });
    } else {
      try { new Notification(title, options); } catch(e) {
        console.warn('Notification skipped (Android):', e.message);
      }
    }
  }

  // ✅ অর্ডার সফল হলে Push Notification
  function notifyOrderSuccess(orderId) {
    if (localStorage.getItem('notif_pref_orders') === 'off') return; // ✅ ইউজার বন্ধ করে রাখলে পাঠাবে না
    sendPushNotification(
      '✅ অর্ডার সফল হয়েছে!',
      `আপনার অর্ডার ID: ${orderId.substring(0,10)}... শীঘ্রই প্রসেস করা হবে।`,
    );
  }

  // ✅ Admin-এ নতুন অর্ডার এলে নোটিফিকেশন (Firestore admin_notifications-এ সেভ হয়,
  // initAdminNotificationListener() রিয়েল-টাইমে অ্যাডমিনকে ব্যাজ/টোস্টে দেখাবে)
  async function notifyAdminNewOrder(customerName, total, orderId) {
    try {
      await firestore.collection('admin_notifications').add({
        type: 'new_order',
        applicantName: customerName || 'কাস্টমার',
        message: `🛍️ নতুন অর্ডার! ৳${total} — ${customerName || 'কাস্টমার'}`,
        orderId: orderId || null,
        isRead: false,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    } catch (e) { console.error('Admin order notification error:', e); }
  }

  // ✅ Notification Permission প্রম্পট — অ্যাপ লোড হলে
  async function initPushNotifications() {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'default') {
      // ৫ সেকেন্ড পরে জিজ্ঞেস করো
      setTimeout(async () => {
        const granted = await requestPushPermission();
        if (granted && localStorage.getItem('notif_pref_promo') !== 'off') {
          sendPushNotification(
            '🎉 পারভেজ স্টোরে স্বাগতম!',
            'নতুন অফার ও অর্ডার আপডেট পেতে Notification চালু রাখুন।'
          );
        }
      }, 5000);
    }
  }

  // ============================================================
  // ✅ নোটিফিকেশন সেটিংস বটম-শিট — পারমিশন স্ট্যাটাস ও প্রেফারেন্স টগল
  // ============================================================
  // ✅ NEW: FCM VAPID key — Firebase Console → Project Settings → Cloud Messaging →
  // "Web Push certificates" থেকে জেনারেট করে এখানে বসাতে হবে
  const FCM_VAPID_KEY = "PASTE_YOUR_VAPID_KEY_HERE";

  // ✅ NEW: আসল push token নিয়ে Firestore-এ সেভ করা — এটাই সার্ভার (Cloud Function) থেকে
  // পাঠানো নোটিফিকেশন অ্যাপ বন্ধ থাকলেও পাওয়ার জন্য প্রয়োজনীয়
  async function syncFcmToken() {
    try {
      if (!currentUser) return;
      if (!('Notification' in window) || Notification.permission !== 'granted') return;
      if (!firebase.messaging || !firebase.messaging.isSupported || !firebase.messaging.isSupported()) return;

      const swReg = await navigator.serviceWorker.ready;
      const messaging = firebase.messaging();
      const token = await messaging.getToken({ vapidKey: FCM_VAPID_KEY, serviceWorkerRegistration: swReg });
      if (!token) return;

      await firestore.collection('users').doc(currentUser.uid).set({
        fcmTokens: firebase.firestore.FieldValue.arrayUnion(token)
      }, { merge: true });

      // ফোরগ্রাউন্ডে (ট্যাব খোলা অবস্থায়) মেসেজ এলে দেখানো — একবারই লিসেনার বসাও
      if (!window._fcmForegroundListenerStarted) {
        window._fcmForegroundListenerStarted = true;
        messaging.onMessage(payload => {
          const n = payload.notification || {};
          sendPushNotification(n.title || 'পারভেজ স্টোর', n.body || '', n.icon, null, payload.data?.url);
        });
      }
    } catch (e) {
      console.warn('FCM token sync failed:', e.message);
    }
  }

  async function enableBrowserPushNotification() {
    const granted = await requestPushPermission();
    refreshNotificationSettingsUi();
    if (granted) {
      showCartToast(t('notifEnabledToast'));
      syncFcmToken();
    }
  }

  function getNotifPref(type) {
    return localStorage.getItem('notif_pref_' + type) !== 'off'; // ডিফল্ট: চালু
  }

  function toggleNotifPref(type) {
    const current = getNotifPref(type);
    localStorage.setItem('notif_pref_' + type, current ? 'off' : 'on');
    refreshNotificationSettingsUi();
  }

  function refreshNotificationSettingsUi() {
    // ব্রাউজার পারমিশন স্ট্যাটাস
    const statusText = document.getElementById('notif-permission-status-text');
    const permBtn = document.getElementById('notif-permission-btn');
    if (statusText && permBtn) {
      const supported = 'Notification' in window;
      const perm = supported ? Notification.permission : 'unsupported';
      if (!supported) { statusText.innerText = t('notifStatusUnsupported'); permBtn.classList.add('hidden'); }
      else if (perm === 'granted') { statusText.innerText = t('notifStatusOn'); permBtn.classList.add('hidden'); }
      else if (perm === 'denied') { statusText.innerText = t('notifStatusDenied'); permBtn.classList.add('hidden'); }
      else { statusText.innerText = t('notifStatusOff'); permBtn.classList.remove('hidden'); }
    }
    // ক্যাটেগরি টগল
    ['orders', 'promo'].forEach(type => {
      const toggle = document.getElementById(`notif-pref-${type}-toggle`);
      const knob = document.getElementById(`notif-pref-${type}-knob`);
      if (!toggle || !knob) return;
      const on = getNotifPref(type);
      toggle.classList.toggle('bg-orange-500', on);
      toggle.classList.toggle('bg-slate-300', !on);
      knob.style.transform = on ? 'translateX(20px)' : 'translateX(0px)';
    });
  }

  // ✅ placeOrder delivery charge — মূল placeOrder-এ একত্রিত হয়েছে


  // ============================================================
  // ✅ PAYMENT SELECT আপডেট — পেমেন্ট option Nagad/Rocket যোগ
  // ============================================================
  function initPaymentSelect() {
    const select = document.getElementById('payment-method');
    if (!select) return;
    select.innerHTML = `
      <option value='cod'>💵 Cash on Delivery (ক্যাশ অন ডেলিভারি)</option>
      <option value='bkash'>🟣 bKash — ${PAYMENT_CONFIG.bkash.number}</option>
      <option value='nagad'>🟠 Nagad (নগদ) — ${PAYMENT_CONFIG.nagad.number}</option>
      <option value='rocket'>🔵 Rocket (রকেট) — ${PAYMENT_CONFIG.rocket.number}</option>
      <option value='qr'>📱 QR কোড পেমেন্ট</option>
      <option value='emi'>💳 EMI / কিস্তি সুবিধা</option>
    `;
    togglePaymentFields();
  }

  // ✅ showOrderSuccessModal — push notification মূল ফাংশনে একত্রিত হয়েছে



  // ============================================================
  // ✅ ADDRESS BOOK — সম্পূর্ণ CRUD (Firestore + localStorage fallback)
  // ============================================================
  let savedAddresses   = [];
  let editingAddressId = null;

  function openAddressBook() {
    const modal = document.getElementById('address-book-modal');
    if (!modal) return;
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    loadAddresses();
  }
  function closeAddressBook() {
    document.getElementById('address-book-modal')?.classList.add('hidden');
    document.body.style.overflow = 'auto';
    cancelAddressForm();
  }

  async function loadAddresses() {
    const container = document.getElementById('address-list-container');
    if (!container) return;
    container.innerHTML = `<div class='text-center py-8 text-slate-400 text-xs'><i class='fas fa-spinner fa-spin text-lg mb-2 block'></i> লোড হচ্ছে...</div>`;

    try {
      if (currentUser) {
        const snap = await firestore.collection('users').doc(currentUser.uid)
          .collection('addresses').orderBy('createdAt', 'desc').get();
        savedAddresses = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      } else {
        savedAddresses = safeJSONParse(localStorage.getItem('saved_addresses'), []);
      }
    } catch (e) {
      savedAddresses = safeJSONParse(localStorage.getItem('saved_addresses'), []);
    }
    renderAddressList();
  }

  function renderAddressList() {
    const container = document.getElementById('address-list-container');
    if (!container) return;
    if (savedAddresses.length === 0) {
      container.innerHTML = `
        <div class='flex flex-col items-center justify-center py-12 gap-3 text-center'>
          <div class='w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center'>
            <i class='fas fa-map-location-dot text-slate-300 text-2xl'></i>
          </div>
          <p class='text-sm font-bold text-slate-600'>কোনো সেভ করা ঠিকানা নেই</p>
          <p class='text-xs text-slate-400'>উপরে "নতুন ঠিকানা" বাটন চেপে যোগ করুন</p>
        </div>`;
      return;
    }
    container.innerHTML = savedAddresses.map(addr => `
      <div class='addr-card ${addr.isDefault ? 'default-addr' : ''}'>
        ${addr.isDefault ? '<span class="absolute top-3 right-3 text-[9px] font-black text-orange-600 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-full">ডিফল্ট</span>' : ''}
        <div class='flex items-start gap-3 pr-12'>
          <div class='w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${addr.isDefault ? 'bg-orange-100 text-orange-600' : 'bg-slate-100 text-slate-500'}'>
            <i class='fas ${addr.label?.includes('অফিস') ? 'fa-briefcase' : addr.label?.includes('মা') || addr.label?.includes('বাবা') ? 'fa-users' : 'fa-home'}'></i>
          </div>
          <div class='flex-1 min-w-0'>
            <p class='text-xs font-black text-slate-800'>${addr.label || 'ঠিকানা'}</p>
            <p class='text-[11px] font-bold text-slate-600 mt-0.5'>${escapeHtml(addr.name)} • ${escapeHtml(addr.phone)}</p>
            <p class='text-[10px] text-slate-500 mt-0.5 line-clamp-2'>${escapeHtml(addr.address)}</p>
          </div>
        </div>
        <div class='flex gap-1.5 mt-3 pt-2.5 border-t border-slate-100'>
          <button onclick='selectAddressForCheckout("${addr.id}")'
            class='flex-1 bg-slate-900 text-white text-[10px] font-bold py-2 rounded-xl active:scale-95 transition'>
            <i class='fas fa-check mr-1'></i> এই ঠিকানায় ডেলিভারি দিন
          </button>
          <button onclick='openEditAddressForm("${addr.id}")'
            class='w-9 h-9 bg-slate-100 text-slate-600 rounded-xl flex items-center justify-center hover:bg-slate-200 active:scale-95 transition'>
            <i class='fas fa-pen text-xs'></i>
          </button>
          ${!addr.isDefault ? `
          <button onclick='setDefaultAddress("${addr.id}")'
            class='w-9 h-9 bg-orange-50 text-orange-500 rounded-xl flex items-center justify-center hover:bg-orange-100 active:scale-95 transition' title='ডিফল্ট করুন'>
            <i class='fas fa-star text-xs'></i>
          </button>` : ''}
          <button onclick='deleteAddress("${addr.id}")'
            class='w-9 h-9 bg-red-50 text-red-500 rounded-xl flex items-center justify-center hover:bg-red-100 active:scale-95 transition'>
            <i class='fas fa-trash text-xs'></i>
          </button>
        </div>
      </div>`).join('');
  }

  function openAddAddressForm() {
    editingAddressId = null;
    clearAddressForm();
    document.getElementById('addr-form-title').innerHTML = `<i class='fas fa-location-dot text-orange-500'></i> ${t('addrFormTitleNew')}`;
    document.getElementById('address-form-wrap')?.classList.remove('hidden');
    document.getElementById('addr-label')?.focus();
  }

  function openEditAddressForm(id) {
    const addr = savedAddresses.find(a => a.id === id);
    if (!addr) return;
    editingAddressId = id;
    document.getElementById('addr-label').value    = addr.label || '';
    document.getElementById('addr-name').value     = addr.name || '';
    document.getElementById('addr-phone').value    = addr.phone || '';
    document.getElementById('addr-text').value     = addr.address || '';
    document.getElementById('addr-default-check').checked = !!addr.isDefault;
    document.getElementById('addr-form-title').innerHTML = `<i class='fas fa-pen text-orange-500'></i> ${t('addrFormTitleEdit')}`;
    document.getElementById('address-form-wrap')?.classList.remove('hidden');
  }

  function cancelAddressForm() {
    clearAddressForm();
    document.getElementById('address-form-wrap')?.classList.add('hidden');
    editingAddressId = null;
  }

  function clearAddressForm() {
    ['addr-label','addr-name','addr-phone','addr-text'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    const chk = document.getElementById('addr-default-check');
    if (chk) chk.checked = false;
  }

  async function saveAddressEntry() {
    const label     = document.getElementById('addr-label').value.trim();
    const name      = document.getElementById('addr-name').value.trim();
    const phone     = document.getElementById('addr-phone').value.trim();
    const address   = document.getElementById('addr-text').value.trim();
    const isDefault = document.getElementById('addr-default-check').checked;

    if (!name)    { alert('প্রাপকের নাম দিন!'); return; }
    if (!phone)   { alert('মোবাইল নম্বর দিন!'); return; }
    if (!address) { alert('ঠিকানা লিখুন!'); return; }

    const btn = document.getElementById('addr-save-btn');
    if (btn) { btn.disabled = true; btn.innerHTML = `<i class='fas fa-spinner fa-spin mr-1.5'></i> সেভ হচ্ছে...`; }

    const entry = { label: label || 'ঠিকানা', name, phone, address, isDefault,
      createdAt: firebase.firestore?.FieldValue?.serverTimestamp?.() || Date.now() };

    try {
      if (currentUser) {
        const col = firestore.collection('users').doc(currentUser.uid).collection('addresses');
        if (isDefault) {
          // বাকি সব ডিফল্ট তুলে নাও
          const existing = await col.where('isDefault','==',true).get();
          const batch = firestore.batch();
          existing.docs.forEach(d => batch.update(d.ref, { isDefault: false }));
          await batch.commit();
        }
        if (editingAddressId) {
          await col.doc(editingAddressId).update({ label: entry.label, name, phone, address, isDefault });
        } else {
          await col.add(entry);
        }
      } else {
        if (isDefault) savedAddresses.forEach(a => a.isDefault = false);
        if (editingAddressId) {
          const idx = savedAddresses.findIndex(a => a.id === editingAddressId);
          if (idx > -1) savedAddresses[idx] = { ...savedAddresses[idx], ...entry };
        } else {
          savedAddresses.unshift({ id: 'addr_' + Date.now(), ...entry });
        }
        localStorage.setItem('saved_addresses', JSON.stringify(savedAddresses));
      }
      cancelAddressForm();
      await loadAddresses();
    } catch (e) {
      alert('সেভ হয়নি: ' + e.message);
    } finally {
      if (btn) { btn.disabled = false; btn.innerHTML = `<i class='fas fa-floppy-disk mr-1.5'></i> সেভ করুন`; }
    }
  }

  async function deleteAddress(id) {
    if (!confirm('এই ঠিকানাটি মুছে ফেলতে চান?')) return;
    try {
      if (currentUser) {
        await firestore.collection('users').doc(currentUser.uid).collection('addresses').doc(id).delete();
      } else {
        savedAddresses = savedAddresses.filter(a => a.id !== id);
        localStorage.setItem('saved_addresses', JSON.stringify(savedAddresses));
      }
      await loadAddresses();
    } catch (e) { alert('মুছতে পারেনি: ' + e.message); }
  }

  async function setDefaultAddress(id) {
    try {
      if (currentUser) {
        const col = firestore.collection('users').doc(currentUser.uid).collection('addresses');
        const all = await col.get();
        const batch = firestore.batch();
        all.docs.forEach(d => batch.update(d.ref, { isDefault: d.id === id }));
        await batch.commit();
      } else {
        savedAddresses.forEach(a => { a.isDefault = a.id === id; });
        localStorage.setItem('saved_addresses', JSON.stringify(savedAddresses));
      }
      await loadAddresses();
    } catch (e) { alert('আপডেট হয়নি: ' + e.message); }
  }

  function selectAddressForCheckout(id) {
    const addr = savedAddresses.find(a => a.id === id);
    if (!addr) return;
    const nameEl  = document.getElementById('customer-name');
    const phoneEl = document.getElementById('customer-phone');
    const addrEl  = document.getElementById('customer-address');
    if (nameEl)  nameEl.value  = addr.name;
    if (phoneEl) phoneEl.value = addr.phone;
    if (addrEl)  addrEl.value  = addr.address;
    closeAddressBook();
    openCart();
    showCartToast?.(`✅ "${addr.label}" ঠিকানা সিলেক্ট হয়েছে`, 'success');
  }

  // Cart ফর্মে Address Book লিংক দেখানো
  function injectAddressBookLink() {
    const addrEl = document.getElementById('customer-address');
    if (!addrEl) return;
    const existingLink = document.getElementById('address-book-link');
    if (existingLink) return;
    const link = document.createElement('button');
    link.id = 'address-book-link';
    link.type = 'button';
    link.onclick = openAddressBook;
    link.className = 'text-[10px] text-violet-600 font-bold flex items-center gap-1 mt-1 hover:underline';
    link.innerHTML = `<i class='fas fa-book-bookmark'></i> সেভ করা ঠিকানা থেকে বেছে নিন`;
    addrEl.parentNode?.insertBefore(link, addrEl.nextSibling);
  }

  // ============================================================
  // ✅ CUSTOMER ↔ SELLER DIRECT CHAT (Firestore realtime)
  // ============================================================
  let directChatUserId      = null;
  let directChatListener    = null;
  let directChatMsgs        = [];
  let adminViewActiveUserId = null;
  let allChatUsers          = [];

  function openDirectChatModal() {
    const modal = document.getElementById('direct-chat-modal');
    if (!modal) return;
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    directChatUserId = currentUser?.uid || ('guest_' + (localStorage.getItem('guestId') || (() => {
      const g = 'g' + Date.now(); localStorage.setItem('guestId', g); return g;
    })()));
    // Admin হলে দুটো ট্যাব দেখাও
    const adminTab = document.getElementById('chat-tab-admin');
    if (adminTab && currentUser && ADMIN_EMAILS.includes(currentUser.email)) {
      adminTab.classList.remove('hidden');
    }
    switchChatView('customer');
  }

  function closeDirectChatModal() {
    document.getElementById('direct-chat-modal')?.classList.add('hidden');
    document.body.style.overflow = 'auto';
    if (directChatListener) { directChatListener(); directChatListener = null; }
  }

  function switchChatView(view) {
    const custView  = document.getElementById('chat-view-customer');
    const adminView = document.getElementById('chat-view-admin');
    const custTab   = document.getElementById('chat-tab-customer');
    const adminTab  = document.getElementById('chat-tab-admin');
    const title     = document.getElementById('direct-chat-title');
    if (view === 'customer') {
      custView?.classList.remove('hidden');
      adminView?.classList.add('hidden');
      if (custTab)  custTab.className  = 'text-[9px] font-black px-2 py-1 rounded-lg bg-white/20 text-white';
      if (adminTab) adminTab.className = 'hidden text-[9px] font-black px-2 py-1 rounded-lg text-white/60 hover:bg-white/10';
      if (title)    title.innerText    = 'পারভেজ স্টোর সাপোর্ট';
      listenDirectChat(directChatUserId);
    } else {
      custView?.classList.add('hidden');
      adminView?.classList.remove('hidden');
      if (custTab)  custTab.className  = 'text-[9px] font-black px-2 py-1 rounded-lg text-white/60 hover:bg-white/10';
      if (adminTab) adminTab.className = 'text-[9px] font-black px-2 py-1 rounded-lg bg-white/20 text-white';
      if (title)    title.innerText    = 'সব কাস্টমারের চ্যাট';
      loadAdminChatList();
    }
  }

  function listenDirectChat(userId) {
    if (!userId) return;
    if (directChatListener) { directChatListener(); directChatListener = null; }
    const container = document.getElementById('direct-chat-messages');
    if (container) container.innerHTML = `<div class='text-center py-6 text-slate-400 text-xs'><i class='fas fa-spinner fa-spin'></i></div>`;
    // ✅ [FIX] Customer চ্যাট খুললে unreadCustomer রিসেট করো
    const isAdmin = currentUser && ADMIN_EMAILS.includes(currentUser.email);
    if (!isAdmin) {
      firestore.collection('direct_chats').doc(userId)
        .set({ unreadCustomer: 0 }, { merge: true }).catch(() => {});
    }
    directChatListener = firestore.collection('direct_chats').doc(userId)
      .collection('messages').orderBy('createdAt').limit(80)
      .onSnapshot(snap => {
        directChatMsgs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        renderDirectChatMessages(userId);
        // অপঠিত admin মেসেজ মার্ক করো
        snap.docs.forEach(d => {
          if (d.data().sender === 'admin' && !d.data().read) {
            firestore.collection('direct_chats').doc(userId)
              .collection('messages').doc(d.id).update({ read: true }).catch(() => {});
          }
        });
      }, () => {
        if (container) container.innerHTML = `<div class='text-center py-6 text-red-400 text-xs'>সংযোগ ব্যর্থ হয়েছে।</div>`;
      });
  }

  function renderDirectChatMessages(userId) {
    const container = document.getElementById('direct-chat-messages');
    if (!container) return;
    if (directChatMsgs.length === 0) {
      container.innerHTML = `
        <div class='flex justify-start'>
          <div class='chat-bubble-seller'>
            👋 স্বাগতম পারভেজ স্টোরে! কী সাহায্য করতে পারি?
            <span class='text-[8px] text-slate-400 block mt-1'>Admin • এখন</span>
          </div>
        </div>`;
      return;
    }
    const isAdmin     = currentUser && ADMIN_EMAILS.includes(currentUser.email);
    const myUserId    = userId;
    container.innerHTML = directChatMsgs.map(m => {
      const isMine = isAdmin ? m.sender === 'admin' : m.sender === 'user';
      const time   = m.createdAt ? new Date(m.createdAt.seconds * 1000)
        .toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' }) : 'এখন';
      const img    = m.imageUrl ? `<img loading="lazy" src="${m.imageUrl}" class='max-w-[180px] rounded-xl mt-1 cursor-pointer' onclick='openImageLightbox("${m.imageUrl}")'/>` : '';
      return `
        <div class='flex ${isMine ? 'justify-end' : 'justify-start'}'>
          <div class='${isMine ? 'chat-bubble-customer' : 'chat-bubble-seller'}'>
            ${m.text ? `<span>${escapeHtml(m.text)}</span>` : ''}${img}
            <span class='text-[8px] ${isMine ? 'text-white/60' : 'text-slate-400'} block mt-1'>
              ${isMine ? 'আপনি' : escapeHtml(m.senderName || 'Admin')} • ${time}
              ${isMine && m.read ? ' ✓✓' : ''}
            </span>
          </div>
        </div>`;
    }).join('');
    container.scrollTop = container.scrollHeight;
  }

  async function sendDirectMessage() {
    const input   = document.getElementById('direct-chat-input');
    const text    = input?.value.trim();
    if (!text || !directChatUserId) return;
    input.value = '';
    autoResizeChatInput(input);
    const isAdmin = currentUser && ADMIN_EMAILS.includes(currentUser.email);
    const msg = {
      sender:     isAdmin ? 'admin' : 'user',
      senderName: currentUser?.displayName || 'কাস্টমার',
      text,
      read:       false,
      createdAt:  firebase.firestore.FieldValue.serverTimestamp()
    };
    const targetUid = isAdmin ? (adminViewActiveUserId || directChatUserId) : directChatUserId;
    try {
      // ডকুমেন্ট নিশ্চিত করা
      await firestore.collection('direct_chats').doc(targetUid).set({
        userId:          targetUid,
        userName:        currentUser?.displayName || 'কাস্টমার',
        userEmail:       currentUser?.email || '',
        lastMessage:     text,
        lastMessageAt:   firebase.firestore.FieldValue.serverTimestamp(),
        unreadAdmin:     isAdmin ? 0 : firebase.firestore.FieldValue.increment(1),
        // ✅ [FIX] Admin reply করলে customer-এর unread badge বাড়াও
        unreadCustomer:  isAdmin ? firebase.firestore.FieldValue.increment(1) : 0
      }, { merge: true });
      await firestore.collection('direct_chats').doc(targetUid)
        .collection('messages').add(msg);
      // Admin notification
      if (!isAdmin) {
        await firestore.collection('admin_notifications').add({
          type: 'direct_chat', applicantName: currentUser?.displayName || 'কাস্টমার',
          applicantPhoto: currentUser?.photoURL || '',
          message: `💬 নতুন মেসেজ: "${text.substring(0,40)}"`,
          isRead: false, createdAt: firebase.firestore.FieldValue.serverTimestamp()
        }).catch(() => {});
      }
    } catch (e) {
      // অফলাইন ফলব্যাক
      directChatMsgs.push({ ...msg, createdAt: { seconds: Date.now() / 1000 }, id: 'tmp' + Date.now() });
      renderDirectChatMessages(targetUid);
    }
  }

  function sendQuickReply(text) {
    const input = document.getElementById('direct-chat-input');
    if (input) { input.value = text; sendDirectMessage(); }
  }

  async function sendChatImage(inputEl) {
    if (!inputEl.files?.[0]) return;
    const file = inputEl.files[0];
    const reader = new FileReader();
    reader.onload = async (e) => {
      const imageUrl = e.target.result; // base64
      const targetUid = directChatUserId;
      const isAdmin   = currentUser && ADMIN_EMAILS.includes(currentUser.email);
      const msg = {
        sender: isAdmin ? 'admin' : 'user',
        senderName: currentUser?.displayName || 'কাস্টমার',
        text: '', imageUrl,
        read: false,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      };
      try {
        await firestore.collection('direct_chats').doc(targetUid).set({
          lastMessage: '📷 ছবি', lastMessageAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        await firestore.collection('direct_chats').doc(targetUid).collection('messages').add(msg);
      } catch (e) {
        directChatMsgs.push({ ...msg, createdAt: { seconds: Date.now() / 1000 }, id: 'tmp' + Date.now() });
        renderDirectChatMessages(targetUid);
      }
    };
    reader.readAsDataURL(file);
    inputEl.value = '';
  }

  // Admin — সব কাস্টমারের চ্যাট লিস্ট
  async function loadAdminChatList() {
    const listEl = document.getElementById('admin-chat-list');
    if (!listEl) return;
    listEl.innerHTML = `<div class='text-center py-8 text-slate-400 text-xs'><i class='fas fa-spinner fa-spin text-lg mb-2 block'></i></div>`;
    try {
      const snap = await firestore.collection('direct_chats')
        .orderBy('lastMessageAt', 'desc').limit(50).get();
      allChatUsers = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      renderAdminChatList(allChatUsers);
    } catch (e) {
      listEl.innerHTML = `<div class='text-center py-6 text-red-400 text-xs'>Firebase Rules চেক করুন</div>`;
    }
  }

  function renderAdminChatList(list) {
    const listEl = document.getElementById('admin-chat-list');
    if (!listEl) return;
    if (!list.length) {
      listEl.innerHTML = `<div class='text-center py-10 text-slate-400 text-xs'><i class='fas fa-comment-slash text-2xl mb-2 block text-slate-200'></i>কোনো চ্যাট নেই</div>`;
      return;
    }
    listEl.innerHTML = list.map(u => {
      const time = u.lastMessageAt ? new Date(u.lastMessageAt.seconds * 1000)
        .toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' }) : '';
      const unread = u.unreadAdmin || 0;
      // ✅ [BUG13 FIX] admin chat list preview-এ userName/lastMessage raw বসানো হতো —
      // যেকোনো ইউজার তার নামে/মেসেজে HTML/script বসিয়ে অ্যাডমিনের চ্যাট প্যানেলে
      // চালাতে পারত (stored XSS, অ্যাডমিন-টার্গেটেড)। এখন escape করা হচ্ছে।
      const safeUserNameAttr = (u.userName || '').replace(/[\\"']/g, '');
      return `
        <div onclick='openAdminChatThread("${u.id}", "${safeUserNameAttr}")' class='flex items-center gap-3 p-4 hover:bg-slate-50 cursor-pointer active:bg-slate-100 transition'>
          <div class='w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white font-black text-sm shrink-0'>
            ${(u.userName || 'K')[0].toUpperCase()}
          </div>
          <div class='flex-1 min-w-0'>
            <div class='flex items-center justify-between'>
              <p class='text-xs font-black text-slate-800 truncate'>${escapeHtml(u.userName) || 'কাস্টমার'}</p>
              <span class='text-[9px] text-slate-400 shrink-0 ml-1'>${time}</span>
            </div>
            <p class='text-[10px] text-slate-500 truncate mt-0.5'>${escapeHtml(u.lastMessage) || '...'}</p>
          </div>
          ${unread > 0 ? `<div class='w-5 h-5 rounded-full bg-violet-600 text-white text-[9px] font-black flex items-center justify-center shrink-0'>${unread}</div>` : ''}
        </div>`;
    }).join('');
  }

  function filterChatList(query) {
    const q = query.toLowerCase();
    renderAdminChatList(allChatUsers.filter(u => (u.userName || '').toLowerCase().includes(q)));
  }

  function openAdminChatThread(userId, userName) {
    adminViewActiveUserId = userId;
    // Customer view-এ সুইচ করে সেই user-এর মেসেজ দেখাও
    const title = document.getElementById('direct-chat-title');
    if (title) title.innerText = userName + ' এর সাথে চ্যাট';
    const custView  = document.getElementById('chat-view-customer');
    const adminView = document.getElementById('chat-view-admin');
    custView?.classList.remove('hidden');
    adminView?.classList.add('hidden');
    // Admin unread রিসেট
    firestore.collection('direct_chats').doc(userId).set({ unreadAdmin: 0 }, { merge: true }).catch(() => {});
    listenDirectChat(userId);
  }

  function autoResizeChatInput(el) {
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 96) + 'px';
  }

  // Bottom Nav-এ চ্যাট বাটন দেখানো
  function showChatFab() {
    // ✅ [FIX #6] style.display এর বদলে CSS class ব্যবহার করা হচ্ছে
    const fab = document.getElementById('chat-seller-fab');
    if (fab) fab.classList.add('visible');
  }

  // ============================================================
  // ✅ IMAGE ZOOM LIGHTBOX
  // ============================================================
  function openImageLightbox(src) {
    const lb = document.getElementById('img-lightbox');
    const img = document.getElementById('lightbox-img');
    if (!lb || !img) return;
    img.src = src;
    lb.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
  function closeImageLightbox() {
    const lb = document.getElementById('img-lightbox');
    if (lb) lb.classList.remove('open');
    document.body.style.overflow = 'auto';
  }
  // থাম্বনেইল ক্লিকে মেইন ছবি পরিবর্তন
  function switchDetailImage(src, thumbEl) {
    const mainImg = document.getElementById('detail-product-image');
    if (mainImg) mainImg.src = src;
    document.querySelectorAll('.detail-thumb').forEach(t => t.classList.remove('active'));
    if (thumbEl) thumbEl.classList.add('active');
  }
  // থাম্বনেইল স্ট্রিপ রেন্ডার (একাধিক ছবি সাপোর্ট)
  function renderDetailThumbs(product) {
    const strip = document.getElementById('detail-thumb-strip');
    if (!strip) return;
    // product.images অ্যারে থাকলে একাধিক ছবি, না হলে শুধু product.image
    const imgList = (Array.isArray(product.images) && product.images.length > 1)
      ? product.images
      : [product.image];
    if (imgList.length <= 1) { strip.innerHTML = ''; return; }
    strip.innerHTML = imgList.map((src, i) =>
      `<img src="${src}" class="detail-thumb ${i === 0 ? 'active' : ''}" loading="lazy"
        onclick="switchDetailImage('${src}', this)"
        onerror="this.style.display='none'" alt="ছবি ${i+1}"/>`
    ).join('');
  }
  // পণ্যের বিবরণ দেখানো
  function renderDetailDescription(product) {
    const box = document.getElementById('detail-description-box');
    const txt = document.getElementById('detail-description-text');
    if (!box || !txt) return;
    if (product.description && product.description.trim()) {
      txt.innerText = product.description;
      box.classList.remove('hidden');
    } else {
      box.classList.add('hidden');
    }
  }

  // ============================================================
  // ✅ PRODUCT COMPARE — সর্বোচ্চ ২টি পণ্য তুলনা
  // ============================================================
  let compareList = []; // max 2

  function toggleCompare() {
    if (!currentDetailProductId) return;
    const product = products.find(p => p.id == currentDetailProductId);
    if (!product) return;
    const idx = compareList.findIndex(p => p.id == product.id);
    const btn   = document.getElementById('detail-compare-btn');
    const label = document.getElementById('detail-compare-label');
    if (idx > -1) {
      // সরিয়ে দাও
      compareList.splice(idx, 1);
      if (btn)   btn.className = 'w-full border-2 border-blue-200 text-blue-600 font-bold text-sm py-2.5 rounded-2xl hover:bg-blue-50 active:scale-95 transition flex items-center justify-center gap-2';
      if (label) label.innerText = 'তুলনায় যোগ করুন';
    } else {
      if (compareList.length >= 2) { alert('সর্বোচ্চ ২টি পণ্য তুলনা করা যাবে!'); return; }
      compareList.push(product);
      if (btn)   btn.className = 'w-full border-2 border-blue-500 bg-blue-50 text-blue-700 font-bold text-sm py-2.5 rounded-2xl active:scale-95 transition flex items-center justify-center gap-2';
      if (label) label.innerText = 'তুলনা থেকে বাদ দিন ✓';
    }
    updateCompareFab();
  }

  function updateCompareFab() {
    const fab   = document.getElementById('compare-fab');
    const badge = document.getElementById('compare-count-badge');
    if (!fab) return;
    badge.innerText = compareList.length;
    fab.style.display = compareList.length > 0 ? 'flex' : 'none';
  }

  function clearCompare() {
    compareList = [];
    updateCompareFab();
    closeCompareModal();
  }

  // ✅ প্রোডাক্ট ডিটেইল মডাল থেকে উইশলিস্ট টগল
  function toggleWishlistFromDetail() {
    if (!currentDetailProductId) return;
    const product = products.find(p => p.id == currentDetailProductId);
    if (!product) return;
    toggleWishlist(product.id, product.name);

    const btn = document.getElementById('detail-wishlist-btn');
    const label = document.getElementById('detail-wishlist-label');
    const wishlist = safeJSONParse(localStorage.getItem('wishlist'), []);
    const inWishlist = wishlist.some(item => item.id == product.id);
    if (btn) {
      btn.className = inWishlist
        ? 'w-full border-2 border-rose-500 bg-rose-50 text-rose-700 font-bold text-sm py-2.5 rounded-2xl active:scale-95 transition flex items-center justify-center gap-2'
        : 'w-full border-2 border-rose-200 text-rose-600 font-bold text-sm py-2.5 rounded-2xl hover:bg-rose-50 active:scale-95 transition flex items-center justify-center gap-2';
    }
    if (label) label.innerText = inWishlist ? 'উইশলিস্ট থেকে বাদ দিন ✓' : 'উইশলিস্টে যোগ করুন';
  }

  function openCompareModal() {
    const modal   = document.getElementById('compare-modal');
    const content = document.getElementById('compare-content');
    if (!modal || !content) return;
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    if (compareList.length < 2) {
      content.innerHTML = `<div class="flex flex-col items-center justify-center py-10 text-center gap-3 text-slate-400">
        <i class="fas fa-scale-balanced text-3xl text-slate-200"></i>
        <p class="text-sm font-bold text-slate-600">আরও ${2 - compareList.length}টি পণ্য সিলেক্ট করুন</p>
        <p class="text-xs">পণ্যের বিবরণ খুলে "তুলনায় যোগ করুন" চাপুন</p>
      </div>`;
      return;
    }
    const [a, b] = compareList;
    const rows = [
      ['ছবি',      `<img loading="lazy" src="${a.image}" class="w-24 h-24 object-cover rounded-xl mx-auto border border-slate-100" onerror="this.src='https://placehold.co/96x96'"/>`,
                   `<img loading="lazy" src="${b.image}" class="w-24 h-24 object-cover rounded-xl mx-auto border border-slate-100" onerror="this.src='https://placehold.co/96x96'"/>`],
      ['নাম',      `<p class="text-xs font-bold text-slate-800 text-center">${a.name}</p>`,
                   `<p class="text-xs font-bold text-slate-800 text-center">${b.name}</p>`],
      ['মূল্য',    `<p class="text-base font-black text-orange-600 text-center">৳${a.price}</p>`,
                   `<p class="text-base font-black text-orange-600 text-center">৳${b.price}</p>`],
      ['রেটিং',   `<p class="text-center">${renderStarsHtml(getAvgRating(a), a.ratingCount||0, {size:'text-xs',showCount:true})}</p>`,
                   `<p class="text-center">${renderStarsHtml(getAvgRating(b), b.ratingCount||0, {size:'text-xs',showCount:true})}</p>`],
      ['স্টক',    `<p class="text-[11px] font-bold text-center ${a.stock>0?'text-emerald-600':'text-red-500'}">${a.stock>0?a.stock+' টি আছে':'স্টক শেষ'}</p>`,
                   `<p class="text-[11px] font-bold text-center ${b.stock>0?'text-emerald-600':'text-red-500'}">${b.stock>0?b.stock+' টি আছে':'স্টক শেষ'}</p>`],
      ['ক্যাটাগরি', `<p class="text-[10px] text-center text-slate-500 font-medium">${a.category}</p>`,
                    `<p class="text-[10px] text-center text-slate-500 font-medium">${b.category}</p>`],
      ['কার্টে যোগ',
        `<button onclick="addToCart('${a.id}');closeCompareModal();" class="w-full bg-slate-900 text-white text-xs font-bold py-2 rounded-xl active:scale-95 transition">কিনুন</button>`,
        `<button onclick="addToCart('${b.id}');closeCompareModal();" class="w-full bg-slate-900 text-white text-xs font-bold py-2 rounded-xl active:scale-95 transition">কিনুন</button>`],
    ];
    content.innerHTML = `
      <div class="overflow-x-auto">
        <table class="w-full text-xs">
          <thead>
            <tr>
              <th class="text-left text-[10px] text-slate-400 font-bold pb-2 w-1/4">বৈশিষ্ট্য</th>
              <th class="text-center text-[10px] text-blue-600 font-black pb-2 w-[37.5%] bg-blue-50 rounded-tl-xl px-1">পণ্য ১</th>
              <th class="text-center text-[10px] text-indigo-600 font-black pb-2 w-[37.5%] bg-indigo-50 rounded-tr-xl px-1">পণ্য ২</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            ${rows.map(([label, va, vb]) => `
              <tr>
                <td class="py-2.5 text-slate-500 font-bold text-[10px]">${label}</td>
                <td class="py-2.5 bg-blue-50/50 px-1">${va}</td>
                <td class="py-2.5 bg-indigo-50/50 px-1">${vb}</td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>`;
  }

  function closeCompareModal() {
    const modal = document.getElementById('compare-modal');
    if (modal) modal.classList.add('hidden');
    document.body.style.overflow = 'auto';
  }

  // ============================================================
  // ✅ FLASH SALE — নির্দিষ্ট পণ্যে কাউন্টডাউন টাইমার
  // ============================================================
  let flashSaleTimer = null;

  // Flash Sale Config — Admin এখানে customize করতে পারবেন
  const FLASH_SALE_CONFIG = {
    enabled:       true,
    durationHours: 6,          // কত ঘণ্টার Flash Sale
    discount:      40,         // শতাংশ ছাড়
    // যে ক্যাটাগরিতে Flash Sale চলবে
    categories:    ['offers', 'punjabi', 'saree', 'shoe', 'electronics'],
    storageKey:    'flash_sale_expiry',
  };

  function initFlashSale() {
    // ✅ ব্যানারটা HTML-এ নিচে define করা ছিল কিন্তু কখনো হোমপেজের আসল
    // স্লটে (flash-sale-inline-slot) move করা হয়নি — তাই এটা bottom nav-এর
    // নিচে আলাদাভাবে দেখা যেত। এখন প্রথমেই সঠিক জায়গায় বসিয়ে দেওয়া হচ্ছে।
    const homeBannerEl = document.getElementById('flash-sale-home-banner');
    const inlineSlot = document.getElementById('flash-sale-inline-slot');
    if (homeBannerEl && inlineSlot && homeBannerEl.parentElement !== inlineSlot) {
      inlineSlot.appendChild(homeBannerEl);
    }
    if (!FLASH_SALE_CONFIG.enabled) return;
    let expiry = parseInt(localStorage.getItem(FLASH_SALE_CONFIG.storageKey) || '0');
    const now = Date.now();
    if (!expiry || expiry <= now) {
      expiry = now + FLASH_SALE_CONFIG.durationHours * 3600 * 1000;
      localStorage.setItem(FLASH_SALE_CONFIG.storageKey, expiry.toString());
    }
    // হোম ব্যানার দেখাও
    const homeBanner = document.getElementById('flash-sale-home-banner');
    if (homeBanner) homeBanner.classList.remove('hidden');
    // টাইমার চালাও
    function tick() {
      const left = expiry - Date.now();
      if (left <= 0) {
        clearInterval(flashSaleTimer);
        const homeBanner = document.getElementById('flash-sale-home-banner');
        if (homeBanner) homeBanner.classList.add('hidden');
        return;
      }
      const hh = String(Math.floor(left / 3600000)).padStart(2,'0');
      const mm = String(Math.floor((left % 3600000) / 60000)).padStart(2,'0');
      const ss = String(Math.floor((left % 60000) / 1000)).padStart(2,'0');
      const timerStr = `${hh}:${mm}:${ss}`;
      // হোম ব্যানার টাইমার
      const homeTimer = document.getElementById('flash-home-timer');
      if (homeTimer) homeTimer.innerText = timerStr;
      // পণ্য ডিটেইল টাইমার
      ['flash-hh','flash-mm','flash-ss'].forEach((id, i) => {
        const el = document.getElementById(id);
        if (el) el.innerText = [hh,mm,ss][i];
      });
    }
    tick();
    flashSaleTimer = setInterval(tick, 1000);
    // পণ্য গ্রিডে Flash Sale পণ্যে ব্যাজ লাগাও
    applyFlashSaleBadgesToGrid();
  }

  function applyFlashSaleBadgesToGrid() {
    // প্রোডাক্ট রেন্ডার হওয়ার পরে চালাও
    setTimeout(() => {
      const cards = document.querySelectorAll('#product-grid > div');
      cards.forEach((card, i) => {
        const product = _getRenderedProductByIndex(i);
        if (!product) return;
        if (FLASH_SALE_CONFIG.categories.includes(product.category)) {
          card.classList.add('flash-sale-card');
          // ব্যাজ যোগ করো যদি না থাকে
          const imgWrap = card.querySelector('.overflow-hidden.relative');
          if (imgWrap && !imgWrap.querySelector('.flash-sale-badge')) {
            const badge = document.createElement('div');
            badge.className = 'flash-sale-badge';
            badge.innerHTML = `<i class='fas fa-bolt'></i> Flash Sale`;
            imgWrap.appendChild(badge);
          }
        }
      });
    }, 500);
  }

  // রেন্ডার করা পণ্যের ইনডেক্স থেকে product খুঁজি (গ্রিড অর্ডার অনুযায়ী)
  function _getRenderedProductByIndex(idx) {
    const grid = document.getElementById('product-grid');
    if (!grid) return null;
    const cards = grid.querySelectorAll(':scope > div');
    const card = cards[idx];
    if (!card) return null;
    // onclick থেকে id বের করা
    const btn = card.querySelector('[onclick*="openProductDetail"]');
    if (!btn) return null;
    const match = btn.getAttribute('onclick').match(/openProductDetail\('?([^')]+)'?\)/);
    if (!match) return null;
    return products.find(p => String(p.id) === String(match[1]));
  }

  // Detail modal-এ Flash Sale badge দেখানো
  function showFlashSaleInDetail(product) {
    const timerBox    = document.getElementById('detail-flash-timer-box');
    const flashBadge  = document.getElementById('detail-flash-badge');
    const flashLabel  = document.getElementById('detail-flash-label');
    const expiry      = parseInt(localStorage.getItem(FLASH_SALE_CONFIG.storageKey) || '0');
    const isActive    = FLASH_SALE_CONFIG.enabled && expiry > Date.now();
    const isFlashProd = FLASH_SALE_CONFIG.categories.includes(product.category);
    if (isActive && isFlashProd) {
      if (timerBox)   timerBox.classList.remove('hidden');
      if (flashBadge) flashBadge.classList.remove('hidden');
      if (flashLabel) flashLabel.innerText = `⚡ ${FLASH_SALE_CONFIG.discount}% Flash Sale!`;
    } else {
      if (timerBox)   timerBox.classList.add('hidden');
      if (flashBadge) flashBadge.classList.add('hidden');
    }
  }

  // ============================================================
  // ✅ [BUG11 FIX] Service Worker Registration — Blob URL দিয়ে
  // (Blogspot-এ আলাদা .js ফাইল হোস্ট করা যায় না, তাই SW কোডটা স্ট্রিং হিসেবে বানিয়ে
  //  Blob → Object URL → register() করা হচ্ছে। এই registration না থাকায়
  //  navigator.serviceWorker.controller সবসময় null থাকত, ফলে
  //  sendPushNotification() Android Chrome-এ কখনো কাজ করত না।)
  // ============================================================
  (function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) return;
    const swSource = `
      const OFFLINE_HTML = '<!DOCTYPE html><html lang="bn"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>পারভেজ স্টোর — অফলাইন</title><style>body{margin:0;height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#0f172a;color:#f1f5f9;font-family:sans-serif;text-align:center;padding:24px;box-sizing:border-box}h1{font-size:16px;margin:12px 0 6px}p{font-size:12px;color:#94a3b8;max-width:280px;line-height:1.6}</style></head><body><h1>ইন্টারনেট সংযোগ নেই</h1><p>সংযোগ চেক করে আবার চেষ্টা করুন।</p></body></html>';

      self.addEventListener('install', (event) => {
        self.skipWaiting();
      });

      self.addEventListener('activate', (event) => {
        event.waitUntil(self.clients.claim()); // ✅ প্রথম ভিজিটেই SW কন্ট্রোল নেয়, তাই controller null থাকে না
      });

      // ✅ Stale-while-revalidate — নেটওয়ার্ক ফেইল করলে ক্যাশ, নাহলে অফলাইন পেজ
      self.addEventListener('fetch', (event) => {
        if (event.request.method !== 'GET') return;
        event.respondWith(
          fetch(event.request).catch(() => {
            if (event.request.mode === 'navigate') {
              return new Response(OFFLINE_HTML, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
            }
            return caches.match(event.request);
          })
        );
      });

      // ✅ Push notification আসলে দেখানো — FCM data-only, notification, বা flat payload — সব শেপ সাপোর্ট করে
      self.addEventListener('push', (event) => {
        let payload = {};
        try { payload = event.data ? event.data.json() : {}; } catch (e) {}
        const d = payload.data || payload.notification || payload || {};
        const title = d.title || 'পারভেজ স্টোর';
        event.waitUntil(self.registration.showNotification(title, {
          body: d.body || '',
          icon: d.icon || 'https://bdbigbazzar.blogspot.com/icon-192.png',
          badge: 'https://bdbigbazzar.blogspot.com/icon-192.png',
          data: { url: d.url || 'https://bdbigbazzar.blogspot.com' }
        }));
      });

      self.addEventListener('notificationclick', (event) => {
        event.notification.close();
        const url = (event.notification.data && event.notification.data.url) || 'https://bdbigbazzar.blogspot.com';
        event.waitUntil(self.clients.openWindow(url));
      });
    `;
    try {
      const blob = new Blob([swSource], { type: 'text/javascript' });
      const swUrl = URL.createObjectURL(blob);
      navigator.serviceWorker.register(swUrl, { scope: '/' })
        .then(() => console.log('✅ Service Worker registered'))
        .catch((e) => console.warn('SW registration failed:', e.message));
    } catch (e) {
      console.warn('SW blob creation failed:', e.message);
    }
  })();

  // ============================================================
  // ✅ PWA INSTALL — মোবাইলে অ্যাপের মতো ইনস্টল করার সুবিধা
  // ============================================================
  let deferredInstallPrompt = null;

  // ব্রাউজার যখন বলে এই সাইট ইনস্টলযোগ্য, তখন বাটন দেখাও
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
    const btn = document.getElementById('pwa-install-btn');
    if (btn) btn.classList.remove('hidden');
  });

  async function installPWA() {
    const btn = document.getElementById('pwa-install-btn');
    if (!deferredInstallPrompt) {
      // ✅ iOS Safari-এ beforeinstallprompt সাপোর্ট নেই, ম্যানুয়াল গাইড দেখাও
      const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
      if (isIOS) {
        showCartToast?.('📲 ইনস্টল করতে: Share বাটনে ট্যাপ করুন, তারপর "Add to Home Screen" সিলেক্ট করুন', 'success');
      } else {
        showCartToast?.('আপনার ব্রাউজারে ইনস্টল অপশন এখনো প্রস্তুত হয়নি, কিছুক্ষণ পর চেষ্টা করুন', 'warning');
      }
      return;
    }
    deferredInstallPrompt.prompt();
    const choice = await deferredInstallPrompt.userChoice;
    if (choice.outcome === 'accepted') {
      showCartToast?.('✅ পারভেজ স্টোর সফলভাবে ইনস্টল হয়েছে!', 'success');
    }
    deferredInstallPrompt = null;
    if (btn) btn.classList.add('hidden');
  }

  // ইনস্টল সম্পন্ন হলে বাটন আবার হাইড করো
  window.addEventListener('appinstalled', () => {
    document.getElementById('pwa-install-btn')?.classList.add('hidden');
    deferredInstallPrompt = null;
  });

  // অ্যাপ যদি আগে থেকেই স্ট্যান্ডঅ্যালোন মোডে চলে (ইনস্টল করা থাকে), বাটন দেখানোর প্রয়োজন নেই
  function isRunningAsInstalledApp() {
    return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  }

  // ============================================================
  // ✅ OFFLINE MODE — ইন্টারনেট না থাকলেও সর্বশেষ পণ্য লোকালি দেখাও
  // ============================================================
  const OFFLINE_PRODUCTS_CACHE_KEY = 'BD BiG BAZZAR_store_products_cache';

  function cacheProductsForOffline(productList) {
    try {
      localStorage.setItem(OFFLINE_PRODUCTS_CACHE_KEY, JSON.stringify({
        products: productList,
        cachedAt: Date.now()
      }));
    } catch (e) { console.warn('Offline cache save failed:', e); }
  }

  function loadProductsFromOfflineCache() {
    try {
      const cached = JSON.parse(localStorage.getItem(OFFLINE_PRODUCTS_CACHE_KEY));
      return cached?.products?.length ? cached.products : null;
    } catch (e) { return null; }
  }

  function updateOfflineBanner() {
    const banner = document.getElementById('offline-banner');
    if (!banner) return;
    banner.classList.toggle('hidden', navigator.onLine);
  }

  // ✅ NEW (feature-21): PWA Offline Fallback Screen — সম্পূর্ণ অফলাইন + কোনো
  // ক্যাশড পণ্য না থাকলে দেখানোর জন্য
  function showOfflineFallback() {
    document.getElementById('offline-fallback-screen')?.classList.remove('hidden');
  }
  function dismissOfflineFallback() {
    document.getElementById('offline-fallback-screen')?.classList.add('hidden');
  }
  function retryOfflineConnection() {
    if (navigator.onLine) {
      dismissOfflineFallback();
      location.reload();
    } else {
      showCartToast?.('⚠️ এখনও ইন্টারনেট সংযোগ নেই', 'warning');
    }
  }

  function initOfflineDetection() {
    updateOfflineBanner();
    // ✅ FIX (feature-23): navigator.onLine পেজ লোডের ঠিক শুরুতে কখনো কখনো ভুলভাবে
    // false দেখায় (কিছু অ্যান্ড্রয়েড ব্রাউজারে স্টেল রিডিং)। তাই সাথে সাথে ব্লক না করে
    // ১.৫ সেকেন্ড অপেক্ষা করি — এই সময়ে আসল Firestore কানেকশন সফল হলে নিচের if-টা
    // আর ট্রু হবে না (initProductsListener-এর success callback ইতিমধ্যে dismiss করে দেবে)
    setTimeout(() => {
      if (!navigator.onLine && !loadProductsFromOfflineCache()) {
        showOfflineFallback();
      }
    }, 1500);
    window.addEventListener('online',  () => {
      updateOfflineBanner();
      dismissOfflineFallback();
      showCartToast?.('✅ ইন্টারনেট সংযোগ ফিরে এসেছে', 'success');
    });
    window.addEventListener('offline', () => { updateOfflineBanner(); showCartToast?.('⚠️ ইন্টারনেট সংযোগ নেই, অফলাইন মোডে দেখানো হচ্ছে', 'warning'); });
  }

  // ============================================================
  // ✅ SPLASH SCREEN — পেজ লোডে লোগো অ্যানিমেশন
  // ============================================================
  function initSplashScreen() {
    const splash = document.getElementById('splash-screen');
    if (!splash) return;
    const percentEl = document.getElementById('splash-percent');
    const startTime = Date.now();
    // ✅ মোবাইল 4G-তে Firebase + Firestore লোড হতে ২–৩ সেকেন্ড লাগতে পারে
    // products এলে আগেই hide হবে — এটা শুধু maximum safety timeout
    const MAX_WAIT = 3500;
    let done = false;

    // % counter — animation delay শেষ হওয়ার পরে শুরু করো (0.6s delay আছে CSS-এ)
    const percentTimer = percentEl ? setInterval(() => {
      if (done) { clearInterval(percentTimer); return; }
      const pct = Math.min(99, Math.round(((Date.now() - startTime) / MAX_WAIT) * 100));
      percentEl.innerText = pct + '%';
    }, 50) : null;

    function hideSplash() {
      if (done) return;
      done = true;
      if (percentTimer) clearInterval(percentTimer);
      if (percentEl) percentEl.innerText = '100%';
      splash.classList.add('hide');
      setTimeout(() => { splash.style.display = 'none'; }, 500);
    }

    window._splashHide = hideSplash;
    setTimeout(hideSplash, MAX_WAIT);
  }

  // ============================================================
  // ✅ PROMO BANNER SLIDER — অটো স্লাইড + ডটস
  // ============================================================
  function initPromoSlider() {
    const track = document.getElementById('promo-slider-track');
    const dotEls = document.querySelectorAll('.promo-dot');
    if (!track || !dotEls.length) return;
    let current = 0;
    const slides = track.querySelectorAll('.promo-slide');
    const total  = slides.length;
    function updateDots(idx) {
      dotEls.forEach((d, i) => d.classList.toggle('active', i === idx));
    }
    track.addEventListener('scroll', () => {
      const idx = Math.round(track.scrollLeft / Math.max(track.offsetWidth, 1));
      if (idx !== current) { current = Math.min(Math.max(idx, 0), total - 1); updateDots(current); }
    }, { passive: true });
    setInterval(() => {
      current = (current + 1) % total;
      const slide = slides[current];
      if (slide) track.scrollTo({ left: slide.offsetLeft - 16, behavior: 'smooth' });
      updateDots(current);
    }, 4000);
  }

  window.goToSlide = function(idx) {
    const track  = document.getElementById('promo-slider-track');
    const slides = track ? track.querySelectorAll('.promo-slide') : [];
    if (!slides[idx]) return;
    track.scrollTo({ left: slides[idx].offsetLeft - 16, behavior: 'smooth' });
    document.querySelectorAll('.promo-dot').forEach((d, i) => d.classList.toggle('active', i === idx));
  };

  // ============================================================
  // ✅ WHATSAPP — সেলারের নম্বর থেকে ডায়নামিক লিংক আপডেট
  // ============================================================
  function updateWhatsAppLink(number) {
    const btn = document.getElementById('floating-whatsapp');
    if (!btn || !number) return;
    const clean = number.replace(/\D/g, '');
    const intl  = clean.startsWith('0') ? '88' + clean : clean;
    btn.href = `https://wa.me/${intl}?text=${encodeURIComponent('হ্যালো পারভেজ স্টোর! আমি একটু সাহায্য চাই।')}`;
  }
  // Escape key দিয়ে Lightbox বন্ধ
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeImageLightbox();
      closeCompareModal();
    }
  });

  // ============================================================
  // ✅ window.onload — সব লিসেনার শুরু করো
  // ============================================================

  // ============================================================
  // ✅ Liquid Slide Toggle — হোম ↔ পেজ নেভিগেশন (feature-32)
  // ============================================================
  let _liquidNavState = 'home'; // 'home' | 'page'

  function liquidToggleNav(e) {
    const cb = document.getElementById('profile-page-nav-toggle');
    const sub = document.getElementById('profile-page-nav-sub');

    if (_liquidNavState === 'home') {
      // → পেজে যাও
      _liquidNavState = 'page';
      if (cb) cb.checked = true;
      if (sub) sub.textContent = 'হোমে ফিরে যান';
      closeProfile();
      openTejFeed();
    } else {
      // → হোমে ফেরো
      _liquidNavState = 'home';
      if (cb) cb.checked = false;
      if (sub) sub.textContent = 'সোশ্যাল ফিডে যান';
      closeTejFeed();
    }
  }

    window.onload = function() {
    // ── Critical (সাথে সাথে) ──────────────────────────────────
    initSplashScreen();          // splash আগে দেখাও
    applyDarkModePreference();   // flash এড়াতে আগে apply করো
    applyLanguage();             // UI ভাষা
    updateCartUi();              // কার্ট ব্যাজ
    updateWishlistCount();       // উইশলিস্ট ব্যাজ

    // ✅ [PERF FIX 9] Firestore-এর আগেই localStorage cache থেকে পণ্য দেখাও —
    // ব্যবহারকারী সাথে সাথে পণ্য দেখবেন, Firestore থেকে এলে update হবে
    const cachedEarly = loadProductsFromOfflineCache();
    if (cachedEarly && cachedEarly.length > 0) {
      products = cachedEarly;
      applyFiltersAndRender();
      renderRecentlyViewed();
      // cache থেকে দেখানো হলে splash সরাও
      if (typeof window._splashHide === 'function') { window._splashHide(); window._splashHide = null; }
    }

    initProductsListener();      // পণ্য লোড (Firestore — fresh data)
    applyPaymentConfig();
    initPaymentSelect();

    // ── Semi-critical (50ms পরে) ──────────────────────────────
    // [PERF FIX 5] এগুলো UI block করে না — একটু পরে চালু করলেও চলে
    setTimeout(() => {
      startTimer();
      startTypewriter();
      initPromoSlider();
      initFlashSale();
      renderRecentlyViewed();
      showChatFab();
      initOfflineDetection();
      if (isRunningAsInstalledApp()) {
        document.getElementById('pwa-install-btn')?.classList.add('hidden');
      }
      if (typeof PAYMENT_CONFIG !== 'undefined' && PAYMENT_CONFIG.bkash) {
        updateWhatsAppLink(PAYMENT_CONFIG.bkash.number);
      }
    }, 50);

    // ── Non-critical (1s পরে) ─────────────────────────────────
    // [PERF FIX 5] লাইভ স্ট্রিম ও push notification — এগুলো দেরিতে লোড হলেও অভিজ্ঞতা নষ্ট হয় না
    setTimeout(() => {
      initLiveStreamsListener();
      initPushNotifications();
      captureReferralFromUrl();
    }, 1000);

    // ── User-dependent (auth ready হওয়ার পরে) ─────────────────
    setTimeout(() => { if (currentUser) initSupportChat(); }, 2000);
  };

  //]]>
  