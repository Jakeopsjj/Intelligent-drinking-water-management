#!/usr/bin/env bash
# ============================================================
# [流程校验铁律] 严禁违反，违反必导致需求修改失效
# ============================================================
# 背景：此前多次需求修改"未生效"，根因均为以下三步之一被遗漏：
#   1. 代码未保存到磁盘（编辑器缓冲未落盘 / Write 工具未执行）
#   2. 代码已保存但未 git commit（改动停留在工作区，重启即丢）
#   3. 代码已 commit 但未 git push 到 GitHub 远程（本地分支领先远程）
#
# 本脚本强制校验上述三步，任一步骤失败即退出非 0 并打印醒目错误。
# 用法：
#   bash scripts/verify-sync.sh              # 纯校验（CI/收尾前必跑）
#   bash scripts/verify-sync.sh --auto-fix   # 校验失败时自动 add+commit+push
#   bash scripts/verify-sync.sh --files <f1> <f2> ...  # 额外校验指定文件已在最新 commit 中
# ============================================================
set -uo pipefail

PROJECT_ROOT="${PROJECT_ROOT:-/workspace}"
cd "$PROJECT_ROOT" || { echo "❌ 无法进入项目目录 $PROJECT_ROOT"; exit 1; }

AUTO_FIX=0
CHECK_FILES=()

while [[ $# -gt 0 ]]; do
  case "$1" in
    --auto-fix) AUTO_FIX=1; shift ;;
    --files) shift; while [[ $# -gt 0 && "$1" != --* ]]; do CHECK_FILES+=("$1"); shift; done ;;
    -h|--help)
      echo "用法: bash scripts/verify-sync.sh [--auto-fix] [--files <f1> <f2> ...]"
      exit 0 ;;
    *) echo "未知参数: $1"; exit 2 ;;
  esac
done

