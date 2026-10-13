# CV Studio

make so well cv that back you up when layoff come

Ứng dụng desktop để sửa CV, viết Cover Letter và xuất PDF. Hồ sơ lưu trên máy người dùng.

## Tải app

Khi có bản phát hành, mở mục **Releases** của repository:

- Windows: tải file `.exe` portable rồi mở app. Với người dùng mới, hồ sơ nằm trong thư mục dữ liệu người dùng của app, tách khỏi file `.exe`; có thể thay hoặc di chuyển file app khi cập nhật.
- macOS: tải `.dmg` đúng kiến trúc (`arm64` cho Apple Silicon; `x64` cho Intel), mở và kéo app vào Applications. Hồ sơ mặc định nằm trong thư mục dữ liệu người dùng của app, bên ngoài gói `.app`.

Lần đầu app không có CV. Bấm **Tạo mới**, hoặc chọn thư mục chứa các CV Markdown của bạn. `examples/sample.md` là dữ liệu hoàn toàn giả để thử tính năng.

Nếu đã có CV ở `data/cvs` cạnh app cũ, lần đầu chạy bản mới tại vị trí đó sẽ giữ nguyên và ghi nhớ thư mục cũ. Không tự di chuyển hoặc xóa hồ sơ. Thư mục bạn từng chọn trong app luôn được ưu tiên; hãy giữ thư mục hồ sơ đó khi cập nhật.

Bản build mặc định chưa ký số hoặc notarize; Windows/macOS có thể chặn hoặc cảnh báo lúc mở. Để giảm cảnh báo, cần ký bản phát hành bằng chứng chỉ phù hợp, và notarize bản Mac. Chữ ký không đảm bảo mọi máy đều hết cảnh báo. Không tắt các cơ chế bảo vệ toàn hệ thống.

### Ký số Windows

Sau khi có chứng chỉ hoặc dịch vụ ký được tin cậy và cấu hình theo nhà cung cấp, chạy `npm run package:win:signed`. Lệnh này bật ký số và yêu cầu chữ ký; build phải thất bại nếu không ký được. `npm run package:win` và workflow hiện tại vẫn tạo bản thử chưa ký, không được giới thiệu là bản đã ký.

Không đưa chứng chỉ, khóa riêng, mật khẩu hoặc cấu hình tài khoản ký vào repository. Danh tính người/tổ chức đứng tên chứng chỉ sẽ xuất hiện công khai trong chữ ký. Chữ ký hợp lệ không đảm bảo mọi máy đều bỏ cảnh báo danh tiếng của app. Chứng chỉ Windows không thay thế ký số và notarization của Apple cho bản Mac.

Trước khi đăng ký, xác nhận nhà cung cấp hỗ trợ quốc gia và loại chủ thể của bạn, tên hiển thị công khai, tổng phí chứng chỉ và phí ký cloud/HSM hoặc token. Ví dụ, [SSL.com](https://www.ssl.com/certificates/code-signing/) có chứng chỉ IV cho cá nhân và eSigner cho ký cloud. [Microsoft Artifact Signing](https://learn.microsoft.com/en-us/azure/artifact-signing/quickstart) có giới hạn quốc gia theo loại chủ thể. Hoàn tất xác minh danh tính trực tiếp với nhà cung cấp; không gửi giấy tờ hoặc thông tin bí mật vào chat hay repository. Sau khi được cấp quyền ký, mới tích hợp phương thức ký cụ thể và kiểm tra chữ ký của cả app bên trong lẫn file portable phát hành.

## Chạy từ mã nguồn

Cần Node.js 22 và npm:

```sh
npm ci
npm test
npm run desktop
```

App chính chạy bằng Electron. `server.mjs` là backend cũ, không cần khởi động khi dùng app desktop. Chức năng PDF của backend cũ phụ thuộc Playwright cài riêng và không thuộc bản desktop được kiểm tra ở đây.

## Chuẩn bị mã nguồn public

`.gitignore` bỏ qua mọi file trừ các đường dẫn được liệt kê rõ ràng. Các file hồ sơ, PDF, backup, tài liệu cá nhân, file build và file tạm vẫn giữ trên máy và không thuộc danh sách chia sẻ. Đừng dùng `git add -f` để vượt qua danh sách này.

```sh
npm run check:public
npm run export:public
```

Lệnh export tạo thư mục mới `output/public-source-*`, chỉ chứa file được phép chia sẻ. Kiểm tra thủ công nội dung bản sao trước khi xuất bản. Kiểm tra tự động chỉ phát hiện một số dạng email, đường dẫn cá nhân và credential; không thể chứng minh rằng mọi thông tin cá nhân đã được loại bỏ. Ảnh icon cần được kiểm tra trực quan.

Nếu sau này thêm source file, cập nhật danh sách `.gitignore` sau khi kiểm tra nội dung. `.gitignore` không xóa dữ liệu khỏi lịch sử Git cũ. Khi tạo commit công khai, kiểm tra cả tên/email tác giả và dùng email riêng tư của GitHub nếu cần.

## Build và phát hành

Build từ bản mã nguồn sạch. Windows chạy `npm run package:win`; trên Mac chạy `npm run package:mac` để tạo hai bản DMG cho Intel và Apple Silicon. Kết quả nằm trong `release/`. Không gửi các file exe cũ hoặc thư mục dữ liệu bên cạnh app.

Workflow **Build desktop downloads** chạy thủ công trong GitHub Actions, kiểm tra và build trên Windows/macOS. Kết quả được lưu thành artifacts; workflow không tự tạo hoặc xuất bản Releases. Tải artifacts, thử app trên từng hệ điều hành, rồi đính kèm `.exe` và `.dmg` vào một Release. Bản Mac cần kiểm tra mở app, tạo/lưu CV và xuất PDF trên máy Mac thật trước khi công bố hỗ trợ.
