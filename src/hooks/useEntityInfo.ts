/**
 * 联网获取水果/药物配图与介绍
 *
 * 使用场景：详情抽屉打开时，若该条目没有静态配图/介绍，
 * 自动通过维基百科联网获取真实配图和介绍文本。
 *
 * 自定义水果/药物添加后无需手动填写，详情页会自动联网补全。
 *
 * @param name 条目名称
 * @param staticImage 已有的静态配图（优先使用）
 * @param staticDescription 已有的静态介绍（优先使用）
 */

import { useState, useEffect } from 'react';
import { fetchEntityInfo } from '@/lib/wikiService';

export interface EntityInfoState {
  /** 最终使用的配图 URL（静态优先，否则联网获取） */
  image: string | undefined;
  /** 最终使用的介绍（静态优先，否则联网获取） */
  description: string | undefined;
  /** 是否正在联网获取中 */
  loading: boolean;
}

export function useEntityInfo(
  name: string,
  staticImage?: string,
  staticDescription?: string
): EntityInfoState {
  const [fetchedImage, setFetchedImage] = useState<string | undefined>(undefined);
  const [fetchedDesc, setFetchedDesc] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // 静态数据已齐全则无需联网
    if (staticImage && staticDescription) {
      setFetchedImage(undefined);
      setFetchedDesc(undefined);
      setLoading(false);
      return;
    }
    if (!name) {
      setFetchedImage(undefined);
      setFetchedDesc(undefined);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    fetchEntityInfo(name).then((info) => {
      if (cancelled) return;
      setFetchedImage(info.image);
      setFetchedDesc(info.description);
      setLoading(false);
    }).catch(() => {
      if (cancelled) return;
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [name, staticImage, staticDescription]);

  return {
    image: staticImage || fetchedImage,
    description: staticDescription || fetchedDesc,
    loading,
  };
}
