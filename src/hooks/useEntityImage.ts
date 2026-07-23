import { useState, useEffect } from 'react';
import { fetchEntityInfo, type EntityKind } from '@/lib/wikiService';

/**
 * 懒加载实体配图（列表卡片缩略图用）
 * 仅在组件挂载时触发一次请求，失败不重试
 */
export function useEntityImage(name: string, kind: EntityKind): string | undefined {
  const [image, setImage] = useState<string | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    fetchEntityInfo(name, kind).then((info) => {
      if (!cancelled && info.image) {
        setImage(info.image);
      }
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [name, kind]);

  return image;
}