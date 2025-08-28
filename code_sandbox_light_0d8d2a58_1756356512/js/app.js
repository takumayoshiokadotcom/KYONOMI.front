// KYONOMI アプリケーション
class KyonomiApp {
    constructor() {
        this.currentUser = null;
        this.currentTab = 'homeTab';
        this.init();
    }

    init() {
        console.log('KYONOMI アプリを初期化中...');
        this.bindEvents();
        this.ensureTestUsers(); // テストユーザーの確保
        this.checkAuthStatus();
        this.resetDrinkingStatus();
    }

    // テストユーザーの確保
    ensureTestUsers() {
        if (!localStorage.getItem('kyonomi_all_users')) {
            console.log('テストユーザーを初期化中...');
            this.getLocalUsers(); // これによりデフォルトユーザーが設定される
        }
    }

    // イベントハンドラーのバインド
    bindEvents() {
        // 認証関連
        document.getElementById('loginTab').addEventListener('click', () => this.showLoginForm());
        document.getElementById('registerTab').addEventListener('click', () => this.showRegisterForm());
        document.getElementById('loginForm').addEventListener('submit', (e) => this.handleLogin(e));
        document.getElementById('registerForm').addEventListener('submit', (e) => this.handleRegister(e));
        document.getElementById('logoutBtn').addEventListener('click', () => this.handleLogout());

        // ナビゲーション
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchTab(e.target.closest('.nav-btn').dataset.tab));
        });

        // プロフィール編集
        document.getElementById('editProfileBtn').addEventListener('click', () => this.showEditProfileModal());
        document.getElementById('closeEditModal').addEventListener('click', () => this.hideEditProfileModal());
        document.getElementById('cancelEditBtn').addEventListener('click', () => this.hideEditProfileModal());
        document.getElementById('editProfileForm').addEventListener('submit', (e) => this.handleEditProfile(e));

        // 今日飲みトグル
        document.getElementById('drinkingToggleBtn').addEventListener('click', () => this.toggleDrinking());
        document.getElementById('drinkingSwitch').addEventListener('change', (e) => this.toggleDrinking(e.target.checked));

        // フォロー管理
        document.getElementById('searchBtn').addEventListener('click', () => this.searchUsers());
        document.getElementById('userSearchInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.searchUsers();
        });
        document.getElementById('followersTabBtn').addEventListener('click', () => this.showFollowSection('followers'));
        document.getElementById('followingTabBtn').addEventListener('click', () => this.showFollowSection('following'));
        document.getElementById('pendingTabBtn').addEventListener('click', () => this.showFollowSection('pending'));

        // 通知
        document.getElementById('notificationBtn').addEventListener('click', () => this.switchTab('notificationTab'));
        document.getElementById('closeContactModal').addEventListener('click', () => this.hideContactModal());
    }

    // 認証状態チェック
    checkAuthStatus() {
        console.log('認証状態をチェック中...');
        const userData = localStorage.getItem('kyonomi_user');
        if (userData) {
            console.log('既存ユーザーが見つかりました');
            this.currentUser = JSON.parse(userData);
            this.showMainApp();
        } else {
            console.log('ユーザーが見つかりません、認証画面を表示');
            this.showAuthSection();
        }
        
        // デバッグ情報を表示
        this.showDebugInfo();
    }

    // デバッグ情報表示
    showDebugInfo() {
        const debugInfo = {
            環境: window.location.hostname,
            プロトコル: window.location.protocol,
            現在時刻: new Date().toLocaleString('ja-JP'),
            ローカルストレージ: {
                ユーザー: !!localStorage.getItem('kyonomi_user'),
                全ユーザー: !!localStorage.getItem('kyonomi_all_users')
            }
        };
        console.log('KYONOMIデバッグ情報:', debugInfo);
    }

    // 日付変更時の今日飲みステータスリセット
    resetDrinkingStatus() {
        const today = new Date().toISOString().split('T')[0];
        if (this.currentUser && this.currentUser.last_drinking_date !== today && this.currentUser.is_drinking_today) {
            this.currentUser.is_drinking_today = false;
            this.currentUser.last_drinking_date = null;
            this.updateCurrentUser();
        }
    }

    // ログインフォーム表示
    showLoginForm() {
        document.getElementById('loginTab').className = 'flex-1 py-2 px-4 text-center font-medium border-b-2 border-purple-500 text-purple-600';
        document.getElementById('registerTab').className = 'flex-1 py-2 px-4 text-center font-medium text-gray-600 hover:text-purple-600';
        document.getElementById('loginForm').classList.remove('hidden');
        document.getElementById('registerForm').classList.add('hidden');
    }

    // 新規登録フォーム表示
    showRegisterForm() {
        document.getElementById('registerTab').className = 'flex-1 py-2 px-4 text-center font-medium border-b-2 border-purple-500 text-purple-600';
        document.getElementById('loginTab').className = 'flex-1 py-2 px-4 text-center font-medium text-gray-600 hover:text-purple-600';
        document.getElementById('registerForm').classList.remove('hidden');
        document.getElementById('loginForm').classList.add('hidden');
    }

    // ログイン処理
    async handleLogin(e) {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;

        try {
            console.log('ログイン試行:', email);
            const users = await this.getUsers();
            console.log('取得されたユーザー数:', users.length);
            
            const user = users.find(u => u.email === email && u.password_hash === password);
            
            if (user) {
                this.currentUser = user;
                localStorage.setItem('kyonomi_user', JSON.stringify(user));
                this.showMainApp();
                this.showSuccess('ログインしました');
            } else {
                this.showError('メールアドレスまたはパスワードが間違っています');
            }
        } catch (error) {
            console.error('ログインエラー:', error);
            this.showError(`ログインに失敗しました: ${error.message}`);
        }
    }

    // 新規登録処理
    async handleRegister(e) {
        e.preventDefault();
        const username = document.getElementById('registerUsername').value;
        const email = document.getElementById('registerEmail').value;
        const password = document.getElementById('registerPassword').value;
        const bio = document.getElementById('registerBio').value;

        try {
            console.log('新規登録試行:', email);
            
            // 既存ユーザーチェック
            const users = await this.getUsers();
            if (users.find(u => u.email === email)) {
                this.showError('このメールアドレスは既に登録されています');
                return;
            }

            // 新規ユーザー作成
            const newUser = {
                id: 'user_' + Date.now(),
                username,
                email,
                password_hash: password, // 本来はハッシュ化が必要
                bio,
                avatar_url: `https://via.placeholder.com/100x100?text=${encodeURIComponent(username.charAt(0))}`,
                phone: '',
                is_drinking_today: false,
                last_drinking_date: null,
                is_active: true
            };

            try {
                const response = await fetch('tables/users', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(newUser)
                });

                if (response.ok) {
                    const createdUser = await response.json();
                    this.currentUser = createdUser;
                } else {
                    throw new Error('API登録失敗');
                }
            } catch (apiError) {
                console.log('API登録失敗、ローカル保存を使用:', apiError);
                // フォールバック: ローカルストレージに保存
                const allUsers = this.getLocalUsers();
                allUsers.push(newUser);
                localStorage.setItem('kyonomi_all_users', JSON.stringify(allUsers));
                this.currentUser = newUser;
            }

            localStorage.setItem('kyonomi_user', JSON.stringify(this.currentUser));
            this.showMainApp();
            this.showSuccess('アカウントを作成しました');
        } catch (error) {
            console.error('登録エラー:', error);
            this.showError(`アカウント作成に失敗しました: ${error.message}`);
        }
    }

    // ログアウト処理
    handleLogout() {
        localStorage.removeItem('kyonomi_user');
        this.currentUser = null;
        this.showAuthSection();
        this.showSuccess('ログアウトしました');
    }

    // メインアプリ表示
    showMainApp() {
        document.getElementById('authSection').classList.add('hidden');
        document.getElementById('mainApp').classList.remove('hidden');
        document.getElementById('bottomNav').classList.remove('hidden');
        this.updateUserUI();
        this.loadHomeContent();
        this.loadNotifications();
    }

    // 認証セクション表示
    showAuthSection() {
        document.getElementById('authSection').classList.remove('hidden');
        document.getElementById('mainApp').classList.add('hidden');
        document.getElementById('bottomNav').classList.add('hidden');
    }

    // ユーザーUI更新
    updateUserUI() {
        if (!this.currentUser) return;

        document.getElementById('headerUsername').textContent = this.currentUser.username;
        document.getElementById('headerAvatar').src = this.currentUser.avatar_url;
        document.getElementById('profileUsername').textContent = this.currentUser.username;
        document.getElementById('profileAvatar').src = this.currentUser.avatar_url;
        document.getElementById('profileBio').textContent = this.currentUser.bio || '自己紹介が設定されていません';
        document.getElementById('drinkingSwitch').checked = this.currentUser.is_drinking_today;
    }

    // タブ切り替え
    switchTab(tabId) {
        // 全てのタブを非表示
        document.querySelectorAll('.tab-content').forEach(tab => tab.classList.add('hidden'));
        // 全てのナビボタンを非アクティブ
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.className = 'nav-btn flex-1 py-3 text-center text-gray-400 hover:text-purple-600';
        });

        // 選択されたタブを表示
        document.getElementById(tabId).classList.remove('hidden');
        // 対応するナビボタンをアクティブ
        const activeBtn = document.querySelector(`[data-tab="${tabId}"]`);
        if (activeBtn) {
            activeBtn.className = 'nav-btn flex-1 py-3 text-center text-purple-600 border-t-2 border-purple-500';
        }

        this.currentTab = tabId;

        // タブ固有の処理
        switch (tabId) {
            case 'homeTab':
                this.loadHomeContent();
                break;
            case 'followTab':
                this.loadFollowContent();
                break;
            case 'notificationTab':
                this.loadNotifications();
                break;
        }
    }

    // ホームコンテンツ読み込み
    async loadHomeContent() {
        if (!this.currentUser) return;

        const drinkingToggleSection = document.getElementById('drinkingToggleSection');
        const drinkingUsersSection = document.getElementById('drinkingUsersSection');
        const emptyDrinkingState = document.getElementById('emptyDrinkingState');

        if (this.currentUser.is_drinking_today) {
            drinkingToggleSection.classList.add('hidden');
            await this.loadDrinkingUsers();
        } else {
            drinkingToggleSection.classList.remove('hidden');
            drinkingUsersSection.classList.add('hidden');
            emptyDrinkingState.classList.add('hidden');
            
            const btn = document.getElementById('drinkingToggleBtn');
            btn.textContent = '今日飲み ON にする';
            btn.onclick = () => this.toggleDrinking();
        }
    }

    // 今日飲みユーザー読み込み
    async loadDrinkingUsers() {
        try {
            // 相互フォローで今日飲みONのユーザーを取得
            const mutualFollows = await this.getMutualFollows();
            const drinkingUsers = [];

            for (const follow of mutualFollows) {
                const user = await this.getUserById(follow.following_id === this.currentUser.id ? follow.follower_id : follow.following_id);
                if (user && user.is_drinking_today && user.last_drinking_date === new Date().toISOString().split('T')[0]) {
                    drinkingUsers.push(user);
                }
            }

            const drinkingUsersSection = document.getElementById('drinkingUsersSection');
            const drinkingUsersList = document.getElementById('drinkingUsersList');
            const emptyDrinkingState = document.getElementById('emptyDrinkingState');

            if (drinkingUsers.length > 0) {
                drinkingUsersSection.classList.remove('hidden');
                emptyDrinkingState.classList.add('hidden');
                drinkingUsersList.innerHTML = drinkingUsers.map(user => this.createUserCard(user)).join('');
            } else {
                drinkingUsersSection.classList.add('hidden');
                emptyDrinkingState.classList.remove('hidden');
            }
        } catch (error) {
            console.error('Error loading drinking users:', error);
        }
    }

    // ユーザーカード作成
    createUserCard(user) {
        return `
            <div class="bg-white rounded-lg shadow-md p-6 card-hover">
                <div class="flex items-center mb-4">
                    <img src="${user.avatar_url}" alt="${user.username}" class="w-16 h-16 rounded-full mr-4">
                    <div class="flex-1">
                        <h3 class="font-semibold text-lg">${user.username}</h3>
                        <p class="text-gray-600 text-sm">${user.bio || '自己紹介なし'}</p>
                    </div>
                </div>
                <div class="flex items-center justify-between">
                    <div class="flex items-center text-green-600">
                        <i class="fas fa-wine-glass mr-2"></i>
                        <span class="text-sm font-medium">今日飲みOK</span>
                    </div>
                    <button onclick="app.sendLike('${user.id}')" class="gradient-bg text-white px-4 py-2 rounded-full hover:opacity-90 transition-opacity">
                        <i class="fas fa-heart mr-1"></i>いいね
                    </button>
                </div>
            </div>
        `;
    }

    // 今日飲みトグル
    async toggleDrinking(forced = null) {
        if (!this.currentUser) return;

        const newStatus = forced !== null ? forced : !this.currentUser.is_drinking_today;
        const today = new Date().toISOString().split('T')[0];

        this.currentUser.is_drinking_today = newStatus;
        this.currentUser.last_drinking_date = newStatus ? today : null;

        try {
            await this.updateCurrentUser();
            this.updateUserUI();
            this.loadHomeContent();
            
            if (newStatus) {
                this.showSuccess('今日飲みをONにしました！');
            } else {
                this.showSuccess('今日飲みをOFFにしました');
            }
        } catch (error) {
            this.showError('設定の更新に失敗しました');
        }
    }

    // いいね送信
    async sendLike(targetUserId) {
        if (!this.currentUser) return;

        try {
            const today = new Date().toISOString().split('T')[0];
            
            // 既存のいいねをチェック
            const existingLike = await this.getLike(this.currentUser.id, targetUserId, today);
            if (existingLike) {
                this.showError('今日はもうこのユーザーにいいねを送っています');
                return;
            }

            // いいね作成
            const newLike = {
                liker_id: this.currentUser.id,
                liked_id: targetUserId,
                date: today,
                is_active: true,
                matched: false
            };

            const response = await fetch('tables/likes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newLike)
            });

            if (response.ok) {
                // 相互いいねチェック
                const reciprocalLike = await this.getLike(targetUserId, this.currentUser.id, today);
                if (reciprocalLike) {
                    // マッチ成立
                    await this.createMatch(this.currentUser.id, targetUserId);
                    this.showContactModal(targetUserId);
                } else {
                    this.showSuccess('いいねを送りました！');
                }

                // 通知作成
                await this.createNotification(targetUserId, 'like_received', this.currentUser.id, `${this.currentUser.username}さんからいいねが届きました`);
                this.loadHomeContent();
            }
        } catch (error) {
            this.showError('いいねの送信に失敗しました');
        }
    }

    // マッチ作成
    async createMatch(userId1, userId2) {
        try {
            // 両方のいいねをマッチ済みに更新
            const today = new Date().toISOString().split('T')[0];
            const like1 = await this.getLike(userId1, userId2, today);
            const like2 = await this.getLike(userId2, userId1, today);

            if (like1) {
                await fetch(`tables/likes/${like1.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ matched: true })
                });
            }
            if (like2) {
                await fetch(`tables/likes/${like2.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ matched: true })
                });
            }

            // マッチ通知作成
            const user1 = await this.getUserById(userId1);
            const user2 = await this.getUserById(userId2);
            
            await this.createNotification(userId1, 'match_made', userId2, `${user2.username}さんとマッチしました！`);
            await this.createNotification(userId2, 'match_made', userId1, `${user1.username}さんとマッチしました！`);
        } catch (error) {
            console.error('Error creating match:', error);
        }
    }

    // 連絡先交換モーダル表示
    async showContactModal(userId) {
        try {
            const user = await this.getUserById(userId);
            const contactInfo = document.getElementById('contactInfo');
            
            contactInfo.innerHTML = `
                <div class="text-center mb-4">
                    <img src="${user.avatar_url}" alt="${user.username}" class="w-16 h-16 rounded-full mx-auto mb-2">
                    <h4 class="font-semibold">${user.username}</h4>
                </div>
                <div class="space-y-2">
                    <div class="flex items-center">
                        <i class="fas fa-envelope mr-3 text-gray-500"></i>
                        <span>${user.email}</span>
                    </div>
                    ${user.phone ? `
                        <div class="flex items-center">
                            <i class="fas fa-phone mr-3 text-gray-500"></i>
                            <span>${user.phone}</span>
                        </div>
                    ` : ''}
                </div>
            `;

            document.getElementById('contactModal').classList.remove('hidden');
        } catch (error) {
            this.showError('ユーザー情報の取得に失敗しました');
        }
    }

    // 連絡先交換モーダル非表示
    hideContactModal() {
        document.getElementById('contactModal').classList.add('hidden');
    }

    // プロフィール編集モーダル表示
    showEditProfileModal() {
        if (!this.currentUser) return;

        document.getElementById('editUsername').value = this.currentUser.username;
        document.getElementById('editBio').value = this.currentUser.bio || '';
        document.getElementById('editPhone').value = this.currentUser.phone || '';
        document.getElementById('editProfileModal').classList.remove('hidden');
    }

    // プロフィール編集モーダル非表示
    hideEditProfileModal() {
        document.getElementById('editProfileModal').classList.add('hidden');
    }

    // プロフィール編集処理
    async handleEditProfile(e) {
        e.preventDefault();
        if (!this.currentUser) return;

        const username = document.getElementById('editUsername').value;
        const bio = document.getElementById('editBio').value;
        const phone = document.getElementById('editPhone').value;

        try {
            this.currentUser.username = username;
            this.currentUser.bio = bio;
            this.currentUser.phone = phone;

            await this.updateCurrentUser();
            this.updateUserUI();
            this.hideEditProfileModal();
            this.showSuccess('プロフィールを更新しました');
        } catch (error) {
            this.showError('プロフィールの更新に失敗しました');
        }
    }

    // フォローコンテンツ読み込み
    async loadFollowContent() {
        this.showFollowSection('followers');
    }

    // フォローセクション表示
    async showFollowSection(section) {
        // タブボタンの状態更新
        document.querySelectorAll('#followTab .flex button').forEach(btn => {
            btn.className = 'flex-1 py-2 px-4 text-center font-medium text-gray-600 hover:text-purple-600';
        });
        
        const activeBtn = {
            'followers': 'followersTabBtn',
            'following': 'followingTabBtn',
            'pending': 'pendingTabBtn'
        }[section];
        
        document.getElementById(activeBtn).className = 'flex-1 py-2 px-4 text-center font-medium border-b-2 border-purple-500 text-purple-600';

        // セクションの表示/非表示
        document.getElementById('followersSection').classList.add('hidden');
        document.getElementById('followingSection').classList.add('hidden');
        document.getElementById('pendingSection').classList.add('hidden');
        document.getElementById('searchResults').classList.add('hidden');

        document.getElementById(`${section}Section`).classList.remove('hidden');

        // データ読み込み
        switch (section) {
            case 'followers':
                await this.loadFollowers();
                break;
            case 'following':
                await this.loadFollowing();
                break;
            case 'pending':
                await this.loadPendingRequests();
                break;
        }
    }

    // フォロワー読み込み
    async loadFollowers() {
        try {
            const follows = await this.getFollowsByUserId(this.currentUser.id, 'following');
            const followers = [];

            for (const follow of follows) {
                if (follow.status === 'accepted') {
                    const user = await this.getUserById(follow.follower_id);
                    if (user) followers.push(user);
                }
            }

            const followersList = document.getElementById('followersList');
            followersList.innerHTML = followers.length > 0 
                ? followers.map(user => this.createFollowUserCard(user, 'follower')).join('')
                : '<div class="text-center py-8 text-gray-500">フォロワーはいません</div>';
        } catch (error) {
            console.error('Error loading followers:', error);
        }
    }

    // フォロー中読み込み
    async loadFollowing() {
        try {
            const follows = await this.getFollowsByUserId(this.currentUser.id, 'follower');
            const following = [];

            for (const follow of follows) {
                if (follow.status === 'accepted') {
                    const user = await this.getUserById(follow.following_id);
                    if (user) following.push(user);
                }
            }

            const followingList = document.getElementById('followingList');
            followingList.innerHTML = following.length > 0 
                ? following.map(user => this.createFollowUserCard(user, 'following')).join('')
                : '<div class="text-center py-8 text-gray-500">フォローしているユーザーはいません</div>';
        } catch (error) {
            console.error('Error loading following:', error);
        }
    }

    // 申請中読み込み
    async loadPendingRequests() {
        try {
            const pendingFollows = await this.getPendingFollowRequests();
            const pendingUsers = [];

            for (const follow of pendingFollows) {
                const user = await this.getUserById(follow.follower_id);
                if (user) pendingUsers.push({ user, follow });
            }

            const pendingList = document.getElementById('pendingList');
            pendingList.innerHTML = pendingUsers.length > 0 
                ? pendingUsers.map(({ user, follow }) => this.createPendingRequestCard(user, follow)).join('')
                : '<div class="text-center py-8 text-gray-500">フォロー申請はありません</div>';
        } catch (error) {
            console.error('Error loading pending requests:', error);
        }
    }

    // フォローユーザーカード作成
    createFollowUserCard(user, type) {
        return `
            <div class="bg-white rounded-lg shadow-md p-4 flex items-center justify-between">
                <div class="flex items-center">
                    <img src="${user.avatar_url}" alt="${user.username}" class="w-12 h-12 rounded-full mr-3">
                    <div>
                        <h3 class="font-semibold">${user.username}</h3>
                        <p class="text-gray-600 text-sm">${user.bio || '自己紹介なし'}</p>
                    </div>
                </div>
                ${type === 'following' ? `
                    <button onclick="app.unfollowUser('${user.id}')" class="bg-red-100 text-red-700 px-3 py-1 rounded-md hover:bg-red-200 text-sm">
                        フォロー解除
                    </button>
                ` : ''}
            </div>
        `;
    }

    // 申請中カード作成
    createPendingRequestCard(user, follow) {
        return `
            <div class="bg-white rounded-lg shadow-md p-4 flex items-center justify-between">
                <div class="flex items-center">
                    <img src="${user.avatar_url}" alt="${user.username}" class="w-12 h-12 rounded-full mr-3">
                    <div>
                        <h3 class="font-semibold">${user.username}</h3>
                        <p class="text-gray-600 text-sm">${user.bio || '自己紹介なし'}</p>
                    </div>
                </div>
                <div class="flex space-x-2">
                    <button onclick="app.respondToFollowRequest('${follow.id}', 'accepted')" class="bg-green-100 text-green-700 px-3 py-1 rounded-md hover:bg-green-200 text-sm">
                        承認
                    </button>
                    <button onclick="app.respondToFollowRequest('${follow.id}', 'rejected')" class="bg-red-100 text-red-700 px-3 py-1 rounded-md hover:bg-red-200 text-sm">
                        拒否
                    </button>
                </div>
            </div>
        `;
    }

    // ユーザー検索
    async searchUsers() {
        const query = document.getElementById('userSearchInput').value.trim();
        if (!query) return;

        try {
            const users = await this.searchUsersByName(query);
            const filteredUsers = users.filter(user => user.id !== this.currentUser.id);

            const searchResults = document.getElementById('searchResults');
            const searchResultsList = document.getElementById('searchResultsList');

            if (filteredUsers.length > 0) {
                searchResults.classList.remove('hidden');
                searchResultsList.innerHTML = filteredUsers.map(user => this.createSearchResultCard(user)).join('');
            } else {
                searchResults.classList.remove('hidden');
                searchResultsList.innerHTML = '<div class="text-center py-8 text-gray-500">ユーザーが見つかりませんでした</div>';
            }
        } catch (error) {
            this.showError('検索に失敗しました');
        }
    }

    // 検索結果カード作成
    createSearchResultCard(user) {
        return `
            <div class="bg-white rounded-lg shadow-md p-4 flex items-center justify-between">
                <div class="flex items-center">
                    <img src="${user.avatar_url}" alt="${user.username}" class="w-12 h-12 rounded-full mr-3">
                    <div>
                        <h3 class="font-semibold">${user.username}</h3>
                        <p class="text-gray-600 text-sm">${user.bio || '自己紹介なし'}</p>
                    </div>
                </div>
                <button onclick="app.sendFollowRequest('${user.id}')" class="gradient-bg text-white px-3 py-1 rounded-md hover:opacity-90 text-sm">
                    フォロー
                </button>
            </div>
        `;
    }

    // フォロー申請送信
    async sendFollowRequest(targetUserId) {
        try {
            // 既存のフォロー関係をチェック
            const existingFollow = await this.getFollow(this.currentUser.id, targetUserId);
            if (existingFollow) {
                this.showError('既にフォロー済みまたは申請済みです');
                return;
            }

            const newFollow = {
                follower_id: this.currentUser.id,
                following_id: targetUserId,
                status: 'pending',
                requested_at: new Date().toISOString()
            };

            const response = await fetch('tables/follows', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newFollow)
            });

            if (response.ok) {
                await this.createNotification(targetUserId, 'follow_request', this.currentUser.id, `${this.currentUser.username}さんからフォロー申請が届きました`);
                this.showSuccess('フォロー申請を送信しました');
            }
        } catch (error) {
            this.showError('フォロー申請の送信に失敗しました');
        }
    }

    // フォロー申請への応答
    async respondToFollowRequest(followId, response) {
        try {
            const updateData = {
                status: response,
                responded_at: new Date().toISOString()
            };

            const result = await fetch(`tables/follows/${followId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updateData)
            });

            if (result.ok) {
                // 承認通知
                if (response === 'accepted') {
                    const follow = await this.getFollowById(followId);
                    await this.createNotification(follow.follower_id, 'follow_accepted', this.currentUser.id, `${this.currentUser.username}さんがフォロー申請を承認しました`);
                }

                this.showSuccess(response === 'accepted' ? 'フォロー申請を承認しました' : 'フォロー申請を拒否しました');
                this.loadPendingRequests();
            }
        } catch (error) {
            this.showError('応答の処理に失敗しました');
        }
    }

    // フォロー解除
    async unfollowUser(userId) {
        try {
            const follow = await this.getFollow(this.currentUser.id, userId);
            if (follow) {
                await fetch(`tables/follows/${follow.id}`, { method: 'DELETE' });
                this.showSuccess('フォローを解除しました');
                this.loadFollowing();
            }
        } catch (error) {
            this.showError('フォロー解除に失敗しました');
        }
    }

    // 通知読み込み
    async loadNotifications() {
        try {
            const notifications = await this.getNotificationsByUserId(this.currentUser.id);
            const notificationsList = document.getElementById('notificationsList');
            const emptyNotifications = document.getElementById('emptyNotifications');

            if (notifications.length > 0) {
                notificationsList.classList.remove('hidden');
                emptyNotifications.classList.add('hidden');
                notificationsList.innerHTML = notifications.map(n => this.createNotificationCard(n)).join('');
                
                // 未読通知をマーク
                const unreadCount = notifications.filter(n => !n.is_read).length;
                this.updateNotificationBadge(unreadCount);
            } else {
                notificationsList.classList.add('hidden');
                emptyNotifications.classList.remove('hidden');
                this.updateNotificationBadge(0);
            }
        } catch (error) {
            console.error('Error loading notifications:', error);
        }
    }

    // 通知カード作成
    createNotificationCard(notification) {
        const icons = {
            'follow_request': 'fas fa-user-plus',
            'follow_accepted': 'fas fa-check-circle',
            'like_received': 'fas fa-heart',
            'match_made': 'fas fa-heart text-red-500'
        };

        return `
            <div class="bg-white rounded-lg shadow-md p-4 ${!notification.is_read ? 'border-l-4 border-purple-500' : ''}">
                <div class="flex items-center">
                    <i class="${icons[notification.type] || 'fas fa-bell'} text-lg mr-3 text-purple-600"></i>
                    <div class="flex-1">
                        <p class="text-gray-800 ${!notification.is_read ? 'font-semibold' : ''}">${notification.message}</p>
                        <p class="text-gray-500 text-sm mt-1">${this.formatDate(notification.created_at)}</p>
                    </div>
                    ${!notification.is_read ? '<div class="w-2 h-2 bg-purple-500 rounded-full"></div>' : ''}
                </div>
            </div>
        `;
    }

    // 通知バッジ更新
    updateNotificationBadge(count) {
        const badge = document.getElementById('notificationBadge');
        if (count > 0) {
            badge.textContent = count > 99 ? '99+' : count;
            badge.classList.remove('hidden');
        } else {
            badge.classList.add('hidden');
        }
    }

    // API関数群
    async getUsers() {
        try {
            console.log('ユーザー取得を試行中...');
            const response = await fetch('tables/users');
            console.log('レスポンス状態:', response.status, response.statusText);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            console.log('取得データ:', data);
            return data.data || [];
        } catch (error) {
            console.error('getUsers エラー:', error);
            
            // フォールバック: ローカルストレージから既存ユーザーを取得
            const localUsers = this.getLocalUsers();
            if (localUsers.length > 0) {
                console.log('ローカルユーザーを使用:', localUsers.length, '人');
                return localUsers;
            }
            
            throw error;
        }
    }

    // ローカルストレージからユーザー一覧を取得（フォールバック）
    getLocalUsers() {
        const users = localStorage.getItem('kyonomi_all_users');
        if (users) {
            return JSON.parse(users);
        }
        
        // デフォルトのテストユーザー
        const defaultUsers = [
            {
                id: 'user1',
                username: '田中太郎',
                email: 'tanaka@example.com',
                password_hash: 'password123',
                avatar_url: 'https://via.placeholder.com/100x100?text=田',
                bio: 'よろしくお願いします！お酒好きです🍻',
                phone: '090-1234-5678',
                is_drinking_today: false,
                last_drinking_date: null,
                is_active: true
            },
            {
                id: 'user2',
                username: '佐藤花子',
                email: 'sato@example.com',
                password_hash: 'password123',
                avatar_url: 'https://via.placeholder.com/100x100?text=佐',
                bio: '楽しく飲める仲間を探してます♪',
                phone: '080-9876-5432',
                is_drinking_today: true,
                last_drinking_date: '2025-08-28',
                is_active: true
            },
            {
                id: 'user3',
                username: '山田次郎',
                email: 'yamada@example.com',
                password_hash: 'password123',
                avatar_url: 'https://via.placeholder.com/100x100?text=山',
                bio: '新しい出会いを求めています',
                phone: '',
                is_drinking_today: true,
                last_drinking_date: '2025-08-28',
                is_active: true
            },
            {
                id: 'user4',
                username: '鈴木美咲',
                email: 'suzuki@example.com',
                password_hash: 'password123',
                avatar_url: 'https://via.placeholder.com/100x100?text=鈴',
                bio: 'カジュアルに飲める人募集中です',
                phone: '070-5555-1111',
                is_drinking_today: false,
                last_drinking_date: null,
                is_active: true
            }
        ];
        
        localStorage.setItem('kyonomi_all_users', JSON.stringify(defaultUsers));
        return defaultUsers;
    }

    async getUserById(id) {
        try {
            const response = await fetch(`tables/users/${id}`);
            return response.ok ? await response.json() : null;
        } catch (error) {
            return null;
        }
    }

    async updateCurrentUser() {
        try {
            const response = await fetch(`tables/users/${this.currentUser.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(this.currentUser)
            });
            
            if (response.ok) {
                const updatedUser = await response.json();
                this.currentUser = updatedUser;
                localStorage.setItem('kyonomi_user', JSON.stringify(updatedUser));
            } else {
                throw new Error('API更新失敗');
            }
        } catch (apiError) {
            console.log('API更新失敗、ローカル更新を使用:', apiError);
            // フォールバック: ローカルストレージを更新
            const allUsers = this.getLocalUsers();
            const userIndex = allUsers.findIndex(u => u.id === this.currentUser.id);
            if (userIndex !== -1) {
                allUsers[userIndex] = this.currentUser;
                localStorage.setItem('kyonomi_all_users', JSON.stringify(allUsers));
            }
            localStorage.setItem('kyonomi_user', JSON.stringify(this.currentUser));
        }
    }

    async searchUsersByName(query) {
        const response = await fetch(`tables/users?search=${encodeURIComponent(query)}`);
        const data = await response.json();
        return data.data || [];
    }

    async getFollowsByUserId(userId, type) {
        const response = await fetch(`tables/follows`);
        const data = await response.json();
        const follows = data.data || [];
        
        return follows.filter(follow => 
            type === 'follower' ? follow.follower_id === userId : follow.following_id === userId
        );
    }

    async getMutualFollows() {
        const following = await this.getFollowsByUserId(this.currentUser.id, 'follower');
        const followers = await this.getFollowsByUserId(this.currentUser.id, 'following');
        
        return following.filter(f1 => 
            f1.status === 'accepted' && 
            followers.some(f2 => f2.status === 'accepted' && f2.follower_id === f1.following_id)
        );
    }

    async getFollow(followerId, followingId) {
        const response = await fetch(`tables/follows`);
        const data = await response.json();
        const follows = data.data || [];
        
        return follows.find(f => f.follower_id === followerId && f.following_id === followingId);
    }

    async getFollowById(followId) {
        try {
            const response = await fetch(`tables/follows/${followId}`);
            return response.ok ? await response.json() : null;
        } catch (error) {
            return null;
        }
    }

    async getPendingFollowRequests() {
        const response = await fetch(`tables/follows`);
        const data = await response.json();
        const follows = data.data || [];
        
        return follows.filter(f => f.following_id === this.currentUser.id && f.status === 'pending');
    }

    async getLike(likerId, likedId, date) {
        const response = await fetch(`tables/likes`);
        const data = await response.json();
        const likes = data.data || [];
        
        return likes.find(like => 
            like.liker_id === likerId && 
            like.liked_id === likedId && 
            like.date === date && 
            like.is_active
        );
    }

    async createNotification(userId, type, fromUserId, message) {
        const notification = {
            user_id: userId,
            type,
            from_user_id: fromUserId,
            message,
            is_read: false,
            created_at: new Date().toISOString()
        };

        await fetch('tables/notifications', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(notification)
        });
    }

    async getNotificationsByUserId(userId) {
        const response = await fetch(`tables/notifications`);
        const data = await response.json();
        const notifications = data.data || [];
        
        return notifications
            .filter(n => n.user_id === userId)
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }

    // ユーティリティ関数
    formatDate(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diff = now - date;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return 'たった今';
        if (minutes < 60) return `${minutes}分前`;
        if (hours < 24) return `${hours}時間前`;
        if (days < 7) return `${days}日前`;
        
        return date.toLocaleDateString('ja-JP');
    }

    showSuccess(message) {
        this.showToast(message, 'success');
    }

    showError(message) {
        this.showToast(message, 'error');
    }

    showToast(message, type) {
        const toast = document.createElement('div');
        toast.className = `fixed top-4 right-4 px-6 py-3 rounded-lg text-white z-50 ${
            type === 'success' ? 'bg-green-500' : 'bg-red-500'
        }`;
        toast.textContent = message;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.remove();
        }, 3000);
    }
}

// アプリケーション初期化
const app = new KyonomiApp();