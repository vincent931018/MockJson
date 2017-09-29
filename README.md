# MockJson
模拟Json数据

启动服务方法：node app;

## Docker部署
## 构建

测试环境构建
```
docker build -t lazy/mock-service .
```

### 运行

```
docker run -d --name lazy/mock-service -p 8093:8093 lazy/mock-service