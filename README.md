# CV Studio

Ứng dụng desktop để sửa CV, viết Cover Letter và xuất PDF. Hồ sơ lưu trên máy của bạn.

## Tải app

Khi có bản phát hành, tải app tại [Releases](https://github.com/tranbaominh97/cv-studio/releases):

- **Windows:** tải file `.exe` và mở để dùng.
- **macOS:** tải file `.dmg` phù hợp với máy khi có bản Mac, mở và kéo app vào Applications.

Mở app, bấm **Tạo CV mới**, chọn một trong 15 mẫu. Có bộ lọc **Một cột / Hai cột / Có ảnh** và hình xem trước cho từng mẫu. Sau đó chọn **Dùng CV có sẵn** (tạo bản sao, giữ nguyên bản gốc) hoặc **Tạo nội dung mới**, đặt tên và chỉnh sửa.

Bộ mẫu: Tối giản, Thanh lịch, Chân dung, Hiện đại, Nổi bật, Điều hành, Sắc kem, Tương phản, Biên tập, Dòng thời gian, Thụy Sĩ, Sáng tạo, Đô thị, Học thuật và Tinh gọn.

- App mở lại CV đang làm. **Đổi mẫu** giữ nguyên nội dung; **Căn trang** chứa các điều chỉnh chữ, giãn dòng và lề.
- **Xem lớn** mở bản xem trước; khi đổi mẫu, bản xem trước dùng nội dung CV đang mở. **Dùng CV có sẵn** cho phép chọn file `.md` từ máy để tạo bản mới trong thư mục tài liệu hiện tại.
- Bấm vào chữ để sửa, dùng **Mục nội dung** để thêm/xóa phần, hoặc nút xóa ở từng công việc/học vấn/dòng kỹ năng. **Hoàn tác chỉnh sửa** khôi phục thao tác xóa. Giao diện mặc định vừa chiều rộng cửa sổ; có thể chọn mức thu/phóng khác.
- Các mẫu có nhãn **Ảnh tùy chọn** hỗ trợ ảnh chân dung. Chọn ảnh JPG/PNG/WebP tối đa 10 MB, căn khung rồi bấm **Dùng ảnh này**. Ảnh được giữ khi chuyển sang mẫu không ảnh và không được thêm vào Cover Letter.
- **Xem bản in** kiểm tra PDF thực tế. CV nên gọn trong một trang; nếu nhiều trang, app cảnh báo và cho phép tiếp tục lưu/in toàn bộ.
- Nội dung vẫn là file `.md`. Mẫu, căn trang và ảnh lưu trong `.cv-studio/<tên-file>.md.json` cùng thư mục. Khi chuyển hồ sơ sang máy khác, mang theo cả `.cv-studio` để giữ cách trình bày và ảnh.

## Chạy từ mã nguồn

Các mẫu được thiết kế riêng, tham khảo các hướng một cột, hai cột, timeline và nhấn kiểu chữ trong danh mục [Resume.io](https://resume.io/resume-templates) và [Novorésumé](https://novoresume.com/resume-templates), đối chiếu ngày 13/10/2026. Không sử dụng số liệu xếp hạng lượt dùng hay cam kết điểm ATS.

Cài Node.js 22 và npm, sau đó chạy:

```sh
git clone https://github.com/tranbaominh97/cv-studio.git
cd cv-studio
npm ci
npm run desktop
```
