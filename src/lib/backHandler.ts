// 浮层返回处理器管理
// 维护一个"当前打开的浮层关闭函数"栈，用于响应 Android 硬件返回 / 侧滑手势
// 当返回事件触发时：先关闭最上层浮层，否则由路由层处理（回首页或退出应用）

const overlayClosers: Array<() => void> = [];

// 注册一个浮层的关闭函数，返回注销函数
export function registerOverlayCloser(closer: () => void): () => void {
  overlayClosers.push(closer);
  return () => {
    const idx = overlayClosers.indexOf(closer);
    if (idx >= 0) overlayClosers.splice(idx, 1);
  };
}

// 关闭最上层浮层，返回是否有关闭了浮层
export function closeTopOverlay(): boolean {
  const closer = overlayClosers[overlayClosers.length - 1];
  if (closer) {
    closer();
    return true;
  }
  return false;
}
