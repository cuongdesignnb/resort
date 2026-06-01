# Hướng dẫn Deploy Resort Web App lên aaPanel sử dụng Docker

Tài liệu này hướng dẫn chi tiết quy trình deploy ứng dụng web Resort lên máy chủ chạy **aaPanel** bằng **Docker & Docker Compose**, sử dụng tên miền **kd.cuongdesign.net**.

---

## 1. Chuẩn bị trên aaPanel
Trước khi cài đặt, hãy đảm bảo máy chủ đã cài đặt các thành phần sau qua App Store của aaPanel hoặc dòng lệnh:
1. **Docker / Docker Manager**: Cài đặt ứng dụng Docker từ App Store của aaPanel.
2. **Nginx**: Web server dùng để làm Reverse Proxy và cấu hình SSL.
3. Trỏ tên miền `kd.cuongdesign.net` về địa chỉ IP của máy chủ aaPanel.

---

## 2. Các bước triển khai chi tiết

### Bước 1: Clone mã nguồn trực tiếp vào thư mục root của website
Kết nối SSH vào máy chủ aaPanel và chạy các lệnh sau để clone mã nguồn từ GitHub trực tiếp vào thư mục root của website (ví dụ thư mục `kd.cuongdesign.net` do aaPanel tạo ra):

```bash
# Di chuyển đến thư mục website
cd /www/wwwroot/kd.cuongdesign.net

# Xóa các file mặc định của aaPanel (như index.html, 404.html, .htaccess...) để thư mục trống hoàn toàn
rm -rf * .htaccess

# Clone repository từ GitHub trực tiếp vào thư mục hiện tại (lưu ý có dấu chấm . ở cuối)
git clone https://github.com/cuongdesignnb/resort.git .
```

### Bước 2: Cấu hình biến môi trường (`.env`)
Tạo file `.env` bằng cách copy từ file `.env.example` và thiết lập các cấu hình cần thiết:

```bash
cp .env.example .env
```

Bạn có thể chỉnh sửa file `.env` trực tiếp trên aaPanel File Manager hoặc bằng lệnh `nano .env` / `vi .env`. Đảm bảo các cấu hình cơ bản sau:
- `DATABASE_URL`: Đường dẫn kết nối Postgres. Nếu chạy bằng docker-compose mặc định, nó sẽ kết nối trực tiếp với service `postgres` trong docker.
- `DEMO_MODE=true` (hoặc `false` nếu muốn dùng dữ liệu thực tế).
- Thêm các biến môi trường khác cho AI Assistant hoặc Google Sheets Sync nếu có.

### Bước 3: Khởi chạy Docker Compose
Bên trong thư mục website (`/www/wwwroot/kd.cuongdesign.net`), hãy build và khởi chạy các container bằng lệnh sau:

```bash
docker compose up -d --build
```

Lệnh này sẽ thực hiện các việc sau:
1. Tải image PostgreSQL.
2. Build Docker image cho Next.js Web app (chạy Prisma generate, Next.js build).
3. Tự động chạy `npx prisma db push` để tạo cấu trúc bảng cơ sở dữ liệu trên Postgres.
4. Chạy ứng dụng web tại port `3099` (đã được map từ port 3000 của container ra cổng 3099 của máy chủ).

Bạn có thể kiểm tra trạng thái hoạt động của các container:
```bash
docker compose ps
```

---

## 3. Cấu hình Reverse Proxy & SSL trên aaPanel

Để người dùng có thể truy cập qua tên miền `kd.cuongdesign.net`, ta cần trỏ tên miền này vào port `3099` của Docker container thông qua Nginx Reverse Proxy.

### Bước 3.1: Tạo Website trên aaPanel
1. Vào **aaPanel** -> chọn menu **Website** -> Click **Add site**.
2. Nhập Domain: `kd.cuongdesign.net`.
3. Mục **PHP version**: Chọn **Static** (vì website chạy trên Docker Node.js chứ không dùng PHP).
4. Các mục khác giữ nguyên mặc định và nhấn **Submit**.

### Bước 3.2: Cài đặt chứng chỉ SSL
1. Trong danh sách Website, click vào tên miền `kd.cuongdesign.net` hoặc nút **Conf** bên cạnh nó.
2. Chọn menu **SSL** ở thanh bên trái.
3. Chọn tab **Let's Encrypt**, tích chọn tên miền của bạn và nhấn **Apply**.
4. Sau khi đăng ký thành công, hãy bật tính năng **Force HTTPS** ở góc trên cùng bên phải để tự động chuyển hướng mọi truy cập sang HTTPS bảo mật.

### Bước 3.3: Cấu hình Reverse Proxy
1. Vẫn trong bảng cấu hình Website đó, chọn menu **Reverse proxy** -> Click **Add reverse proxy**.
2. Thiết lập cấu hình như sau:
   - **Proxy name**: Điền `resort-web` (hoặc tên bất kỳ bạn muốn).
   - **Target URL**: Nhập `http://127.0.0.1:3099` (đây là địa chỉ Docker Web App đang lắng nghe).
   - **Sent Domain**: Điền `$host`.
3. Nhấn **Submit** để lưu lại.

---

## 4. Quản lý và Cập nhật sau này

### Cập nhật Code mới từ GitHub
Mỗi khi có cập nhật mới trên GitHub và bạn muốn deploy bản mới nhất lên server:

```bash
cd /www/wwwroot/kd.cuongdesign.net
# Pull code mới nhất
git pull origin main

# Build lại container và cập nhật database
docker compose up -d --build
```

### Xem logs của ứng dụng
Để kiểm tra logs hoặc debug lỗi (nếu có):
```bash
# Xem log của tất cả dịch vụ
docker compose logs -f

# Chỉ xem log của web app
docker compose logs -f web
```
