# KhoaiBonlingo

Ứng dụng học tiếng Anh kiểu Duolingo dành cho người Việt — thuần JavaScript/HTML/CSS phía client (không build step), backend dùng Supabase (Auth, Postgres, Realtime, Storage). Đây là tài liệu hướng dẫn dựng lại toàn bộ hệ thống từ đầu (A-Z): từ mã nguồn, cơ sở dữ liệu, đến triển khai lên internet.

## Mục lục

1. [Tính năng](#tính-năng)
2. [Kiến trúc & công nghệ](#kiến-trúc--công-nghệ)
3. [Cấu trúc thư mục](#cấu-trúc-thư-mục)
4. [Hướng dẫn cài đặt từ đầu](#hướng-dẫn-cài-đặt-từ-đầu)
5. [Tổng quan cơ sở dữ liệu](#tổng-quan-cơ-sở-dữ-liệu)
6. [Chạy thử ở máy local](#chạy-thử-ở-máy-local)
7. [Triển khai lên internet (Cloudflare Pages)](#triển-khai-lên-internet-cloudflare-pages)
8. [Ghi chú khi phát triển thêm](#ghi-chú-khi-phát-triển-thêm)

---

## Tính năng

**Học tập cốt lõi**
- Lộ trình 19 chương / 110 bài học có sẵn, cộng thêm hệ thống **tự sinh bài tập** tại runtime (kết hợp ~6.500 từ vựng × 34 mẫu ngữ pháp × 13 dạng bài) dùng cho Luyện tập, Bài kiểm tra đánh giá, và ôn tập điểm yếu
- 13 dạng bài: chọn đáp án, dịch, sắp xếp câu, điền từ, nghe & viết chính tả, nói & chấm điểm phát âm (độ tương đồng văn bản qua Levenshtein), chọn nghĩa/đồng nghĩa, đọc hiểu, đọc hội thoại...
- Theo dõi lỗi sai kiểu spaced-repetition (SM-2 rút gọn), đồng bộ lên Supabase để giữ nguyên khi đổi thiết bị
- 5 mini-game (ghép từ nhanh, luyện trí nhớ, tìm từ khác biệt, phản xạ, đoán từ qua hình)
- Luyện thi IELTS riêng (Reading/Listening/Writing/Speaking)

**Gamification & xã hội**
- XP, streak, huy hiệu (17 loại), bảng xếp hạng tuần + vinh danh (Hall of Fame), chứng chỉ ảo
- Kết bạn, tặng tim, đấu 1vs1 (áp dụng cho cả bài học lẫn 5 mini-game)
- Chat Cộng Đồng realtime (tự dọn tin nhắn sau 24h) + Hộp thư cá nhân
- Menu tương tác khi click tên user ở bất kỳ đâu trong app (thách đấu / nhắn tin / xem info / kết bạn)
- **Hệ thống Group** đầy đủ: tạo/tham gia/quản lý group, chat nhóm, "điểm sôi nổi" đóng vai trò EXP/level của group, đấu group-vs-group (tổng hợp nhiều trận 1vs1), 3 bảng xếp hạng group

**Quản trị**
- Admin Dashboard: quản lý người dùng, bảng xếp hạng, vinh danh
- Quản trị hệ thống Group: xem/xóa mọi group, đổi vai trò/gỡ thành viên bất kỳ, sửa điểm sôi nổi, kiểm duyệt chat, buộc kết thúc trận đấu bị treo — có RLS thật ở tầng database, không chỉ ẩn nút UI

## Kiến trúc & công nghệ

- **Không build step**: toàn bộ frontend là JS thuần (`<script>` tag cổ điển, không module bundler), load trực tiếp qua `index.html`
- **Backend**: Supabase — Postgres (dữ liệu + Row Level Security), Auth (email/mật khẩu), Realtime (Postgres change feed cho chat/duel/group), Storage (avatar)
- **Không có server riêng / không có cron**: mọi tác vụ "định kỳ" (tự xóa chat cũ, cộng điểm sôi nổi qua heartbeat...) đều theo mô hình "cơ hội" — được kích hoạt bởi client bất kỳ đang hoạt động, không cần worker nền
- **Hosting**: static site, triển khai qua Cloudflare Pages (tự động build lại mỗi khi push lên `main`)

## Cấu trúc thư mục

```
├── index.html                  # Entry point, load toàn bộ script theo đúng thứ tự phụ thuộc
├── assets/
│   ├── css/style.css           # Toàn bộ style
│   └── js/
│       ├── app.js              # Class DuoClone chính — toàn bộ màn hình/luồng UI
│       ├── auth.js             # Đăng nhập/đăng ký, quản lý hồ sơ, upload avatar
│       ├── supabase-client.js  # Khởi tạo Supabase client từ supabase-config.js
│       ├── supabase-config.js  # URL + anon key của project Supabase (an toàn để public)
│       ├── exercise-generator.js  # Bộ sinh bài tự động (kết hợp vocab-bank + grammar-patterns)
│       ├── error-tracker.js    # Theo dõi lỗi sai kiểu spaced-repetition
│       ├── games.js            # 5 mini-game
│       ├── badges.js           # Định nghĩa huy hiệu
│       ├── leaderboard.js      # Bảng xếp hạng + vinh danh tuần
│       ├── duel.js             # Hệ thống đấu 1vs1 (dùng chung cho bài học + mini-game + group battle)
│       ├── friends.js          # Kết bạn, tặng tim
│       ├── global-chat.js      # Chat Cộng Đồng
│       ├── inbox.js            # Hộp thư cá nhân
│       └── groups.js           # Toàn bộ hệ thống Group (kể cả các hàm quản trị)
├── data/                       # Dữ liệu tĩnh: khóa học có sẵn, ngân hàng từ vựng, mẫu ngữ pháp, đề IELTS...
└── supabase/migrations/        # File SQL — chạy tay trên Supabase Dashboard (xem bên dưới)
```

## Hướng dẫn cài đặt từ đầu

### Yêu cầu

- Tài khoản [Supabase](https://supabase.com) (miễn phí)
- Tài khoản [Cloudflare](https://dash.cloudflare.com) (miễn phí, nếu muốn deploy)
- Git, và Python 3 (chỉ để chạy server tĩnh khi test local — không bắt buộc nếu chỉ deploy)

### Bước 1 — Clone mã nguồn

```bash
git clone https://github.com/Ngocrongvat/khaoibonlingo.git
cd khaoibonlingo
```

### Bước 2 — Tạo project Supabase

1. Vào [supabase.com/dashboard](https://supabase.com/dashboard) → **New project**
2. Ghi lại **Project URL** và **anon/public key** (Project Settings → Data API)

### Bước 3 — Chạy migration SQL theo ĐÚNG thứ tự

Vào **Supabase Dashboard → SQL Editor → New query**, dán và chạy **lần lượt từng file** theo thứ tự dưới đây (thứ tự bắt buộc vì các file sau phụ thuộc bảng/cột do file trước tạo ra):

| # | File | Tạo ra gì |
|---|------|-----------|
| 1 | `duels_schema.sql` | Bảng `duels` (nền tảng hệ thống đấu 1vs1) |
| 2 | `duels_profile_usernames_view.sql` | View `profile_usernames` (tra cứu id theo username, dùng khắp nơi) |
| 3 | `duel_results_view.sql` | View phục vụ Bảng Xếp Hạng Thánh Chiến |
| 4 | `duels_replica_identity_full.sql` | Sửa lỗi realtime không nhận đủ dữ liệu khi UPDATE bảng `duels` |
| 5 | `avatars_storage.sql` | Cột `avatar_url` + bucket Storage công khai cho ảnh đại diện |
| 6 | `friends_and_gifts_schema.sql` | Bảng `friendships`, `heart_gifts`; mở rộng `duels` cho đấu mini-game |
| 7 | `chat_and_inbox_schema.sql` | Bảng `global_chat_messages`, `direct_messages` |
| 8 | `chat_cleanup_and_user_menu.sql` | Policy tự xóa chat cũ >24h; mở rộng view `profile_usernames` |
| 9 | `groups_schema.sql` | Toàn bộ hệ thống Group: bảng, RLS, RPC tính điểm/đấu group |
| 10 | `groups_admin_schema.sql` | Quyền quản trị hệ thống Group cho tài khoản admin |

> **Lưu ý:** đây là repo không có Supabase CLI/pipeline migration tự động — mọi thay đổi schema phải chạy tay theo thứ tự trên. Nếu một file báo lỗi giữa chừng, đọc kỹ comment đầu file đó (mỗi file đều giải thích rõ mục đích và cách áp dụng).

### Bước 4 — Cấu hình kết nối Supabase

Sửa `assets/js/supabase-config.js`:

```js
window.SUPABASE_CONFIG = {
    url: "https://<project-id>.supabase.co",
    anonKey: "<anon-public-key>"
};
```

Key này **an toàn để commit/public** — bảo mật thật nằm ở Row Level Security (đã cấu hình đầy đủ trong các file migration), không nằm ở việc giấu anon key.

### Bước 5 — Tạo tài khoản Admin đầu tiên

Tài khoản không thể tự phong admin qua giao diện (chặn tự nâng quyền). Sau khi đăng ký tài khoản đầu tiên qua app, chạy trong SQL Editor:

```sql
update profiles set role = 'admin' where email = 'email-cua-ban@example.com';
```

## Chạy thử ở máy local

Không cần build, chỉ cần một static server bất kỳ:

```bash
python3 -m http.server 8791
```

Mở `http://localhost:8791/index.html`.

## Triển khai lên internet (Cloudflare Pages)

1. Push mã nguồn lên GitHub
2. Vào [dash.cloudflare.com](https://dash.cloudflare.com) → **Workers & Pages → Create application → Pages → Connect to Git**
3. Chọn repo, cấu hình build:
   - **Framework preset**: `None`
   - **Build command**: để trống (không cần build)
   - **Build output directory**: `/`
4. **Save and Deploy** — từ nay mỗi lần `git push` lên `main`, Cloudflare tự build lại

## Tổng quan cơ sở dữ liệu

| Bảng/View | Vai trò |
|---|---|
| `profiles` | Hồ sơ người dùng (XP, streak, tim, role...) — có sẵn từ Supabase Auth, không có file migration riêng trong repo |
| `duels` | 1 dòng/trận đấu 1vs1 — dùng chung cho bài học, 5 mini-game, và từng trận con trong đấu group |
| `friendships`, `heart_gifts` | Kết bạn, tặng tim |
| `global_chat_messages`, `direct_messages` | Chat cộng đồng, hộp thư cá nhân |
| `groups`, `group_members`, `group_messages`, `group_battles` | Hệ thống Group đầy đủ |
| `leaderboard`, `hall_of_fame` | Bảng xếp hạng tuần, vinh danh — không có file migration riêng trong repo |

## Ghi chú khi phát triển thêm

- **Không có build step**: thêm file JS mới thì phải tự thêm `<script>` tag vào `index.html` theo đúng thứ tự phụ thuộc (file dùng `window.XYZ` của file khác phải load sau file đó)
- **Không có cron/server nền**: mọi việc "định kỳ" phải theo mô hình cơ hội (client nào đang hoạt động thì tiện thể kích hoạt), xem `global-chat.js`'s `deleteOldMessages()` hoặc `groups.js`'s heartbeat làm ví dụ
- **RLS là lớp bảo mật thật**, không dựa vào ẩn nút UI — khi thêm tính năng cần quyền đặc biệt (ví dụ ghi vào dữ liệu của người khác), tham khảo mẫu SECURITY DEFINER đã dùng nhất quán trong `groups_schema.sql`/`groups_admin_schema.sql`
- Mọi migration mới nên viết theo đúng phong cách các file hiện có: comment giải thích rõ *tại sao*, không chỉ *làm gì*
