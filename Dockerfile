FROM daocloud.io/node:latest
RUN mkdir -p /data/www
WORKDIR /data/www
COPY . .
RUN npm install --registry=https://registry.npm.taobao.org --verbose
EXPOSE 8093
CMD ["node", "app"]
