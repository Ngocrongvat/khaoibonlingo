# Hiệu ứng âm thanh cho linh vật 🔊

Mỗi loại biểu cảm dùng **nhiều biến thể đánh số** (`correct1.mp3`, `correct2.mp3`,
…). Mỗi lần phát app **chọn ngẫu nhiên một biến thể** (không lặp lại ngay biến thể
vừa phát) nên nghe không nhàm. Chỉ cần đặt file đúng tên, không phải sửa code.

- Định dạng **`.mp3`**, tên **không dấu, viết thường**, đánh số từ `1`.
- Nên là hiệu ứng **ngắn** (0.3–2 giây), riêng `complete` có thể dài hơn chút.

| Nhóm file (đánh số) | Số biến thể hiện có | Phát khi nào |
|---|---|---|
| `correct1..N.mp3`  | 2 | Trả lời **đúng** một câu |
| `wrong1..N.mp3`    | 4 | Trả lời **sai** một câu (nhẹ nhàng) |
| `cheer1..N.mp3`    | 1 | **Thắng** bài luyện tập / trận đấu |
| `complete1..N.mp3` | 3 | **Hoàn thành** bài học / chương / khóa |
| `cry1..N.mp3`      | 3 | **Thua** bài kiểm tra / trận đấu |
| `whimper1..N.mp3`  | 3 | **Hết tim** / gần đạt mà chưa qua |
| `sparkle1..N.mp3`  | 2 | Nhận **huy hiệu** / phần thưởng |
| `smile1..N.mp3`    | 9 | **Chạm vào linh vật** ở trang chính (cười đùa, hò reo) |

> Thêm biến thể mới: thả `correct3.mp3` vào đây rồi **tăng số** trong bảng
> `VARIANTS` ở đầu [`assets/js/mascot-voice.js`](../js/mascot-voice.js) (vd `correct: 3`).

## Chức năng "chơi đùa" ở trang chính 🎉

Chạm vào linh vật chào mừng ở trang chính → nó làm một **hành động ngẫu nhiên**
(nhảy / xoay / lộn / chạy / lắc lư / gật gù), đổi **mặt vui ngẫu nhiên**, bắn hạt
lấp lánh và **cười** bằng một file `smile*.mp3` ngẫu nhiên.

## Sau khi thả file vào

1. Đặt file vào `assets/sounds/` đúng tên ở trên.
2. Mở lại app (reload), chạm để mở khóa âm thanh, làm thử một câu → nghe kết quả.
3. Muốn commit lên GitHub: hãy tự đảm bảo bản quyền cho phép (nếu tải từ kho
   stock như Pikbest, giấy phép của họ thường **cấm phân phối lại** trên repo
   công khai — cân nhắc dùng nguồn CC0/không cần ghi nguồn, hoặc để repo riêng tư).

## Mã nguồn liên quan

- Trình phát: [`assets/js/mascot-voice.js`](../js/mascot-voice.js)
  (`window.MascotVoice.play(type)`), bảng ánh xạ `reaction → tên file` nằm ở đầu file.
- Nơi gọi: `app.js` (`playTone(...)`) và `games.js` (kết thúc mini-game).
