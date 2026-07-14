# Hiệu ứng âm thanh cho linh vật 🔊

Thả các file âm thanh **dễ thương / vui nhộn** vào đúng thư mục này
(`assets/sounds/`) với **đúng tên** dưới đây. App sẽ tự phát chúng khi linh vật
biểu cảm — không cần sửa code gì thêm.

- Ưu tiên định dạng **`.mp3`**. Nếu file của bạn là **`.wav`** thì cũng được:
  cứ đặt tên `<tên>.wav`, app tự dò `.mp3` trước rồi `.wav`.
- Tên file **không dấu, viết thường**, đúng y như bảng dưới.
- Nên là hiệu ứng **ngắn** (0.3–2 giây), riêng `complete` có thể dài hơn một chút.

| Tên file cần đặt | Phát khi nào | Gợi ý chất âm |
|---|---|---|
| `correct.mp3`  | Trả lời **đúng** một câu | "ting!" vui, dễ thương, ngắn |
| `wrong.mp3`    | Trả lời **sai** một câu | "uh-oh" nhẹ nhàng, **không gắt** |
| `cheer.mp3`    | **Thắng** bài luyện tập / trận đấu | reo hò, hoan hô vui |
| `complete.mp3` | **Hoàn thành** bài học / chương / khóa | fanfare tưng bừng (dài hơn chút) |
| `cry.mp3`      | **Thua** bài kiểm tra / trận đấu | tiếng khóc dễ thương |
| `whimper.mp3`  | **Hết tim** / gần đạt mà chưa qua | tủi thân, sụt sịt nhẹ |
| `sparkle.mp3`  | Nhận **huy hiệu** / phần thưởng | lấp lánh, "shiny" |

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
