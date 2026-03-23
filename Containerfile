FROM nginx:1.29-alpine

COPY nginx/default.conf /etc/nginx/conf.d/default.conf
COPY out/ /usr/share/nginx/html/

EXPOSE 80