# 颜色输出
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'
ok()   { echo -e "${GREEN}[✓]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
err()  { echo -e "${RED}[✗]${NC} $1"; }
info() { echo -e "${CYAN}[i]${NC} $1"; }

FAIL=0

echo -e "${CYAN}========================================${NC}"
echo -e "${CYAN} 肾友笔记 - 流程同步校验${NC}"
echo -e "${CYAN}========================================${NC}"

# ---------- 步骤 0：确认 git 仓库 ----------
if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  err "当前目录不是 git 仓库，无法校验"
  exit 1
fi
REMOTE_URL="$(git config --get remote.origin.url 2>/dev/null || echo '')"
if [[ -z "$REMOTE_URL" ]]; then
  err "未配置 remote.origin.url，无法推送到 GitHub"
  exit 1
fi
info "远程仓库：$REMOTE_URL"
info "当前分支：$(git rev-parse --abbrev-ref HEAD)"

# ---------- 步骤 1：本地保存 + commit 校验（工作区必须干净）----------
echo ""
info "【步骤 1/3】校验代码已保存并提交（工作区是否干净）…"
PORCELAIN="$(git status --porcelain 2>/dev/null)"
if [[ -n "$PORCELAIN" ]]; then
  err "工作区存在未提交的改动（代码可能已保存但未 commit）："
  echo "$PORCELAIN" | sed 's/^/    /'
  if [[ "$AUTO_FIX" -eq 1 ]]; then
    warn "--auto-fix 模式：尝试自动 add + commit …"
    git add -A
    # 生成提交信息：基于改动文件清单
    MSG="chore: auto-sync 未提交改动 ($(date +%Y-%m-%d_%H:%M) by verify-sync.sh)"
    if ! git commit -m "$MSG" >/dev/null 2>&1; then
      err "自动 commit 失败（可能无实际改动或 hook 拒绝）"
      FAIL=1
    else
      ok "已自动 commit：$MSG"
    fi
  else
    FAIL=1
  fi
else
  ok "工作区干净，所有改动已保存并提交"
fi

# ---------- 步骤 2：HEAD 有效性 + 文件清单校验 ----------
echo ""
info "【步骤 2/3】校验 HEAD commit 有效性 …"
HEAD_SHA="$(git rev-parse HEAD 2>/dev/null || echo '')"
if [[ -z "$HEAD_SHA" ]]; then
  err "HEAD 不存在（仓库尚无任何 commit）"
  exit 1
fi
ok "当前 HEAD：${HEAD_SHA:0:12}"

if [[ ${#CHECK_FILES[@]} -gt 0 ]]; then
  info "校验指定文件已纳入最新 commit："
  for f in "${CHECK_FILES[@]}"; do
    if git cat-file -e "HEAD:$f" 2>/dev/null; then
      ok "  $f  已在 HEAD 中"
    else
      err "  $f  未在 HEAD 中（可能未保存或未 git add）"
      FAIL=1
    fi
  done
fi

# ---------- 步骤 3：GitHub 推送校验 ----------
echo ""
info "【步骤 3/3】校验已推送到 GitHub 远程 …"
BRANCH="$(git rev-parse --abbrev-ref HEAD)"
LOCAL_HEAD="$(git rev-parse HEAD)"

# 优先用 @{u} 解析本地已记录的远程跟踪引用（普通仓库 fast path）
REMOTE_HEAD="$(git rev-parse '@{u}' 2>/dev/null || echo '')"
USED_LSREMOTE=0

# 兜底：@{u} 无法解析时（如 remote.origin.fetch refspec 仅跟踪 main、
# 或当前为未建立 remote-tracking ref 的 feature 分支），直接用
# git ls-remote 查询远程真实 HEAD，不依赖本地 refspec 配置。
if [[ -z "$REMOTE_HEAD" ]]; then
  info "本地未建立 remote-tracking ref，直接查询远程 ${BRANCH} 分支 HEAD …"
  REMOTE_HEAD="$(git ls-remote origin "refs/heads/${BRANCH}" 2>/dev/null | awk '{print $1}')"
  USED_LSREMOTE=1
fi

if [[ -z "$REMOTE_HEAD" ]]; then
  # 远程完全没有该分支 → 需要 push
  err "远程未找到分支 origin/${BRANCH}（从未 push 过）"
  if [[ "$AUTO_FIX" -eq 1 ]]; then
    warn "--auto-fix 模式：尝试 git push -u origin ${BRANCH} …"
    if git push -u origin "$BRANCH" >/dev/null 2>&1; then
      ok "已成功推送分支 ${BRANCH} 到 GitHub"
    else
      err "push 失败，请检查网络或远程权限"
      FAIL=1
    fi
  else
    FAIL=1
  fi
elif [[ "$LOCAL_HEAD" == "$REMOTE_HEAD" ]]; then
  ok "本地 HEAD 与远程一致，已成功推送"
  [[ "$USED_LSREMOTE" -eq 1 ]] && ok "（通过 git ls-remote 实时校验，不依赖本地 refspec）"
else
  # 本地与远程不一致：判断领先/落后
  if [[ "$USED_LSREMOTE" -eq 0 ]]; then
    AHEAD="$(git rev-list --count '@{u}..HEAD' 2>/dev/null || echo 0)"
    BEHIND="$(git rev-list --count 'HEAD..@{u}' 2>/dev/null || echo 0)"
  else
    # ls-remote 模式下无法用 rev-list 算 ahead/behind，用 SHA 比对推断
    if git merge-base --is-ancestor "$REMOTE_HEAD" "$LOCAL_HEAD" 2>/dev/null; then
      AHEAD="$(git rev-list --count "${REMOTE_HEAD}..HEAD" 2>/dev/null || echo '?')"; BEHIND=0
    else
      AHEAD=0; BEHIND=1
    fi
  fi
  if [[ "$AHEAD" != "0" && "$AHEAD" != "?" ]]; then
    err "本地领先远程 ${AHEAD} 个 commit，尚未 push 到 GitHub"
    if [[ "$AUTO_FIX" -eq 1 ]]; then
      warn "--auto-fix 模式：尝试 git push …"
      if git push -u origin "$BRANCH" >/dev/null 2>&1; then
        ok "已成功 push ${AHEAD} 个 commit"
      else
        err "push 失败，请检查网络或远程权限"
        FAIL=1
      fi
    else
      FAIL=1
    fi
  elif [[ "$BEHIND" -gt 0 ]]; then
    warn "本地落后远程 ${BEHIND} 个 commit（远程有新提交，建议 git pull）"
  else
    err "本地与远程 HEAD 不一致且无法判定领先/落后关系，请手动检查"
    info "本地: ${LOCAL_HEAD:0:12}  远程: ${REMOTE_HEAD:0:12}"
    FAIL=1
  fi
fi

# ---------- 汇总 ----------
echo ""
echo -e "${CYAN}========================================${NC}"
if [[ "$FAIL" -eq 0 ]]; then
  echo -e "${GREEN}✅ 流程校验通过：本地保存 ✓ / commit ✓ / GitHub 推送 ✓${NC}"
  exit 0
else
  echo -e "${RED}❌ 流程校验失败：上述 ✗ 项必须修复，否则需求修改将无法归档生效${NC}"
  echo -e "${YELLOW}   修复方式：bash scripts/verify-sync.sh --auto-fix${NC}"
  echo -e "${YELLOW}   或手动：git add -A && git commit -m '...' && git push${NC}"
  exit 1
fi
