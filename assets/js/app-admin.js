// app-admin.js — DuoClone methods split out of the former monolithic app.js.
// Attaches to DuoClone.prototype (defined in app.js). Load AFTER app.js and BEFORE
// app-main.js (which instantiates the app). Pure mechanical split - no behavior change.
Object.assign(DuoClone.prototype, {
    // Shown when the user lands here from a password-recovery email - they already have
    // a temporary session, so updatePassword() works directly; afterwards continue into
    // the app like a normal login.
    renderPasswordResetScreen() {
        this.state.passwordRecoveryPending = true;
        this.ui.container.innerHTML = `
            <div class="welcome-screen">
                <div class="duo-character">🔑</div>
                <h1 style="text-align: center;">Đặt lại mật khẩu</h1>
                <p style="text-align: center; color: #777;">Nhập mật khẩu mới cho tài khoản của bạn.</p>
                <div class="auth-box" style="display: flex; flex-direction: column; gap: 15px; margin: 30px auto; width: 80%; max-width: 300px;">
                    <div class="password-field-wrap">
                        <input type="password" id="recovery-password-input" placeholder="Mật khẩu mới (ít nhất 6 ký tự)..." class="input-field" style="width:100%; padding: 15px 44px 15px 15px; border: 2px solid #e5e5e5; border-radius: 12px; text-align: center;">
                        <button type="button" class="password-eye-btn" id="recovery-eye-btn" title="Hiện/ẩn mật khẩu">👁️</button>
                    </div>
                    <input type="password" id="recovery-password-confirm" placeholder="Nhập lại mật khẩu mới..." class="input-field" style="padding: 15px; border: 2px solid #e5e5e5; border-radius: 12px; text-align: center;">
                    <p id="recovery-error" style="color: var(--duo-red); text-align: center; font-size: 14px; min-height: 18px; margin: 0;"></p>
                    <button id="recovery-submit-btn" class="btn-primary" style="padding: 15px; background-color: #58cc02; color: white; border: none; border-radius: 12px; font-weight: 800; cursor: pointer;">LƯU MẬT KHẨU MỚI</button>
                </div>
            </div>
        `;
        this.ui.checkBtn.disabled = true;
        this.ui.checkBtn.classList.remove('active');
        if (this.ui.skipBtn) this.ui.skipBtn.style.display = 'none';

        this.bindPasswordEyeToggle('recovery-eye-btn', 'recovery-password-input');
        document.getElementById('recovery-submit-btn').addEventListener('click', async () => {
            const errorEl = document.getElementById('recovery-error');
            const pw = document.getElementById('recovery-password-input').value;
            const confirmPw = document.getElementById('recovery-password-confirm').value;
            if (pw.length < 6) { errorEl.innerText = 'Mật khẩu mới phải có ít nhất 6 ký tự.'; return; }
            if (pw !== confirmPw) { errorEl.innerText = 'Hai mật khẩu không khớp nhau.'; return; }
            errorEl.style.color = 'var(--duo-dark-grey)';
            errorEl.innerText = 'Đang cập nhật...';
            const result = await window.AuthService.updatePassword(pw);
            if (result.error) {
                errorEl.style.color = 'var(--duo-red)';
                errorEl.innerText = `Không đặt lại được mật khẩu: ${result.error}`;
                return;
            }
            this.state.passwordRecoveryPending = false;
            alert('Đặt lại mật khẩu thành công! Bạn sẽ được đăng nhập ngay bây giờ.');
            const session = await window.AuthService.getSession();
            if (session && session.user) {
                await this.completeLogin(session.user);
            } else {
                location.reload();
            }
        });
    },

    // Shared by the login screen and the recovery screen - flips one password input
    // between type=password/text so users can see what they typed.
    bindPasswordEyeToggle(btnId, inputId) {
        const btn = document.getElementById(btnId);
        const input = document.getElementById(inputId);
        if (!btn || !input) return;
        btn.addEventListener('click', () => {
            const show = input.type === 'password';
            input.type = show ? 'text' : 'password';
            btn.textContent = show ? '🙈' : '👁️';
        });
    },

    renderAuthScreen() {
        this.ui.container.innerHTML = `
            <div id="auth-screen" class="welcome-screen">
                <div class="brand-banner">
                    <div class="brand-mascot">${getMascotSvg('happy', 118)}</div>
                    <h1 class="brand-wordmark"><span class="brand-khoai">Khoai</span><span class="brand-bon">Bon</span><span class="brand-lingo">lingo</span></h1>
                    <p class="brand-tagline">Học tiếng Anh vui - Lớn khôn mỗi ngày</p>
                </div>
                <h1 id="auth-title" style="text-align: center;">Đăng nhập</h1>
                <div class="auth-box" style="display: flex; flex-direction: column; gap: 15px; margin: 30px auto; width: 80%; max-width: 300px;">
                    <input type="text" id="username-input" placeholder="Tên hiển thị..." class="input-field" style="display: none; padding: 15px; border: 2px solid #e5e5e5; border-radius: 12px; text-align: center;">
                    <input type="email" id="email-input" placeholder="Email..." class="input-field" style="padding: 15px; border: 2px solid #e5e5e5; border-radius: 12px; text-align: center;">
                    <div class="password-field-wrap">
                        <input type="password" id="password-input" placeholder="Mật khẩu (ít nhất 6 ký tự)..." class="input-field" style="width:100%; padding: 15px 44px 15px 15px; border: 2px solid #e5e5e5; border-radius: 12px; text-align: center;">
                        <button type="button" class="password-eye-btn" id="password-eye-btn" title="Hiện/ẩn mật khẩu">👁️</button>
                    </div>
                    <p id="auth-error" style="color: var(--duo-red); text-align: center; font-size: 14px; min-height: 18px; margin: 0;"></p>
                    <button id="login-btn" class="btn-primary" style="padding: 15px; background-color: #58cc02; color: white; border: none; border-radius: 12px; font-weight: 800; cursor: pointer;">ĐĂNG NHẬP</button>
                    <button id="auth-toggle-btn" style="padding: 12px; border-radius: 12px; font-weight: 700; cursor: pointer; background: white; border: 2px solid #e5e5e5; color: #777;">Chưa có tài khoản? Đăng ký</button>
                    <button id="forgot-password-btn" style="padding: 6px; border: none; background: none; color: #1cb0f6; font-weight: 700; cursor: pointer; font-size: 14px;">Quên mật khẩu?</button>
                </div>
            </div>
        `;
        this.ui.usernameInput = document.getElementById('username-input');
        this.ui.emailInput = document.getElementById('email-input');
        this.ui.passwordInput = document.getElementById('password-input');
        this.ui.loginBtn = document.getElementById('login-btn');

        this.applyAuthMode();
        this.ui.loginBtn.onclick = () => this.handleAuthSubmit();
        document.getElementById('auth-toggle-btn').addEventListener('click', () => {
            this.authMode = this.authMode === 'signin' ? 'signup' : 'signin';
            this.applyAuthMode();
        });
        this.bindPasswordEyeToggle('password-eye-btn', 'password-input');
        document.getElementById('forgot-password-btn').addEventListener('click', () => this.handleForgotPassword());

        this.ui.checkBtn.disabled = true;
        this.ui.checkBtn.classList.remove('active');
    },

    applyAuthMode() {
        const isSignup = this.authMode === 'signup';
        document.getElementById('auth-title').innerText = isSignup ? 'Đăng ký' : 'Đăng nhập';
        this.ui.usernameInput.style.display = isSignup ? 'block' : 'none';
        this.ui.loginBtn.innerText = isSignup ? 'ĐĂNG KÝ' : 'ĐĂNG NHẬP';
        document.getElementById('auth-toggle-btn').innerText = isSignup ? 'Đã có tài khoản? Đăng nhập' : 'Chưa có tài khoản? Đăng ký';
        const errorEl = document.getElementById('auth-error');
        errorEl.innerText = '';
        errorEl.style.color = 'var(--duo-red)';
    },

    // Reuses whatever the user already typed in the email box (asking again would be
    // pointless friction) - only errors if it's empty. Success/failure is reported in
    // the same inline auth-error element the login flow already uses.
    async handleForgotPassword() {
        const errorEl = document.getElementById('auth-error');
        const email = this.ui.emailInput.value.trim();
        errorEl.style.color = 'var(--duo-red)';
        if (!email) {
            errorEl.innerText = 'Nhập email của bạn vào ô Email phía trên rồi bấm "Quên mật khẩu?" nhé.';
            return;
        }
        if (!window.AuthService || !window.AuthService.isConfigured) {
            errorEl.innerText = 'Hệ thống đăng nhập chưa được cấu hình.';
            return;
        }
        errorEl.style.color = 'var(--duo-dark-grey)';
        errorEl.innerText = 'Đang gửi email đặt lại mật khẩu...';
        const result = await window.AuthService.requestPasswordReset(email);
        if (result.error) {
            errorEl.style.color = 'var(--duo-red)';
            errorEl.innerText = `Không gửi được email: ${result.error}`;
            return;
        }
        errorEl.style.color = 'var(--duo-green)';
        errorEl.innerText = `Đã gửi! Kiểm tra hộp thư ${email} và bấm vào link để đặt lại mật khẩu.`;
    },

    async handleAuthSubmit() {
        const email = this.ui.emailInput.value.trim();
        const password = this.ui.passwordInput.value;
        const errorEl = document.getElementById('auth-error');
        errorEl.innerText = '';

        if (!email || !password) {
            errorEl.innerText = 'Vui lòng nhập đầy đủ email và mật khẩu.';
            return;
        }
        if (!window.AuthService || !window.AuthService.isConfigured) {
            errorEl.innerText = 'Hệ thống đăng nhập chưa được cấu hình.';
            return;
        }

        this.ui.loginBtn.disabled = true;

        if (this.authMode === 'signup') {
            const username = this.ui.usernameInput.value.trim();
            if (!username) {
                errorEl.innerText = 'Vui lòng nhập tên hiển thị.';
                this.ui.loginBtn.disabled = false;
                return;
            }
            const result = await window.AuthService.signUp(email, password, username);
            this.ui.loginBtn.disabled = false;
            if (result.error) {
                errorEl.innerText = result.error;
                return;
            }
            if (result.pendingConfirmation) {
                errorEl.style.color = 'var(--duo-green)';
                errorEl.innerText = 'Đăng ký thành công! Vui lòng kiểm tra email để xác nhận, sau đó đăng nhập.';
                this.authMode = 'signin';
                this.applyAuthMode();
                return;
            }
            await this.completeLogin(result.user, username, true);
        } else {
            const result = await window.AuthService.signIn(email, password);
            this.ui.loginBtn.disabled = false;
            if (result.error) {
                errorEl.innerText = result.error;
                return;
            }
            await this.completeLogin(result.user);
        }
    },

    updateAvatarDisplay() {
        if (!this.ui.userBadgeAvatar) return;
        this.ui.userBadgeAvatar.innerHTML = this.state.avatarUrl
            ? `<img src="${this.state.avatarUrl}" alt="avatar">`
            : '🙂';
        this.updateRankBadge();
    },

    renderAccountSettings() {
        if (!this.state.currentUser) {
            alert("Vui lòng đăng nhập trước khi vào cài đặt tài khoản!");
            return;
        }
        const avatarPreviewHtml = this.state.avatarUrl
            ? `<img src="${this.state.avatarUrl}" alt="avatar">`
            : '🙂';

        const badges = this.badgeTracker
            ? this.badgeTracker.getAllBadgesWithStatus()
            : BADGE_DEFINITIONS.map(b => ({ ...b, earned: false }));
        const earnedBadges = badges.filter(b => b.earned);
        const badgePreviewHtml = earnedBadges.length
            ? earnedBadges.slice(0, 6).map(b => `<span class="settings-badge-chip" title="${this.escapeHtml(b.name)}">${b.icon}</span>`).join('')
            : `<p class="settings-empty-note">Chưa có huy hiệu nào - hoàn thành bài học để mở khóa nhé!</p>`;

        const certificates = this.state.stats.certificates || [];
        const certPreview = certificates.length
            ? `<p class="settings-summary-line">Gần nhất: <strong>${certificates[certificates.length - 1].score}% — ${this.escapeHtml(certificates[certificates.length - 1].level)}</strong></p>`
            : `<p class="settings-empty-note">Chưa có chứng chỉ nào - vượt qua bài kiểm tra đánh giá (≥70%) để nhận chứng chỉ đầu tiên!</p>`;

        const rankInfo = getRankInfo(this.state.xp);
        const nextTier = RANK_TIERS[Math.min(RANK_TIERS.length - 1, rankInfo.rankIndex + 1)];
        const isMaxRank = rankInfo.rankIndex === RANK_TIERS.length - 1;
        const levelProgressPct = Math.round((rankInfo.xpIntoLevel / rankInfo.xpForNextLevel) * 100);

        this.ui.container.innerHTML = `
            <div class="welcome-screen settings-screen">
                <h1 style="text-align:center;">Cài đặt tài khoản</h1>

                <div class="settings-card">
                    <h2>Ảnh đại diện</h2>
                    <div class="settings-avatar-row">
                        <div class="settings-avatar-preview" id="settings-avatar-preview">${avatarPreviewHtml}</div>
                        <div>
                            <input type="file" id="avatar-file-input" accept="image/png,image/jpeg,image/webp" style="display:none;">
                            <button class="btn-secondary" id="avatar-upload-btn" style="padding:10px 18px;">Đổi ảnh đại diện</button>
                            <p id="avatar-upload-status" class="settings-status"></p>
                        </div>
                    </div>
                </div>

                <div class="settings-card">
                    <h2>${rankInfo.rankIcon} Danh hiệu: ${this.escapeHtml(rankInfo.rankName)}</h2>
                    <p class="settings-summary-line">Cấp ${rankInfo.level} (bậc ${rankInfo.levelInRank}/${LEVELS_PER_RANK} trong danh hiệu này) · Tổng ${this.state.xp} XP</p>
                    <div class="rank-progress-track"><div class="rank-progress-fill" style="width:${levelProgressPct}%;"></div></div>
                    <p class="settings-empty-note">${rankInfo.xpIntoLevel}/${rankInfo.xpForNextLevel} XP đến Cấp ${rankInfo.level + 1}${isMaxRank ? '' : ` · Đạt danh hiệu ${nextTier.icon} ${this.escapeHtml(nextTier.name)} ở Cấp ${(rankInfo.rankIndex + 1) * LEVELS_PER_RANK + 1}`}</p>
                </div>

                <div class="settings-card">
                    <h2>🏅 Thành tích của tôi</h2>
                    <p class="settings-summary-line">${earnedBadges.length}/${badges.length} huy hiệu đã đạt được</p>
                    <div class="settings-badge-row">${badgePreviewHtml}</div>
                    <button class="btn-secondary settings-link-btn" id="settings-view-achievements">Xem tất cả thành tích</button>
                </div>

                <div class="settings-card">
                    <h2>🎖️ Chứng chỉ của tôi</h2>
                    <p class="settings-summary-line">${certificates.length} chứng chỉ đã đạt được</p>
                    ${certPreview}
                    <button class="btn-secondary settings-link-btn" id="settings-view-certificates">Xem chứng chỉ</button>
                </div>

                <div class="settings-card">
                    <h2>👤 Tên hiển thị</h2>
                    <input type="text" id="rename-input" class="input-field" maxlength="20" value="${this.escapeHtml(this.state.currentUser)}" placeholder="Tên hiển thị mới (3-20 ký tự)">
                    <p id="rename-status" class="settings-status"></p>
                    <button class="btn-primary" id="rename-btn" style="padding:12px 24px;">ĐỔI TÊN</button>
                </div>

                <div class="settings-card">
                    <h2>Đổi mật khẩu</h2>
                    <input type="password" id="new-password-input" class="input-field" placeholder="Mật khẩu mới (ít nhất 6 ký tự)" style="margin-bottom:10px;">
                    <input type="password" id="confirm-password-input" class="input-field" placeholder="Nhập lại mật khẩu mới">
                    <p id="password-change-status" class="settings-status"></p>
                    <button class="btn-primary" id="change-password-btn" style="padding:12px 24px;">ĐỔI MẬT KHẨU</button>
                </div>

                <div class="settings-card settings-danger-card">
                    <h2>⚠️ Xóa tài khoản</h2>
                    <p class="settings-empty-note">Xóa vĩnh viễn tài khoản cùng toàn bộ tiến trình học, XP, huy hiệu và tin nhắn. Hành động này KHÔNG THỂ hoàn tác.</p>
                    <input type="text" id="delete-account-confirm-input" class="input-field" placeholder='Gõ chính xác tên "${this.escapeHtml(this.state.currentUser)}" để xác nhận'>
                    <p id="delete-account-status" class="settings-status"></p>
                    <button class="btn-secondary settings-delete-account-btn" id="delete-account-btn">XÓA TÀI KHOẢN CỦA TÔI</button>
                </div>

                <button class="btn-secondary" id="settings-back-btn" style="display:block; margin:20px auto 10px; padding:14px 28px;">QUAY LẠI</button>
                <button class="btn-secondary settings-signout-btn" id="settings-signout-btn">🚪 Đăng xuất</button>
            </div>
        `;
        this.ui.checkBtn.disabled = true;
        this.ui.checkBtn.classList.remove('active');

        document.getElementById('settings-back-btn').addEventListener('click', () => {
            this.state.mode = 'curriculum';
            this.renderHomeDashboard();
        });
        document.getElementById('settings-signout-btn').addEventListener('click', () => this.handleSignOut());
        document.getElementById('settings-view-achievements').addEventListener('click', () => this.renderAchievements());
        document.getElementById('settings-view-certificates').addEventListener('click', () => this.renderCertificateHistory());

        const fileInput = document.getElementById('avatar-file-input');
        document.getElementById('avatar-upload-btn').addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', () => {
            const file = fileInput.files[0];
            if (file) this.handleAvatarUpload(file);
        });

        document.getElementById('change-password-btn').addEventListener('click', () => this.handleChangePassword());
        document.getElementById('rename-btn').addEventListener('click', () => this.handleRename());
        document.getElementById('delete-account-btn').addEventListener('click', () => this.handleDeleteAccount());
    },

    handleDeleteAccount() {
        const statusEl = document.getElementById('delete-account-status');
        const typed = document.getElementById('delete-account-confirm-input').value.trim();
        if (typed !== this.state.currentUser) {
            statusEl.style.color = 'var(--duo-red)';
            statusEl.innerText = `Vui lòng gõ chính xác tên "${this.state.currentUser}" để xác nhận xóa.`;
            return;
        }
        this.showConfirmDialog('Bạn CHẮC CHẮN muốn xóa vĩnh viễn tài khoản? Toàn bộ dữ liệu sẽ mất và không thể khôi phục. Tin nhắn, kết bạn và lịch sử thách đấu giữa bạn và người khác cũng sẽ biến mất ở cả hai phía.', async () => {
            statusEl.style.color = 'var(--duo-dark-grey)';
            statusEl.innerText = 'Đang xóa tài khoản...';
            const result = await window.AuthService.deleteOwnAccount();
            if (result.error) {
                statusEl.style.color = 'var(--duo-red)';
                statusEl.innerText = /delete_own_account/.test(result.error)
                    ? 'Tính năng xóa tài khoản chưa sẵn sàng - quản trị viên cần chạy migration "self_service_inbox_vibrancy.sql" trên Supabase.'
                    : `Xóa tài khoản thất bại: ${result.error}`;
                return;
            }
            if (this.state.profile) {
                localStorage.removeItem(`duo_position_${this.state.profile.id}`);
            }
            alert('Tài khoản của bạn đã được xóa. Tạm biệt và hẹn gặp lại!');
            if (window.AuthService) await window.AuthService.signOut();
            location.reload();
        }, { okLabel: 'XÓA VĨNH VIỄN' });
    },

    async handleAvatarUpload(file) {
        const statusEl = document.getElementById('avatar-upload-status');
        const MAX_BYTES = 2 * 1024 * 1024;
        if (!file.type.startsWith('image/')) {
            statusEl.style.color = 'var(--duo-red)';
            statusEl.innerText = 'Vui lòng chọn 1 tệp hình ảnh.';
            return;
        }
        if (file.size > MAX_BYTES) {
            statusEl.style.color = 'var(--duo-red)';
            statusEl.innerText = 'Ảnh quá lớn, vui lòng chọn ảnh dưới 2MB.';
            return;
        }
        statusEl.style.color = 'var(--duo-dark-grey)';
        statusEl.innerText = 'Đang tải ảnh lên...';

        const result = await window.AuthService.uploadAvatar(this.state.profile.id, file);
        if (result.error) {
            statusEl.style.color = 'var(--duo-red)';
            statusEl.innerText = `Tải ảnh thất bại: ${result.error}. Bảng lưu trữ "avatars" có thể chưa được tạo trên Supabase.`;
            return;
        }

        this.state.avatarUrl = result.url;
        this.updateAvatarDisplay();
        const preview = document.getElementById('settings-avatar-preview');
        if (preview) preview.innerHTML = `<img src="${result.url}" alt="avatar">`;
        await window.AuthService.updateProfile(this.state.profile.id, { avatar_url: result.url });
        statusEl.style.color = 'var(--duo-green)';
        statusEl.innerText = 'Đã cập nhật ảnh đại diện!';
    },

    async handleChangePassword() {
        const statusEl = document.getElementById('password-change-status');
        const newPw = document.getElementById('new-password-input').value;
        const confirmPw = document.getElementById('confirm-password-input').value;

        if (newPw.length < 6) {
            statusEl.style.color = 'var(--duo-red)';
            statusEl.innerText = 'Mật khẩu mới phải có ít nhất 6 ký tự.';
            return;
        }
        if (newPw !== confirmPw) {
            statusEl.style.color = 'var(--duo-red)';
            statusEl.innerText = 'Hai mật khẩu không khớp nhau.';
            return;
        }

        statusEl.style.color = 'var(--duo-dark-grey)';
        statusEl.innerText = 'Đang cập nhật...';
        const result = await window.AuthService.updatePassword(newPw);
        if (result.error) {
            statusEl.style.color = 'var(--duo-red)';
            statusEl.innerText = `Đổi mật khẩu thất bại: ${result.error}`;
            return;
        }
        statusEl.style.color = 'var(--duo-green)';
        statusEl.innerText = 'Đổi mật khẩu thành công!';
        document.getElementById('new-password-input').value = '';
        document.getElementById('confirm-password-input').value = '';
    },

    async renderAdminDashboard() {
        if (!this.state.isAdmin) {
            this.returnToApp();
            return;
        }
        this.ui.container.innerHTML = `
            <div class="admin-screen">
                <h2 style="text-align: center;">👑 Quản trị hệ thống</h2>
                <div id="admin-summary" class="admin-summary"><p style="text-align: center; color: #777;">Đang tải...</p></div>
                <div class="admin-controls">
                    <input type="text" id="admin-search" class="input-field admin-search-input" placeholder="Tìm theo tên hoặc email...">
                    <select id="admin-sort" class="input-field admin-sort-select">
                        <option value="created_desc">Mới tham gia nhất</option>
                        <option value="xp_desc">XP cao nhất</option>
                        <option value="streak_desc">Streak cao nhất</option>
                        <option value="teddy_desc">Nhiều gấu bông nhất</option>
                        <option value="name_asc">Tên A-Z</option>
                    </select>
                </div>
                <div id="admin-list"><p style="text-align: center; color: #777;">Đang tải...</p></div>

                <h3 style="text-align: center; margin-top: 30px;">🏆 Quản lý Bảng Xếp Hạng &amp; Vinh Danh</h3>
                <div class="admin-controls" style="justify-content: center;">
                    <button class="btn-secondary admin-action-danger" id="admin-reset-leaderboard">🔄 Xóa Bảng Xếp Hạng</button>
                    <button class="btn-secondary admin-action-danger" id="admin-clear-hof">🧸 Xóa Toàn Bộ Vinh Danh</button>
                </div>
                <div id="admin-hof-list"><p style="text-align: center; color: #777;">Đang tải...</p></div>

                <h3 style="text-align: center; margin-top: 30px;">🏰 Quản lý Group</h3>
                <div class="admin-controls" style="justify-content: center;">
                    <button class="btn-secondary" id="admin-manage-groups">🏰 Xem tất cả Group</button>
                </div>

                <button class="btn-secondary" id="admin-close" style="margin-top: 20px;">QUAY LẠI</button>
            </div>
        `;
        this.ui.checkBtn.disabled = true;
        this.ui.checkBtn.classList.remove('active');
        document.getElementById('admin-close').addEventListener('click', () => this.renderHomeDashboard());

        const allProfiles = await window.AuthService.listAllProfiles();
        this.renderAdminSummary(allProfiles);

        const searchInput = document.getElementById('admin-search');
        const sortSelect = document.getElementById('admin-sort');
        const rerender = () => this.renderAdminList(allProfiles, searchInput.value, sortSelect.value);
        searchInput.addEventListener('input', rerender);
        sortSelect.addEventListener('change', rerender);
        rerender();

        document.getElementById('admin-reset-leaderboard').addEventListener('click', async () => {
            // Leaderboard now ranks by cumulative XP (never reset), so clearing these
            // rows is mostly cosmetic - every user's real total XP re-populates the
            // table again the moment they finish their next lesson or duel.
            const ok = confirm('Xóa toàn bộ danh sách bảng xếp hạng? Lưu ý: XP thật của người dùng không đổi, bảng sẽ tự điền lại ngay khi họ hoàn thành bài học hoặc thi đấu tiếp theo.');
            if (!ok) return;
            await window.Leaderboard.resetLeaderboard();
            this.renderAdminDashboard();
        });
        document.getElementById('admin-clear-hof').addEventListener('click', async () => {
            const ok = confirm('Xóa TOÀN BỘ dữ liệu vinh danh (gấu bông tuần)? Số gấu bông tương ứng của mỗi user cũng sẽ bị trừ lại. Không thể hoàn tác.');
            if (!ok) return;
            await window.Leaderboard.clearHallOfFame();
            this.renderAdminDashboard();
        });
        document.getElementById('admin-manage-groups').addEventListener('click', () => this.renderAdminGroupsList());

        await this.renderAdminHallOfFame();
    },

    async renderAdminHallOfFame() {
        const hofListEl = document.getElementById('admin-hof-list');
        if (!hofListEl || !window.Leaderboard) return;
        const entries = await window.Leaderboard.getHallOfFame(50);
        if (!entries.length) {
            hofListEl.innerHTML = `<p style="text-align: center; color: #777;">Chưa có dữ liệu vinh danh.</p>`;
            return;
        }
        hofListEl.innerHTML = `<div class="admin-table">` + entries.map(h => `
            <div class="admin-row">
                <div class="admin-row-main">
                    <strong>🧸 ${this.escapeHtml(h.username)}</strong>
                    <div class="admin-row-meta">${this.escapeHtml(window.Leaderboard.formatWeekLabel(h.week_id))} · ${h.weekly_xp} XP</div>
                </div>
                <div class="admin-row-actions">
                    <button class="btn-secondary admin-action-btn admin-action-danger" data-action="delete-hof" data-week="${this.escapeHtml(h.week_id)}">Xóa</button>
                </div>
            </div>
        `).join('') + `</div>`;

        hofListEl.querySelectorAll('.admin-action-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const ok = confirm('Xóa dòng vinh danh này? Gấu bông tương ứng của user sẽ bị trừ lại 1.');
                if (!ok) return;
                btn.disabled = true;
                await window.Leaderboard.deleteHallOfFameEntry(btn.dataset.week);
                this.renderAdminDashboard();
            });
        });
    },

    renderAdminSummary(profiles) {
        const el = document.getElementById('admin-summary');
        if (!el) return;

        const totalUsers = profiles.length;
        const totalXp = profiles.reduce((sum, p) => sum + (p.xp || 0), 0);
        const totalBears = profiles.reduce((sum, p) => sum + (p.teddy_bears || 0), 0);
        const oneWeekAgoMs = Date.now() - 7 * 24 * 60 * 60 * 1000;
        const activeThisWeek = profiles.filter(p => {
            if (!p.last_activity_date) return false;
            const t = new Date(p.last_activity_date).getTime();
            return !isNaN(t) && t >= oneWeekAgoMs;
        }).length;

        el.innerHTML = `
            <div class="admin-stat-grid">
                <div class="admin-stat-card">
                    <div class="admin-stat-value">${totalUsers}</div>
                    <div class="admin-stat-label">Tổng người dùng</div>
                </div>
                <div class="admin-stat-card">
                    <div class="admin-stat-value">${totalXp}</div>
                    <div class="admin-stat-label">Tổng XP hệ thống</div>
                </div>
                <div class="admin-stat-card">
                    <div class="admin-stat-value">${activeThisWeek}</div>
                    <div class="admin-stat-label">Hoạt động tuần này</div>
                </div>
                <div class="admin-stat-card">
                    <div class="admin-stat-value">🧸 ${totalBears}</div>
                    <div class="admin-stat-label">Tổng gấu bông</div>
                </div>
            </div>
        `;
    },

    renderAdminList(allProfiles, searchTerm, sortKey) {
        const listEl = document.getElementById('admin-list');
        if (!listEl) return;

        let filtered = allProfiles;
        const term = (searchTerm || '').trim().toLowerCase();
        if (term) {
            filtered = filtered.filter(p =>
                (p.username || '').toLowerCase().includes(term) ||
                (p.email || '').toLowerCase().includes(term)
            );
        }

        const sorters = {
            created_desc: (a, b) => new Date(b.created_at) - new Date(a.created_at),
            xp_desc: (a, b) => (b.xp || 0) - (a.xp || 0),
            streak_desc: (a, b) => (b.streak || 0) - (a.streak || 0),
            teddy_desc: (a, b) => (b.teddy_bears || 0) - (a.teddy_bears || 0),
            name_asc: (a, b) => (a.username || '').localeCompare(b.username || '')
        };
        filtered = filtered.slice().sort(sorters[sortKey] || sorters.created_desc);

        if (!filtered.length) {
            listEl.innerHTML = `<p style="text-align: center; color: #777;">Không tìm thấy người dùng nào.</p>`;
            return;
        }

        listEl.innerHTML = `<div class="admin-table">` + filtered.map(p => {
            const isSelf = this.state.profile && p.id === this.state.profile.id;
            return `
            <div class="admin-row ${p.banned ? 'admin-row-banned' : ''}">
                <div class="admin-row-main">
                    <strong>${this.escapeHtml(p.username)}</strong>
                    ${p.role === 'admin' ? '<span class="admin-badge-tag">👑 Admin</span>' : ''}
                    ${p.banned ? '<span class="admin-badge-tag admin-badge-banned">🚫 Đã khóa</span>' : ''}
                    ${isSelf ? '<span class="admin-badge-tag">Bạn</span>' : ''}
                    <div class="admin-row-meta">${this.escapeHtml(p.email || '(không có email)')}</div>
                    <div class="admin-row-meta">XP: ${p.xp || 0} · Streak: ${p.streak || 0} · Tim: ${p.hearts != null ? p.hearts : 0} · 🧸 ${p.teddy_bears || 0} · Tham gia: ${new Date(p.created_at).toLocaleDateString('vi-VN')}</div>
                </div>
                <div class="admin-row-actions">
                    <button class="btn-secondary admin-action-btn" data-action="reset-hearts" data-id="${p.id}">Reset tim &amp; streak</button>
                    <button class="btn-secondary admin-action-btn" data-action="reset-progress" data-id="${p.id}">Reset tiến trình</button>
                    ${isSelf ? '' : `<button class="btn-secondary admin-action-btn" data-action="toggle-role" data-id="${p.id}" data-role="${p.role}">${p.role === 'admin' ? 'Giáng xuống User' : 'Thăng lên Admin'}</button>`}
                    ${isSelf ? '' : `<button class="btn-secondary admin-action-btn ${p.banned ? '' : 'admin-action-danger'}" data-action="toggle-ban" data-id="${p.id}" data-banned="${p.banned}">${p.banned ? 'Mở khóa' : 'Khóa tài khoản'}</button>`}
                    ${isSelf ? '' : `<button class="btn-secondary admin-action-btn admin-action-danger" data-action="delete-user" data-id="${p.id}">Xóa tài khoản</button>`}
                </div>
            </div>
        `;
        }).join('') + `</div>`;

        listEl.querySelectorAll('.admin-action-btn').forEach(btn => {
            btn.addEventListener('click', () => this.handleAdminAction(btn));
        });
    },

    async handleAdminAction(btn) {
        const action = btn.dataset.action;
        const id = btn.dataset.id;

        if (action === 'reset-hearts') {
            btn.disabled = true;
            await window.AuthService.updateProfile(id, { hearts: MAX_HEARTS, streak: 0 });
            this.renderAdminDashboard();
            return;
        }

        if (action === 'reset-progress') {
            const ok = confirm('Bạn chắc chắn muốn reset TOÀN BỘ tiến trình của người dùng này (XP, streak, tim)? Không thể hoàn tác.');
            if (!ok) return;
            btn.disabled = true;
            await window.AuthService.updateProfile(id, { xp: 0, weekly_xp: 0, streak: 0, hearts: MAX_HEARTS, stats: {} });
            this.renderAdminDashboard();
            return;
        }

        if (action === 'toggle-role') {
            const newRole = btn.dataset.role === 'admin' ? 'user' : 'admin';
            const ok = confirm(newRole === 'admin' ? 'Thăng người dùng này lên quyền Admin?' : 'Giáng người dùng này xuống quyền User thường?');
            if (!ok) return;
            btn.disabled = true;
            await window.AuthService.updateProfile(id, { role: newRole });
            this.renderAdminDashboard();
            return;
        }

        if (action === 'toggle-ban') {
            const newBanned = btn.dataset.banned !== 'true';
            const ok = confirm(newBanned ? 'Khóa tài khoản này? Người dùng sẽ không thể đăng nhập được nữa.' : 'Mở khóa tài khoản này?');
            if (!ok) return;
            btn.disabled = true;
            await window.AuthService.updateProfile(id, { banned: newBanned });
            this.renderAdminDashboard();
            return;
        }

        if (action === 'delete-user') {
            const ok = confirm('XÓA VĨNH VIỄN hồ sơ này? Toàn bộ XP, streak, gấu bông, tiến trình sẽ mất, không thể hoàn tác.\n\nLưu ý: tài khoản đăng nhập (email/mật khẩu) vẫn còn tồn tại trên hệ thống xác thực — nếu họ đăng nhập lại, một hồ sơ mới trắng sẽ được tạo. Muốn chặn hẳn, dùng "Khóa tài khoản" hoặc xóa tay trong Supabase Dashboard.');
            if (!ok) return;
            btn.disabled = true;
            await window.AuthService.deleteProfile(id);
            this.renderAdminDashboard();
            return;
        }
    }
});
