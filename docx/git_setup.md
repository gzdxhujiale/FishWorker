# Git 初始化与远程仓库连接指南

本项目已成功连接到 GitHub 仓库并完成初始化。以下是执行的完整命令及说明：

## 1. 初始化本地仓库
在项目根目录下初始化 Git 仓库：
```bash
git init
```

## 2. 检查与配置 `.gitignore`
确保临时文件、依赖包（如 `node_modules`、编译产物等）不被 Git 追踪。

## 3. 添加文件并进行首次提交
将项目文件添加到暂存区并提交到本地：
```bash
git add .
git commit -m "Initial commit"
```

## 4. 统一主分支名称
将默认分支名称重命名为 `main`：
```bash
git branch -M main
```

## 5. 连接远程 GitHub 仓库
关联远程 GitHub 仓库地址：
```bash
git remote add origin https://github.com/gzdxhujiale/FishWorker.git
```

## 6. 推送至远程仓库
将本地的 `main` 分支推送到 GitHub 远程仓库，并建立分支追踪关系：
```bash
git push -u origin main
```

---

## 常用后续命令参考

* **查看当前仓库状态**：
  ```bash
  git status
  ```
* **提交新更改**：
  ```bash
  git add .
  git commit -m "你的提交信息"
  ```
* **推送到远程仓库**：
  ```bash
  git push
  ```
* **拉取远程最新更改**：
  ```bash
  git pull
  ```
