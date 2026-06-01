# Cuong Design - Web App Phân Tích Forecast & Booking Resort

**Cuong Design** là một ứng dụng web cao cấp, tối ưu hóa dành cho vận hành nội bộ khách sạn/resort. Hệ thống tự động hóa toàn bộ quy trình đọc dữ liệu dự báo phòng bán hàng ngày (Forecast Grid), truy vết các hyperlink booking confirmation dạng Google Sheets, phân tích (parse) chi tiết Voucher, hạch toán doanh thu, lên lịch F&B (suất ăn), rà soát cảnh báo chất lượng dữ liệu (QA) và xuất báo cáo đa phân hệ.

---

## 🛠️ Công Nghệ Sử Dụng

- **Frontend**: Next.js 15+ App Router, React 19+, TypeScript, Tailwind CSS, Lucide Icons, Recharts.
- **Backend & Database**: Next.js Route Handlers, Node.js 20+, PostgreSQL, Prisma ORM, Redis (dành cho job cache).
- **Phân Tích File & Xuất Bản**: `exceljs` để đọc/ghi Excel, `axios` để xử lý download.

---

## 📂 Cấu Trúc Thư Mục Chính

- `scripts/`
  - [generate-sample-data.ts](file:///d:/Resort/scripts/generate-sample-data.ts): Khởi tạo file forecast `CPR_DAILY_FORECAST_2026.xlsx` và các file confirmation Excel mẫu trong folder mock.
  - [test-parser.ts](file:///d:/Resort/scripts/test-parser.ts): Chạy kiểm thử offline bộ phân tích (vouchers, dining, dates, payments).
  - [test-db.ts](file:///d:/Resort/scripts/test-db.ts): Kiểm tra kết nối database và khởi tạo user admin mặc định.
- `mock_google_drive/`: Lưu trữ các file Excel booking confirmation mẫu mô phỏng Google Sheets.
- `src/`
  - `lib/parser/`
    - [forecast-parser.ts](file:///d:/Resort/src/lib/parser/forecast-parser.ts): Phân tích grid phòng ngày của forecast, trích xuất text & hyperlink.
    - [booking-downloader.ts](file:///d:/Resort/src/lib/parser/booking-downloader.ts): Download sheet online hoặc tự động fallback mock offline.
    - [booking-parser.ts](file:///d:/Resort/src/lib/parser/booking-parser.ts): Parser chi tiết Voucher phòng, suất ăn, dịch vụ và thanh toán.
    - [meal-analyzer.ts](file:///d:/Resort/src/lib/parser/meal-analyzer.ts): Xử lý map ngày tương đối, chuyển đổi mâm sang suất (Vietnamese rules).
  - `lib/services/`
    - [stats-aggregator.ts](file:///d:/Resort/src/lib/services/stats-aggregator.ts): Hạch toán tổng hợp lưu trú, suất ăn và doanh thu từng ngày.
    - [exporter.ts](file:///d:/Resort/src/lib/services/exporter.ts): Bộ xuất dữ liệu đa sheet Excel (Summary, Daily, Bookings, Meals, v.v.).
  - `app/`
    - `api/imports/`: API nhận upload file, chạy pipeline phân tích.
    - `api/reports/excel/`: API phục vụ tải báo cáo đa phân hệ Excel.
    - `api/query/`: Local AI Assistant phân tích ngôn ngữ tự nhiên từ DB.
    - `page.tsx` (Dashboard): KPI cards, Recharts biến động và AI Assistant.
    - `imports/`: Giao diện upload, connect drive và xem lịch sử.
    - `forecast/`: Calendar Grid sơ đồ lấp đầy phòng dạng PMS cao cấp.
    - `bookings/`: Danh sách booking table kèm slide-over drawer chi tiết.
    - `reports/`: Phân hệ báo cáo chi tiết Check-in/out, Báo suất ăn, Doanh thu, Hủy phòng, DQ Quality.

---

## 🚀 Hướng Dẫn Cài Đặt & Chạy Local

### 1. Khởi Động Infrastructure (Docker Compose)
Để chạy PostgreSQL và Redis cục bộ một cách dễ dàng, bạn hãy bật Docker và chạy lệnh:
```bash
docker compose up -d
```
Lệnh này sẽ khởi chạy Postgres trên cổng `5432` và Redis trên cổng `6379` theo mô tả trong [docker-compose.yml](file:///d:/Resort/docker-compose.yml).

### 2. Thiết Lập Môi Trường (Environments)
File `.env` đã được tự động sao chép từ [.env.example](file:///d:/Resort/.env.example) và cấu hình sẵn kết nối Database cùng chế độ chạy offline demo (`DEMO_MODE="true"`).

### 3. Tạo Schema & Migration (Prisma Push)
Sau khi PostgreSQL đã khởi động thành công, đẩy cấu trúc bảng vào database bằng Prisma:
```bash
npx prisma db push
```

### 4. Tạo Dữ Liệu Thử Nghiệm (Sample Data)
Khởi tạo file forecast `CPR_DAILY_FORECAST_2026.xlsx` và các voucher booking confirmation mẫu:
```bash
npx tsx scripts/generate-sample-data.ts
```

### 5. Chạy Kiểm Thử Bộ Phân Tích
Bạn có thể chạy thử trực tiếp bộ parser để kiểm tra tính chính xác của việc đọc ngày ăn ("ngày checkin", "ngày checkout"), quy tắc chuyển đổi mâm, tính toán cọc và tiền lệch:
```bash
npx tsx scripts/test-parser.ts
```

Bạn cũng có thể chạy lệnh sau để kiểm tra kết nối database và khởi tạo tài khoản admin:
```bash
npx tsx scripts/test-db.ts
```

### 6. Chạy Ứng Dụng Web Next.js
Khởi động development server:
```bash
npm run dev
```
Bây giờ, bạn hãy truy cập địa chỉ **[http://localhost:3000](http://localhost:3000)** trên trình duyệt.

---

## 🎯 Các Quy Tắc Nghiệp Vụ Quan Trọng Đã Áp Dụng

1. **Layout-Tolerant Parsing**: Bộ parser quét toàn bộ các ô trong Voucher, khớp nhãn (check-in, check-out, cọc, sale, kênh) không phân biệt hoa thường hay dấu tiếng Việt.
2. **Dining Date Resolution**:
   - `31/05` hoặc `31.5` -> map chính xác ngày.
   - `ngày checkin` -> map ngày check-in của booking.
   - `ngày checkout` -> map ngày check-out của booking.
   - Combo không ghi ngày -> tự động phân bổ hợp lý theo logic check-in (Trưa/Tối check-in, Sáng check-out).
3. **Mâm sang Suất**:
   - Nhận diện đơn vị `Mâm` -> Nhân số lượng với `6` để ra số suất ăn thực tế (F&B Pax), lưu trữ song song cả số mâm và số suất.
4. **Daily Room Revenue Split**:
   - Doanh thu phòng của booking được phân bổ đều ra từng đêm lưu trú (tính từ ngày check-in đến trước ngày check-out), giúp biểu đồ doanh thu hằng ngày phản ánh chính xác công suất và ADR thực tế.
5. **Quality Assurance flags**:
   - Booking có tổng tiền bill chi tiết lệch tiền voucher -> Cảnh báo.
   - Booking bị gán đè trùng phòng trong forecast -> Cảnh báo trùng phòng.
   - Ô forecast có chữ nhưng thiếu hyperlink -> Cảnh báo QA thiếu link.
