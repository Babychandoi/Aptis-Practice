# ---------------------------------------------------------------------
# Stage 1: build
# ---------------------------------------------------------------------
FROM node:22-alpine AS build

WORKDIR /build

# package*.json trước để tầng npm ci được cache riêng
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY . .

# Build gọi API qua đường tương đối; nginx trong stage sau proxy /api sang backend.
# Nhờ vậy image dùng được ở mọi môi trường không cần build lại.
ENV VITE_API_BASE_URL=/api/v1
RUN npm run build

# ---------------------------------------------------------------------
# Stage 2: nginx
# ---------------------------------------------------------------------
FROM nginx:1.27-alpine

COPY --from=build /build/dist /usr/share/nginx/html

# Đặt trong templates/ để entrypoint của image nginx thay biến môi trường rồi
# ghi ra conf.d/default.conf lúc khởi động — nhờ đó một image dùng được cho cả
# production lẫn dev, chỉ khác giá trị biến.
COPY nginx.conf /etc/nginx/templates/default.conf.template

# Production không chặn lập chỉ mục; bản dev đặt NGINX_ROBOTS_TAG=noindex, nofollow.
ENV NGINX_ROBOTS_TAG=""

# Chỉ cho envsubst thay đúng biến này. Không giới hạn thì nó nuốt luôn $host,
# $scheme, $uri… của nginx và file cấu hình hỏng hoàn toàn.
ENV NGINX_ENVSUBST_FILTER="NGINX_ROBOTS_TAG"

EXPOSE 80

# Dùng 127.0.0.1 chứ không localhost: nginx chỉ bind IPv4 (0.0.0.0:80) nhưng
# localhost trong container resolve sang ::1 trước, khiến healthcheck bị
# "Connection refused" dù server hoạt động bình thường.
HEALTHCHECK --interval=15s --timeout=3s --start-period=10s --retries=3 \
    CMD wget -qO- http://127.0.0.1/healthz || exit 1
